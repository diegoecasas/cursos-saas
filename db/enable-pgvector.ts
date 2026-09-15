// Corre una sola vez, antes de `drizzle-kit push`, para que exista el tipo
// `vector` que usa courses.mission_embedding (columna reservada, sin
// consultar todavía — ver plan).
//
// Uso: npx tsx db/enable-pgvector.ts

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está seteada");
  const sql = neon(url);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("Extensión pgvector habilitada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
