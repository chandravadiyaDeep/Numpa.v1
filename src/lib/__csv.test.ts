import { expect, test } from "vitest";
import { parseDelimitedStream } from "@/lib/csv-stream";
import { parseCsv, profileColumn, histogram } from "@/lib/dataset";

const sample = `a,b,c
1,hello,
2,"wo,rld",N/A
3,"multi
line",7
,x,8
`;

test("streaming matches legacy parser", async () => {
  const f = new File([sample.replace('multi\nline','multiline')], "s.csv");
  const streamed = await parseDelimitedStream(f, "s.csv");
  const legacy = parseCsv(sample.replace('multi\nline','multiline'), "s.csv");
  expect(streamed.columns).toEqual(legacy.columns);
  expect(streamed.rows).toEqual(legacy.rows);
});

test("quoted newlines handled", async () => {
  const streamed = await parseDelimitedStream(new File([sample], "s.csv"), "s.csv");
  expect(streamed.rows.length).toBe(4);
  expect(streamed.rows[1].b).toBe("wo,rld");
  expect(String(streamed.rows[2].b)).toContain("multi");
  expect(streamed.rows[0].c).toBe(null);
});

test("profile + histogram stable on large numeric column", () => {
  const rows = Array.from({ length: 300000 }, (_, i) => ({ x: i % 1000, y: "cat" + (i % 5) }));
  const ds = { name: "big", columns: ["x", "y"], rows } as any;
  const p = profileColumn(ds, "x");
  expect(p.type).toBe("numeric");
  expect(Math.round(p.mean!)).toBe(500);
  expect(histogram(ds, "x").reduce((a, b) => a + b.count, 0)).toBe(300000);
});
