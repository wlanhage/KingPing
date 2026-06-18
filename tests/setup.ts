import { existsSync, readFileSync } from 'node:fs';

// Ladda .env för testerna (prisma.ts kräver DATABASE_URL vid import).
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = (match[2] ?? '').replace(/^(['"])(.*)\1$/, '$2');
  }
}
