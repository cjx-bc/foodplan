import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { closePool, createAdminConnection, getDatabaseConfig, query, withTransaction } from "../server/db.js";

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);
}

async function readAppliedVersions() {
  const result = await query<{ version: string }>("SELECT version FROM schema_migrations");
  return new Set(result.rows.map((row) => row.version));
}

async function ensureDatabaseExists() {
  const config = getDatabaseConfig();
  const adminConnection = await createAdminConnection();

  try {
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  } finally {
    await adminConnection.end();
  }
}

async function main() {
  const migrationsDir = path.join(process.cwd(), "server", "migrations");
  await ensureDatabaseExists();
  await ensureMigrationsTable();
  const appliedVersions = await readAppliedVersions();
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    if (appliedVersions.has(file)) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES (?)", [file]);
    });
    console.log(`Applied migration ${file}`);
  }

  if (files.length === 0) {
    console.log("No migration files found.");
  } else {
    console.log("Database migrations are up to date.");
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
