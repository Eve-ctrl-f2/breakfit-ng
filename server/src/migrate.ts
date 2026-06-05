/**
 * Minimal, dependency-free migration runner.
 *
 * Applies every `migrations/*.sql` (sorted by filename) that hasn't been
 * recorded in `schema_migrations` yet, each inside its own transaction. Safe to
 * run on every boot — already-applied versions are skipped. Uses the same
 * `postgres` client the server already depends on (no extra tooling, no psql).
 *
 * Run: `node dist/migrate.js` (the Docker image runs this before the server).
 * In multi-replica setups (k8s), run it as a Job/initContainer rather than
 * per-replica to avoid concurrent applies.
 */
import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('migrate: DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
const dir = join(process.cwd(), 'migrations');

async function main(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const rows = await sql<{ version: string }[]>`SELECT version FROM schema_migrations`;
  const applied = new Set(rows.map((r) => r.version));

  let count = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    const text = await readFile(join(dir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    });
    console.log(`migrate: applied ${version}`);
    count += 1;
  }
  console.log(count ? `migrate: ${count} migration(s) applied` : 'migrate: up to date');
  await sql.end();
}

main().catch(async (err) => {
  console.error('migrate: failed', err);
  await sql.end({ timeout: 5 });
  process.exit(1);
});
