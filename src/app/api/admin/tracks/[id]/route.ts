import { db } from "@/db";
import { tracks } from "@/db/schema";
import { forbidden, isAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return forbidden();

  const { id } = await ctx.params;
  const trackId = Number(id);
  if (!Number.isFinite(trackId)) {
    return Response.json({ ok: false, error: "Неверный id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    pinned?: unknown;
    hidden?: unknown;
    note?: unknown;
    title?: unknown;
  };

  const patch: Partial<typeof tracks.$inferInsert> = {};
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
  if (typeof body.note === "string") patch.note = body.note.slice(0, 500);
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title.trim().slice(0, 200);
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ ok: false, error: "Нечего обновлять" }, { status: 400 });
  }

  const updated = await db
    .update(tracks)
    .set(patch)
    .where(eq(tracks.id, trackId))
    .returning();

  if (updated.length === 0) {
    return Response.json({ ok: false, error: "Трек не найден" }, { status: 404 });
  }

  return Response.json({ ok: true, track: updated[0] });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return forbidden();
  const { id } = await ctx.params;
  const trackId = Number(id);
  if (!Number.isFinite(trackId)) {
    return Response.json({ ok: false, error: "Неверный id" }, { status: 400 });
  }
  await db.delete(tracks).where(eq(tracks.id, trackId));
  return Response.json({ ok: true });
}
