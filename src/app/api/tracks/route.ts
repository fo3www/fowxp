import { isAdmin } from "@/lib/auth";
import { getTracks } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await isAdmin();
    const rows = await getTracks(admin);
    return Response.json({ ok: true, tracks: rows, admin });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Ошибка" },
      { status: 500 },
    );
  }
}
