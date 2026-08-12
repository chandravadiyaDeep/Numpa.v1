import { parseCsv, type Dataset, type Row } from "./dataset";

export type SourceFormat = "csv" | "xlsx" | "json";

export class ParseError extends Error {}

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", "?"]);

function coerce(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (MISSING.has(s.toLowerCase())) return null;
  const n = Number(s);
  return s !== "" && !Number.isNaN(n) ? n : s;
}

/** Normalise an array of plain objects into the single internal Dataset shape. */
export function fromRecords(records: Record<string, unknown>[], name: string): Dataset {
  const columns: string[] = [];
  records.forEach((rec) =>
    Object.keys(rec ?? {}).forEach((k) => {
      if (!columns.includes(k)) columns.push(k);
    }),
  );
  const rows: Row[] = records.map((rec) => {
    const row: Row = {};
    columns.forEach((c) => (row[c] = coerce((rec as Record<string, unknown>)?.[c])));
    return row;
  });
  return { name, columns, rows };
}

export function detectFormat(fileName: string): SourceFormat | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt" || ext === "tsv") return "csv";
  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") return "xlsx";
  if (ext === "json") return "json";
  return null;
}

function parseJsonText(text: string, name: string): Dataset {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ParseError("That JSON file is malformed and could not be parsed.");
  }
  let records: Record<string, unknown>[] | null = null;
  if (Array.isArray(data)) records = data as Record<string, unknown>[];
  else if (data && typeof data === "object") {
    const arrayProp = Object.values(data as Record<string, unknown>).find((v) => Array.isArray(v));
    if (Array.isArray(arrayProp)) records = arrayProp as Record<string, unknown>[];
    else records = [data as Record<string, unknown>];
  }
  if (!records || !records.length) throw new ParseError("No records found in that JSON file.");
  if (records.some((r) => typeof r !== "object" || r === null))
    throw new ParseError("JSON must contain an array of objects (rows).");
  return fromRecords(records, name);
}

async function parseWorkbook(buffer: ArrayBuffer, name: string): Promise<Dataset> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new ParseError("That workbook has no sheets.");
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: null,
    raw: true,
  });
  if (!records.length) throw new ParseError("The first sheet of that workbook is empty.");
  return fromRecords(records, name);
}

export interface ParseProgress {
  /** 0-1 where known, otherwise undefined for formats that can't stream. */
  ratio?: number;
  rows: number;
  phase: "reading" | "parsing" | "done";
}

export interface ParseOptions {
  onProgress?: (p: ParseProgress) => void;
  signal?: AbortSignal;
}

/**
 * Per-format size ceilings. CSV/TSV stream row-by-row so it can go far higher
 * than the buffered formats, which must be fully materialised by their
 * decoders before any row exists.
 */
const MAX_BYTES: Record<SourceFormat, number> = {
  csv: 400 * 1024 * 1024,
  xlsx: 60 * 1024 * 1024,
  json: 80 * 1024 * 1024,
};

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** File → validate → detect → parse → normalise → Dataset. Throws ParseError with a readable message. */
export async function parseFile(file: File, opts: ParseOptions = {}): Promise<Dataset> {
  if (!file.size) throw new ParseError("That file is empty.");

  const format = detectFormat(file.name);
  if (!format)
    throw new ParseError("Unsupported file type. Upload a CSV, XLSX/XLS or JSON file.");

  if (file.size > MAX_BYTES[format])
    throw new ParseError(
      format === "csv"
        ? `File is larger than ${mb(MAX_BYTES.csv)} — try a smaller extract.`
        : `${format.toUpperCase()} files are read whole and are capped at ${mb(
            MAX_BYTES[format],
          )}. Convert to CSV for larger datasets.`,
    );

  let ds: Dataset;
  try {
    if (format === "csv") {
      // Streamed: constant memory, cancellable, reports progress.
      const { parseDelimitedStream, CsvLimitError } = await import("./csv-stream");
      try {
        ds = await parseDelimitedStream(file, file.name, {
          signal: opts.signal,
          onProgress: ({ bytes, totalBytes, rows }) =>
            opts.onProgress?.({
              ratio: totalBytes ? bytes / totalBytes : undefined,
              rows,
              phase: "reading",
            }),
        });
      } catch (e) {
        if (e instanceof CsvLimitError) throw new ParseError(e.message);
        throw e;
      }
    } else if (format === "xlsx") {
      opts.onProgress?.({ rows: 0, phase: "reading" });
      const buffer = await file.arrayBuffer();
      opts.onProgress?.({ rows: 0, phase: "parsing" });
      ds = await parseWorkbook(buffer, file.name);
    } else {
      opts.onProgress?.({ rows: 0, phase: "reading" });
      const text = await file.text();
      if (!text.trim()) throw new ParseError("That file is empty.");
      opts.onProgress?.({ rows: 0, phase: "parsing" });
      ds = parseJsonText(text, file.name);
    }
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    if (e instanceof RangeError)
      throw new ParseError(
        "This dataset is too large for the browser to hold in memory. Try a smaller extract or fewer columns.",
      );
    throw new ParseError("That file could not be read.");
  }

  if (!ds.columns.length || !ds.rows.length)
    throw new ParseError("No parsable rows were found in that file.");

  opts.onProgress?.({ ratio: 1, rows: ds.rows.length, phase: "done" });
  return ds;
}

export const ACCEPTED_EXTENSIONS = ".csv,.tsv,.xlsx,.xls,.json";
