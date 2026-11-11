import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const required = ['AGENTS.md','README.md','.gitignore','.env.example','docs/PROJECT-STATUS.md','docs/environments-and-releases.md','docs/project-governance-original.txt','.github/workflows/infrastructure.yml'];
for (const file of required) assert.ok(existsSync(file), `Missing ${file}`);
const hashes = JSON.parse(readFileSync('docs/reference/checksums.json', 'utf8').replace(/^\uFEFF/, ''));
for (const [file, expected] of Object.entries(hashes)) {
  assert.equal(createHash('sha256').update(readFileSync(`docs/reference/${file}`)).digest('hex'), expected, `Approved asset changed: ${file}`);
}
const rules = readFileSync('AGENTS.md', 'utf8');
assert.ok(rules.includes('C:\\Users\\inboxblake\\development\\CAL\\Giveholidays.com'));
assert.ok(rules.includes('https://github.com/gitbbridge/giveholidays'));
console.log('Infrastructure checks passed; both approved asset checksums match. Application tests are pending implementation.');
