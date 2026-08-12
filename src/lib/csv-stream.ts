import type { Dataset, Row } from "./dataset";

/**
 * Streaming, chunked CSV/TSV reader.
 *
 * The original implementation did `await file.text()` and then
 * `text.split("\n").map(...)`, which holds the whole file as one JS string
 * *plus* an array of every line *plus* the parsed rows at the same time
 * (roughly 4-6x the file size in RAM, and a multi-second frozen tab).
 *
 * This reader pulls the file through a ReadableStream, decodes it in ~64 KB
 * chunks, emits rows as they complete and never keeps more than the current
 * chunk of raw text alive. Parsing rules (trimming, missing tokens, numeric
 * coercion) are byte-for-byte the same as the previous parser, so profiles,
 * pipelines and charts produce identical results.
 */

export interface StreamOptions {
  onProgress?: (info: { bytes: number; totalBytes: number; rows: number }) => void;
  signal?: AbortSignal;
  /** Hard ceiling on rows; protects the tab from an accidental 10 GB file. */
  maxRows?: number;
  /** Hard ceiling on total cells (rows x columns). */
  maxCells?: number;
}

export class CsvLimitError extends Error {}

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", "?"]);

const DEFAULT_MAX_ROWS = 5_000_000;
const DEFAULT_MAX_CELLS = 80_000_000;

/**
 * Interning pool: categorical columns repeat the same few hundred strings
 * millions of times. Reusing one JS string per distinct value is typically a
 * 3-5x memory saving on real-world CSVs. Capped so high-cardinality free text
 * can't turn the pool itself into the leak.
 */
function makeInterner(limit = 250_000) {
  const pool = new Map<string, string>();
  return (s: string) => {
    const hit = pool.get(s);
    if (hit !== undefined) return hit;
    if (pool.size < limit) pool.set(s, s);
    return s;
  };
}

function coerce(raw: string, intern: (s: string) => string): string | number | null {
  if (MISSING.has(raw.toLowerCase())) return null;
  const num = Number(raw);
  if (raw !== "" && !Number.isNaN(num)) return num;
  return intern(raw);
}

/** Parse a File/Blob of delimited text into a Dataset without buffering it whole. */
export async function parseDelimitedStream(
  file: File,
  name: string,
  opts: StreamOptions = {},
): Promise<Dataset> {
  const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
  const maxCells = opts.maxCells ?? DEFAULT_MAX_CELLS;
  const delimiter = /\.tsv$/i.test(file.name) ? "\t" : ",";
  const intern = makeInterner();

  let columns: string[] | null = null;
  const rows: Row[] = [];

  // Tokeniser state carried across chunk boundaries.
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let quoteJustClosed = false;
  let sawAnyChar = false;
  let bytes = 0;
  let lastReport = 0;

  const finishField = () => {
    record.push(field.trim());
    field = "";
  };

  const finishRecord = () => {
    finishField();
    const isBlank = record.length === 1 && record[0] === "";
    if (isBlank) {
      record = [];
      return;
    }
    if (!columns) {
      columns = record.map((c, i) => intern(c || `column_${i + 1}`));
      record = [];
      return;
    }
    const cols = columns;
    const row: Row = {};
    for (let i = 0; i < cols.length; i++) row[cols[i]] = coerce(record[i] ?? "", intern);
    rows.push(row);
    record = [];
    if (rows.length > maxRows)
      throw new CsvLimitError(
        `This file has more than ${maxRows.toLocaleString()} rows, which is beyond what the in-browser engine can hold. Try a smaller extract.`,
      );
    if (rows.length * cols.length > maxCells)
      throw new CsvLimitError(
        "This file is too large to process in the browser (too many cells). Try fewer columns or a smaller extract.",
      );
  };

  const consume = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      sawAnyChar = true;
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
            quoteJustClosed = true;
          }
        } else field += ch;
        continue;
      }
      if (ch === '"' && !quoteJustClosed) {
        inQuotes = true;
        continue;
      }
      quoteJustClosed = false;
      if (ch === delimiter) finishField();
      else if (ch === "\n") finishRecord();
      else if (ch === "\r") continue;
      else field += ch;
    }
  };

  const decoder = new TextDecoder("utf-8");
  const reader = file.stream().getReader();
  try {
    for (;;) {
      if (opts.signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      consume(decoder.decode(value, { stream: true }));
      if (bytes - lastReport > 2_000_000) {
        lastReport = bytes;
        opts.onProgress?.({ bytes, totalBytes: file.size, rows: rows.length });
        // Hand the main thread back so the UI can paint progress.
        await new Promise<void>((r) => setTimeout(r, 0));
      }
    }
    consume(decoder.decode());
  } finally {
    // Release the underlying file handle even on error/cancel.
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (field !== "" || record.length || (sawAnyChar && !columns)) finishRecord();
  opts.onProgress?.({ bytes, totalBytes: file.size, rows: rows.length });

  return { name, columns: columns ?? [], rows };
}
