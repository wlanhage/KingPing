import { existsSync, readFileSync } from "node:fs";

function loadEnv(path = ".env") {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || match[1].startsWith("#") || process.env[match[1]] !== undefined) {
      continue;
    }

    const value = match[2] ?? "";
    process.env[match[1]] = value.replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnv();

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("Set DIRECT_URL or DATABASE_URL in .env before running Prisma.");
}

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
};
