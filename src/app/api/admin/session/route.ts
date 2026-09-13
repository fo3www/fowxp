import { checkPassword, endSession, isAdmin, startSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, admin: await isAdmin() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    return Response.json(
      { ok: false, error: "Неверный пароль. Доступ запрещён." },
      { status: 401 },
    );
  }

  await startSession();
  return Response.json({ ok: true, admin: true });
}

export async function DELETE() {
  await endSession();
  return Response.json({ ok: true, admin: false });
}
