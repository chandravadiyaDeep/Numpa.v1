import { test } from "vitest";
import { parseDelimitedStream } from "@/lib/csv-stream";
import { profileDataset, duplicateCount } from "@/lib/dataset";

test("150MB csv", async () => {
  const header = "id,age,city,score,note\n";
  const cities = ["Mumbai","Delhi","Pune","Surat","Kochi"];
  let buf = "";
  const parts: string[] = [header];
  for (let i = 0; i < 1_500_000; i++) {
    buf += `${i},${20 + (i % 60)},${cities[i % 5]},${(i % 997) / 7},note text ${i % 50}\n`;
    if (i % 50000 === 0) { parts.push(buf); buf = ""; }
  }
  parts.push(buf);
  const blob = new Blob(parts, { type: "text/csv" });
  console.log("file MB", (blob.size / 1048576).toFixed(1));
  const f = new File([blob], "big.csv");
  let t = Date.now();
  const ds = await parseDelimitedStream(f, "big.csv");
  console.log("parse ms", Date.now() - t, "rows", ds.rows.length, "heapMB", Math.round(process.memoryUsage().heapUsed/1048576));
  t = Date.now();
  profileDataset(ds);
  console.log("profile ms", Date.now() - t, "heapMB", Math.round(process.memoryUsage().heapUsed/1048576));
  t = Date.now();
  duplicateCount(ds);
  console.log("dupes ms", Date.now() - t);
}, 600000);
