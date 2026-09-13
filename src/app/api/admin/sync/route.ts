import { forbidden, isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { syncFromSoundCloud } from "@/lib/soundcloud";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdmin())) return forbidden();

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const current = await getSettings();
  const profileUrl =
    typeof body.url === "string" && /^https?:\/\/(www\.)?soundcloud\.com\//i.test(body.url)
      ? body.url.trim()
      : current.soundcloudUrl;

  try {
    const result = await syncFromSoundCloud(profileUrl);
    return Response.json({
      ok: true,
      imported: result.imported,
      total: result.total,
      profile: {
        username: result.user.username,
        avatarUrl: result.user.avatar_url,
        followers: result.user.followers_count,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Синхронизация не удалась",
      },
      { status: 502 },
    );
  }
}
