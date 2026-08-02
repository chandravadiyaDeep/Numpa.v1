import type { Dataset } from "./dataset";
import { toCsv } from "./dataset";

export type DataFormat = "csv" | "tsv" | "json" | "xlsx";
export type ImageFormat = "png" | "jpeg";

export const DATA_FORMATS: { id: DataFormat; label: string; hint: string }[] = [
  { id: "csv", label: "CSV", hint: "Comma separated" },
  { id: "tsv", label: "TSV", hint: "Tab separated" },
  { id: "json", label: "JSON", hint: "Array of records" },
  { id: "xlsx", label: "Excel", hint: ".xlsx workbook" },
];

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baseName(ds: Dataset) {
  return ds.name.replace(/\.[^.]+$/i, "") || "dataset";
}

function toDelimited(ds: Dataset, sep: string) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return new RegExp(`["\n${sep === "\t" ? "\\t" : sep}]`).test(s)
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    ds.columns.map(esc).join(sep),
    ...ds.rows.map((r) => ds.columns.map((c) => esc(r[c])).join(sep)),
  ].join("\n");
}

/** Download the working dataset in the format the user picked. */
export async function exportDataset(ds: Dataset, format: DataFormat, prefix = "clean") {
  const name = `${prefix}_${baseName(ds)}`;
  if (format === "csv") {
    saveBlob(new Blob([toCsv(ds)], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
    return;
  }
  if (format === "tsv") {
    saveBlob(
      new Blob([toDelimited(ds, "\t")], { type: "text/tab-separated-values;charset=utf-8" }),
      `${name}.tsv`,
    );
    return;
  }
  if (format === "json") {
    saveBlob(
      new Blob([JSON.stringify(ds.rows, null, 2)], { type: "application/json" }),
      `${name}.json`,
    );
    return;
  }
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(ds.rows, { header: ds.columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Data");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveBlob(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${name}.xlsx`,
  );
}

/* ------------------------- rasterising the charts ------------------------- */

/** oklch() → rgb(); html2canvas cannot parse modern colour functions. */
function oklchToRgb(input: string): string {
  return input.replace(
    /oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi,
    (_m, lRaw: string, cRaw: string, hRaw: string, aRaw?: string) => {
      const L = lRaw.endsWith("%") ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
      const C = parseFloat(cRaw);
      const h = (parseFloat(hRaw) * Math.PI) / 180;
      const a = C * Math.cos(h);
      const b = C * Math.sin(h);

      const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

      const lin = [
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
      ];
      const [r, g, bl] = lin.map((v) => {
        const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, c)) * 255);
      });
      const alpha = aRaw ? (aRaw.endsWith("%") ? parseFloat(aRaw) / 100 : parseFloat(aRaw)) : 1;
      return alpha < 1 ? `rgba(${r}, ${g}, ${bl}, ${alpha})` : `rgb(${r}, ${g}, ${bl})`;
    },
  );
}

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
  "boxShadow",
] as const;

function inlineModernColors(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  nodes.forEach((node) => {
    const cs = window.getComputedStyle(node);
    COLOR_PROPS.forEach((prop) => {
      const value = cs[prop as unknown as number] as unknown as string | undefined;
      if (typeof value === "string" && value.includes("oklch")) {
        node.style.setProperty(
          prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
          oklchToRgb(value),
        );
      }
    });
  });
}

/** Re-declare every oklch design token as rgb so the rasteriser can parse it. */
function tokenOverrideCss(): string {
  const decls: string[] = [];
  const collect = (style: CSSStyleDeclaration) => {
    for (let i = 0; i < style.length; i++) {
      const prop = style.item(i);
      if (!prop.startsWith("--")) continue;
      const value = style.getPropertyValue(prop);
      if (value.includes("oklch")) decls.push(`${prop}:${oklchToRgb(value)} !important;`);
    }
  };
  collect(window.getComputedStyle(document.documentElement));
  collect(window.getComputedStyle(document.body));
  // Tokens declared under narrower selectors (.panel, .dark .foo, …) never show up
  // on the root computed style, so sweep the stylesheets too.
  Array.from(document.styleSheets).forEach((sheet) => {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      return; // cross-origin sheet
    }
    Array.from(rules ?? []).forEach((rule) => {
      if (rule instanceof CSSStyleRule) collect(rule.style);
    });
  });
  const unique = Array.from(new Set(decls)).join("");
  return `:root,html,body,.dark,*,*::before,*::after{${unique}}`;
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  // Swap the oklch design tokens for identical rgb values in the live document:
  // the rasteriser cannot parse modern colour functions, and the clone it takes
  // inherits whatever the page resolves at capture time.
  const patch = document.createElement("style");
  patch.textContent = tokenOverrideCss();
  document.head.appendChild(patch);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const bg = oklchToRgb(window.getComputedStyle(document.body).backgroundColor || "#0b1020");
    return await html2canvas(el, {
      backgroundColor: bg,
      scale: Math.min(window.devicePixelRatio || 1, 2) * 2,
      logging: false,
      useCORS: true,
      onclone: (doc: Document) => {
        inlineModernColors(doc.documentElement as unknown as HTMLElement);
      },
    });
  } finally {
    patch.remove();
  }
}

