import { copyFile } from 'node:fs/promises';
await copyFile('server/schema.sql', 'build/server/schema.sql');
await copyFile('server/private-schema.sql', 'build/server/private-schema.sql');
