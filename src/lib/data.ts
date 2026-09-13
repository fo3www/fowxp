import { db } from "@/db";
import { settings, tracks, type SettingsRow, type TrackRow } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";

export const DEFAULT_BIO = `fowww — экспериментальный музыкант из интернета.

склеивает брейкбит, complextro, дрожащие сэмплы и бытовой шум в короткие треки,
которые звучат так, будто их собрал компьютер 2003 года на последнем издыхании.

всё, что вы слышите, сделано в наушниках, ночью, без мастеринга.`;

export async function getSettings(): Promise<SettingsRow> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows.length > 0) return rows[0];

  const inserted = await db
    .insert(settings)
    .values({
      id: 1,
      artistName: "fowww",
      tagline: "экспериментальная музыка / звукосодержащий продукт",
      bio: DEFAULT_BIO,
      avatarUrl: "",
      bannerUrl: "",
      wallpaperUrl: "",
      soundcloudUrl: "https://soundcloud.com/fowwww",
      marquee: "fowww.exe запущен // добро пожаловать на рабочий стол // двойной клик по иконке",
      links: [
        { label: "SoundCloud", url: "https://soundcloud.com/fowwww" },
      ],
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) return inserted[0];
  const again = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return again[0];
}

export async function getTracks(includeHidden = false): Promise<TrackRow[]> {
  const rows = await db
    .select()
    .from(tracks)
    .orderBy(desc(tracks.pinned), desc(tracks.releasedAt), asc(tracks.title));
  return includeHidden ? rows : rows.filter((t) => !t.hidden);
}

export { formatDuration } from "@/lib/format";
