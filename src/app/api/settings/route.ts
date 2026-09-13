import { db } from "@/db";
import { settings, type SiteLink } from "@/db/schema";
import { forbidden, isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await getSettings();
  return Response.json({ ok: true, settings: row });
}

function str(value: unknown, fallback: string, max = 8000) {
  if (typeof value !== "string") return fallback;
  return value.slice(0, max);
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return "";
  return trimmed.slice(0, 2000);
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return forbidden();

  const current = await getSettings();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const rawLinks = Array.isArray(body.links) ? body.links : current.links;
  const links: SiteLink[] = (rawLinks as unknown[])
    .map((item) => {
      const link = item as { label?: unknown; url?: unknown };
      return {
        label: str(link.label, "", 60).trim(),
        url: cleanUrl(link.url),
      };
    })
    .filter((link) => link.label && link.url)
    .slice(0, 12);

  const updated = await db
    .update(settings)
    .set({
      artistName: str(body.artistName, current.artistName, 80).trim() || "fowww",
      tagline: str(body.tagline, current.tagline, 200),
      bio: str(body.bio, current.bio, 20000),
      avatarUrl: body.avatarUrl === undefined ? current.avatarUrl : cleanUrl(body.avatarUrl),
      bannerUrl: body.bannerUrl === undefined ? current.bannerUrl : cleanUrl(body.bannerUrl),
      wallpaperUrl:
        body.wallpaperUrl === undefined ? current.wallpaperUrl : cleanUrl(body.wallpaperUrl),
      soundcloudUrl:
        cleanUrl(body.soundcloudUrl) || current.soundcloudUrl || "https://soundcloud.com/fowwww",
      marquee: str(body.marquee, current.marquee, 300),
      links,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1))
    .returning();

  return Response.json({ ok: true, settings: updated[0] });
}
