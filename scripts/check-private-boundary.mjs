import { readdir, readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
async function files(directory) {
  const result = [];
  for (const name of await readdir(directory)) {
    const path = `${directory}/${name}`;
    if ((await stat(path)).isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result;
}
for (const path of await files("dist")) {
  if (!/\.(js|json|html)$/.test(path)) continue;
  const text = await readFile(path, "utf8");
  for (const term of [
    "Charity Auction Rate Agreement",
    "Sunday–Thursday nightly rate",
    "Not Sure What Rates to Offer?",
    "Incremental Room Revenue. Year-Round Booking Potential.",
  ])
    assert.ok(
      !text.includes(term),
      `Private content appeared in public output: ${path}`,
    );
}
assert.ok((await stat("build/private/index.html")).isFile());
console.log(
  "Private form bundle is separate; protected form and guidance strings are absent from public output.",
);
