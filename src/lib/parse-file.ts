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

/** File → validate → detect → parse → normalise → Dataset. Throws ParseError with a readable message. */
export async function parseFile(file: File): Promise<Dataset> {
  if (!file.size) throw new ParseError("That file is empty.");
  if (file.size > 25 * 1024 * 1024)
    throw new ParseError("File is larger than 25 MB — try a smaller extract.");

  const format = detectFormat(file.name);
  if (!format)
    throw new ParseError("Unsupported file type. Upload a CSV, XLSX/XLS or JSON file.");

  let ds: Dataset;
  if (format === "xlsx") ds = await parseWorkbook(await file.arrayBuffer(), file.name);
  else {
    const text = await file.text();
    if (!text.trim()) throw new ParseError("That file is empty.");
    ds = format === "json" ? parseJsonText(text, file.name) : parseCsv(text, file.name);
  }

  if (!ds.columns.length || !ds.rows.length)
    throw new ParseError("No parsable rows were found in that file.");
  return ds;
}

export const ACCEPTED_EXTENSIONS = ".csv,.tsv,.xlsx,.xls,.json";