/** Save a rendered chart panel as a PNG/JPEG image. */
export async function exportElementImage(el: HTMLElement, name: string, format: ImageFormat = "png") {
  const canvas = await captureElement(el);
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, 0.95);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${name}.${format}`;
  a.click();
}

/** Save a rendered chart panel into a single-page landscape PDF. */
export async function exportElementPdf(el: HTMLElement, name: string, title: string, subtitle?: string) {
  const [{ jsPDF }, canvas] = await Promise.all([import("jspdf"), captureElement(el)]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 36;

  pdf.setFillColor(11, 16, 32);
  pdf.rect(0, 0, pw, ph, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(title, margin, margin + 6);
  if (subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(160, 175, 200);
    pdf.text(subtitle, margin, margin + 24);
  }

  const top = margin + (subtitle ? 40 : 22);
  const maxW = pw - margin * 2;
  const maxH = ph - top - margin;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin + (maxW - w) / 2, top, w, h);
  pdf.save(`${name}.pdf`);
}

/* --------------------------- ML readiness report -------------------------- */

export interface ReadinessPdfInput {
  datasetName: string;
  rows: number;
  columns: number;
  processed: boolean;
  target: string | null;
  score: number;
  numeric: number;
  categorical: number;
  categories: { name: string; score: number }[];
  checks: { category: string; label: string; detail: string; status: string }[];
  actions: string[];
}

/** Build a text-based, multi-page ML readiness report PDF. */
export async function exportReadinessPdf(r: ReadinessPdfInput) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const m = 48;
  let y = 0;

  const paintPage = () => {
    pdf.setFillColor(11, 16, 32);
    pdf.rect(0, 0, pw, ph, "F");
  };
  const ensure = (need: number) => {
    if (y + need > ph - m) {
      pdf.addPage();
      paintPage();
      y = m;
    }
  };
  const text = (
    value: string,
    size: number,
    color: [number, number, number],
    lead = size + 6,
    style: "normal" | "bold" = "normal",
  ) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(value, pw - m * 2) as string[];
    lines.forEach((line) => {
      ensure(lead);
      pdf.text(line, m, y);
      y += lead;
    });
  };

  const white: [number, number, number] = [255, 255, 255];
  const muted: [number, number, number] = [155, 170, 195];
  const cyan: [number, number, number] = [56, 189, 248];

  paintPage();
  y = m + 8;
  text("ML Readiness Report", 22, white, 30, "bold");
  text(`${r.datasetName} — ${r.processed ? "processed pipeline output" : "raw upload"}`, 11, muted);
  text(new Date().toLocaleString(), 9, muted, 20);

  y += 10;
  ensure(90);
  pdf.setFillColor(22, 30, 52);
  pdf.roundedRect(m, y, pw - m * 2, 76, 10, 10, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(38);
  const scoreColor: [number, number, number] =
    r.score >= 80 ? [52, 211, 153] : r.score >= 55 ? [251, 191, 36] : [248, 113, 113];
  pdf.setTextColor(...scoreColor);
  pdf.text(`${r.score}%`, m + 22, y + 50);
  pdf.setFontSize(11);
  pdf.setTextColor(...muted);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    [
      `Rows: ${r.rows.toLocaleString()}    Columns: ${r.columns}`,
      `Numeric: ${r.numeric}    Categorical: ${r.categorical}`,
      `Target column: ${r.target ?? "not selected"}`,
    ],
    m + 150,
    y + 26,
    { lineHeightFactor: 1.6 },
  );
  y += 100;

  text("Category breakdown", 14, cyan, 22, "bold");
  r.categories.forEach((c) => {
    ensure(24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...white);
    pdf.text(c.name, m, y);
    pdf.setTextColor(...muted);
    pdf.text(`${c.score}%`, pw - m, y, { align: "right" });
    pdf.setFillColor(30, 41, 68);
    pdf.roundedRect(m, y + 5, pw - m * 2, 5, 2.5, 2.5, "F");
    pdf.setFillColor(56, 189, 248);
    pdf.roundedRect(m, y + 5, ((pw - m * 2) * c.score) / 100, 5, 2.5, 2.5, "F");
    y += 26;
  });

  y += 8;
  text("Readiness checks", 14, cyan, 22, "bold");
  r.categories.forEach((cat) => {
    const items = r.checks.filter((c) => c.category === cat.name);
    if (!items.length) return;
    text(cat.name.toUpperCase(), 9, muted, 16, "bold");
    items.forEach((c) => {
      const mark = c.status === "pass" ? "[PASS]" : c.status === "warn" ? "[WARN]" : "[FAIL]";
      text(`${mark} ${c.label} — ${c.detail}`, 10, white, 15);
    });
    y += 6;
  });

  if (r.actions.length) {
    y += 6;
    text("Recommended actions", 14, cyan, 22, "bold");
    r.actions.forEach((a, i) => text(`${String(i + 1).padStart(2, "0")}. ${a}`, 10, white, 15));
  }

  pdf.save(`ml_readiness_${baseName({ name: r.datasetName } as Dataset)}.pdf`);
}
