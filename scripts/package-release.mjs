import { execFileSync } from "node:child_process";
import { mkdir, cp, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
assert.equal(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  "",
  "Commit requested changes before packaging.",
);
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
await mkdir(resolve(".local/releases"), { recursive: true });
const release = resolve(".local/releases", commit);
await mkdir(release, { recursive: false });
for (const path of [
  "dist",
  "build/server",
  "build/private",
  "public/assets/give-holidays-logo.png",
  "package.json",
  "package-lock.json",
]) {
  const target = resolve(release, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await cp(path, target, { recursive: true });
}
await writeFile(
  resolve(release, "release.json"),
  JSON.stringify({ commit, builtAt: new Date().toISOString() }, null, 2),
);
const archive = resolve(".local/releases", `${commit}.tar.gz`);
execFileSync("tar", ["-czf", archive, "-C", release, "."], { stdio: "pipe" });
const sha256 = createHash("sha256")
  .update(await readFile(archive))
  .digest("hex");
await writeFile(`${archive}.sha256`, `${sha256}  ${commit}.tar.gz\n`);
console.log(JSON.stringify({ commit, archive, sha256 }));
