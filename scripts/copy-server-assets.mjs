import { copyFile } from 'node:fs/promises';
await copyFile('server/schema.sql', 'build/server/schema.sql');
