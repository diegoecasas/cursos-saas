import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getOwnerId } from "@/lib/identity";
import { getCourse } from "@/content/courses";

export const runtime = "nodejs";

const MAX_CONTENT_LEN = 4000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Params = Promise<{ slug: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  if (!(await getCourse(slug))) {
    return Response.json({ error: "Curso no encontrado." }, { status: 404 });
  }
  const ownerId = await getOwnerId();
  const db = getDb();
  const rows = await db
    .select({
      date: schema.notes.date,
      content: schema.notes.content,
      updatedAt: schema.notes.updatedAt,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.ownerId, ownerId),
        eq(schema.notes.courseSlug, slug),
      ),
    )
    .orderBy(desc(schema.notes.date));
  return Response.json({ entries: rows });
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  if (!(await getCourse(slug))) {
    return Response.json({ error: "Curso no encontrado." }, { status: 404 });
  }

  let body: { date?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (typeof body.date !== "string" || !ISO_DATE.test(body.date)) {
    return Response.json(
      { error: "Fecha inválida (esperado YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (typeof body.content !== "string") {
    return Response.json({ error: "Contenido inválido." }, { status: 400 });
  }
  const content = body.content.slice(0, MAX_CONTENT_LEN);

  const ownerId = await getOwnerId();
  const db = getDb();

  if (!content.trim()) {
    await db
      .delete(schema.notes)
      .where(
        and(
          eq(schema.notes.ownerId, ownerId),
          eq(schema.notes.courseSlug, slug),
          eq(schema.notes.date, body.date),
        ),
      );
    return Response.json({ ok: true, deleted: true });
  }

  const now = new Date();
  await db
    .insert(schema.notes)
    .values({
      ownerId,
      courseSlug: slug,
      date: body.date,
      content,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        schema.notes.ownerId,
        schema.notes.courseSlug,
        schema.notes.date,
      ],
      set: { content, updatedAt: now },
    });

  return Response.json({ ok: true });
}
