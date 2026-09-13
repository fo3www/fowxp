import { db } from "@/db";
import { settings, tracks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const UA =
  "Mozilla/5.0 (Windows NT 5.1; rv:109.0) Gecko/20100101 Firefox/115.0";

export type ScTrack = {
  id: number;
  title: string;
  permalink_url: string;
  artwork_url: string | null;
  description: string | null;
  genre: string | null;
  duration: number;
  playback_count: number | null;
  likes_count: number | null;
  comment_count: number | null;
  created_at: string | null;
  display_date?: string | null;
  kind?: string;
};

export type ScUser = {
  id: number;
  username: string;
  permalink_url: string;
  avatar_url: string | null;
  description: string | null;
  city: string | null;
  followers_count: number | null;
  track_count: number | null;
};

type Hydration = { hydratable: string; data: unknown };

async function getText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SoundCloud responded ${res.status} for ${url}`);
  return res.text();
}

/**
 * SoundCloud embeds a public web client_id inside the profile page markup.
 * We read it from the `__sc_hydration` payload (apiClient entry), with a
 * fallback of scanning the shipped JS bundles.
 */
export async function resolveProfile(profileUrl: string): Promise<{
  clientId: string;
  user: ScUser;
}> {
  const html = await getText(`${profileUrl.replace(/\/+$/, "")}/tracks`);
  const match = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/);
  let clientId = "";
  let user: ScUser | null = null;

  if (match) {
    const payload = JSON.parse(match[1]) as Hydration[];
    for (const entry of payload) {
      if (entry.hydratable === "apiClient") {
        const data = entry.data as { id?: string };
        if (data?.id) clientId = data.id;
      }
      if (entry.hydratable === "user") {
        user = entry.data as ScUser;
      }
    }
  }

  if (!clientId) {
    const bundles = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)]
      .map((m) => m[1])
      .slice(-4);
    for (const bundle of bundles) {
      const js = await getText(bundle);
      const found = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{20,})"/);
      if (found) {
        clientId = found[1];
        break;
      }
    }
  }

  if (!clientId) throw new Error("Не удалось получить client_id SoundCloud");
  if (!user) {
    const res = await fetch(
      `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(profileUrl)}&client_id=${clientId}`,
      { headers: { "User-Agent": UA }, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Профиль не найден (${res.status})`);
    user = (await res.json()) as ScUser;
  }

  return { clientId, user };
}

export async function fetchAllTracks(userId: number, clientId: string) {
  const collected: ScTrack[] = [];
  let next: string | null =
    `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=50&offset=0&linked_partitioning=1`;

  while (next && collected.length < 300) {
    const res: Response = await fetch(next, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Ошибка загрузки треков (${res.status})`);
    const json = (await res.json()) as {
      collection: ScTrack[];
      next_href: string | null;
    };
    collected.push(...(json.collection ?? []).filter((t) => t && t.permalink_url));
    next = json.next_href ? `${json.next_href}&client_id=${clientId}` : null;
  }

  return collected;
}

export function bigArtwork(url: string | null | undefined) {
  if (!url) return null;
  return url.replace("-large.", "-t500x500.");
}

export async function syncFromSoundCloud(profileUrl: string) {
  const { clientId, user } = await resolveProfile(profileUrl);
  const list = await fetchAllTracks(user.id, clientId);

  for (const t of list) {
    const values = {
      scId: String(t.id),
      title: t.title ?? "untitled",
      permalinkUrl: t.permalink_url,
      artworkUrl: bigArtwork(t.artwork_url) ?? bigArtwork(user.avatar_url),
      description: t.description ?? null,
      genre: t.genre ?? null,
      duration: Math.round(t.duration ?? 0),
      playbackCount: t.playback_count ?? 0,
      likesCount: t.likes_count ?? 0,
      commentCount: t.comment_count ?? 0,
      releasedAt: t.created_at ? new Date(t.created_at) : null,
      syncedAt: new Date(),
    };

    await db
      .insert(tracks)
      .values(values)
      .onConflictDoUpdate({
        target: tracks.scId,
        set: {
          title: values.title,
          permalinkUrl: values.permalinkUrl,
          artworkUrl: values.artworkUrl,
          description: values.description,
          genre: values.genre,
          duration: values.duration,
          playbackCount: values.playbackCount,
          likesCount: values.likesCount,
          commentCount: values.commentCount,
          releasedAt: values.releasedAt,
          syncedAt: values.syncedAt,
        },
      });
  }

  await db
    .update(settings)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(settings.id, 1));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tracks);

  return { imported: list.length, total: count, user };
}
