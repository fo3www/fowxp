// One-off seeding: pulls the public SoundCloud catalogue of fowww into Postgres.
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const UA = "Mozilla/5.0 (Windows NT 5.1; rv:109.0) Gecko/20100101 Firefox/115.0";
const PROFILE = "https://soundcloud.com/fowwww";

const DEFAULT_BIO = `fowww — экспериментальный музыкант из интернета.

склеивает брейкбит, complextro, дрожащие сэмплы и бытовой шум в короткие треки,
которые звучат так, будто их собрал компьютер 2003 года на последнем издыхании.

всё, что вы слышите, сделано в наушниках, ночью, без мастеринга.`;

const big = (url) => (url ? url.replace("-large.", "-t500x500.") : null);

async function main() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  const html = await fetch(`${PROFILE}/tracks`, { headers: { "User-Agent": UA } }).then((r) =>
    r.text(),
  );
  const match = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("hydration payload not found");
  const payload = JSON.parse(match[1]);
  const clientId = payload.find((e) => e.hydratable === "apiClient")?.data?.id;
  const user = payload.find((e) => e.hydratable === "user")?.data;
  if (!clientId || !user) throw new Error("client_id/user not found");

  const tracks = [];
  let next = `https://api-v2.soundcloud.com/users/${user.id}/tracks?client_id=${clientId}&limit=50&offset=0&linked_partitioning=1`;
  while (next && tracks.length < 300) {
    const json = await fetch(next, { headers: { "User-Agent": UA } }).then((r) => r.json());
    tracks.push(...(json.collection ?? []));
    next = json.next_href ? `${json.next_href}&client_id=${clientId}` : null;
  }

  await client.query(
    `insert into settings (id, artist_name, tagline, bio, avatar_url, banner_url, soundcloud_url, marquee, links, last_sync_at)
     values (1, $1, $2, $3, $4, '', $5, $6, $7::jsonb, now())
     on conflict (id) do update set avatar_url = coalesce(nullif(settings.avatar_url,''), excluded.avatar_url),
       bio = coalesce(nullif(settings.bio,''), excluded.bio), last_sync_at = now()`,
    [
      user.username || "fowww",
      user.city || "экспериментальная музыка / звукосодержащий продукт",
      user.description?.trim() ? `${user.description}\n\n${DEFAULT_BIO}` : DEFAULT_BIO,
      big(user.avatar_url) ?? "",
      PROFILE,
      "fowww.xp загружен // двойной клик по иконке рабочего стола // треки синхронизированы с SoundCloud",
      JSON.stringify([{ label: "SoundCloud", url: PROFILE }]),
    ],
  );

  for (const t of tracks) {
    if (!t?.permalink_url) continue;
    await client.query(
      `insert into tracks (sc_id, title, permalink_url, artwork_url, description, genre, duration,
        playback_count, likes_count, comment_count, released_at, synced_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       on conflict (sc_id) do update set title = excluded.title, permalink_url = excluded.permalink_url,
        artwork_url = excluded.artwork_url, description = excluded.description, genre = excluded.genre,
        duration = excluded.duration, playback_count = excluded.playback_count,
        likes_count = excluded.likes_count, comment_count = excluded.comment_count,
        released_at = excluded.released_at, synced_at = now()`,
      [
        String(t.id),
        t.title ?? "untitled",
        t.permalink_url,
        big(t.artwork_url) ?? big(user.avatar_url),
        t.description ?? null,
        t.genre ?? null,
        Math.round(t.duration ?? 0),
        t.playback_count ?? 0,
        t.likes_count ?? 0,
        t.comment_count ?? 0,
        t.created_at ? new Date(t.created_at) : null,
      ],
    );
  }

  const { rows } = await client.query("select count(*)::int as c from tracks");
  console.log(`seeded ${tracks.length} tracks, total in db: ${rows[0].c}`);
  await client.end();
}

main().catch((error) => {
  console.error("seed failed:", error.message);
  process.exit(0);
});
