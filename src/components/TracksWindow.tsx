"use client";

import { useMemo, useState } from "react";
import type { TrackRow } from "@/db/schema";
import { formatDuration } from "@/lib/format";

type Props = {
  tracks: TrackRow[];
  currentId: number | null;
  onPlay: (trackId: number) => void;
};

type Sort = "date" | "plays" | "title";

export default function TracksWindow({ tracks, currentId, onPlay }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [view, setView] = useState<"tiles" | "list">("tiles");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(needle) ||
            (t.genre ?? "").toLowerCase().includes(needle),
        )
      : [...tracks];

    filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "plays") return b.playbackCount - a.playbackCount;
      if (sort === "title") return a.title.localeCompare(b.title, "ru");
      const da = a.releasedAt ? new Date(a.releasedAt).getTime() : 0;
      const dbb = b.releasedAt ? new Date(b.releasedAt).getTime() : 0;
      return dbb - da;
    });
    return filtered;
  }, [query, sort, tracks]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#aca899] bg-[#ece9d8] p-[5px]">
        <span className="font-bold text-[#0a246a]">Адрес</span>
        <div className="xp-sunken flex min-w-[180px] flex-1 items-center gap-1 px-1 py-[2px]">
          <span>📁</span>
          <span className="truncate">C:\fowww\tracks</span>
        </div>
        <input
          className="xp-input max-w-[170px]"
          placeholder="🔍 поиск трека..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="xp-input max-w-[140px]"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
        >
          <option value="date">по дате</option>
          <option value="plays">по прослушиваниям</option>
          <option value="title">по названию</option>
        </select>
        <button
          className="xp-btn"
          style={{ minWidth: 56 }}
          type="button"
          onClick={() => setView(view === "tiles" ? "list" : "tiles")}
        >
          {view === "tiles" ? "☰ Список" : "▦ Плитка"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* left XP task pane */}
        <aside
          className="hidden w-[168px] flex-none overflow-auto p-2 md:block"
          style={{ background: "linear-gradient(180deg,#7ba2e7 0%,#6d91dd 12%,#7ba4e8 100%)" }}
        >
          <div className="rounded-[6px] bg-white/95 p-2 shadow">
            <div className="mb-1 font-bold text-[#0a246a]">Задачи для музыки</div>
            <ul className="space-y-1 text-[#0c327d]">
              <li>▶ Воспроизвести выбранное</li>
              <li>🔀 Случайный трек</li>
              <li>☁ Открыть SoundCloud</li>
            </ul>
          </div>
          <div className="mt-2 rounded-[6px] bg-white/95 p-2 shadow">
            <div className="mb-1 font-bold text-[#0a246a]">Подробно</div>
            <div className="text-[#333]">
              Объектов: {visible.length}
              <br />
              Всего плейлист: {tracks.length}
              <br />
              Общая длительность:{" "}
              {formatDuration(tracks.reduce((sum, item) => sum + item.duration, 0))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-auto bg-white p-2">
          {visible.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-[#555]">
              Треков нет. Откройте «Панель управления» → «Синхронизация SoundCloud».
            </div>
          ) : view === "tiles" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-1">
              {visible.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={`xp-tile ${currentId === track.id ? "active" : ""}`}
                  onClick={() => onPlay(track.id)}
                  onDoubleClick={() => onPlay(track.id)}
                >
                  {track.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.artworkUrl} alt="" className="xp-tile-art" />
                  ) : (
                    <div className="xp-tile-art grid place-items-center text-[22px]">🎧</div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {track.pinned ? "📌 " : ""}
                      {track.title}
                    </span>
                    <span className="xp-tile-meta block truncate">
                      {track.genre || "experimental"}
                    </span>
                    <span className="xp-tile-meta block">
                      {formatDuration(track.duration)} · ▶ {track.playbackCount} · ♥{" "}
                      {track.likesCount}
                    </span>
                    <span className="xp-tile-meta block">
                      {track.releasedAt
                        ? new Date(track.releasedAt).toLocaleDateString("ru-RU")
                        : ""}
                      {track.hidden ? " · скрыт" : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#ece9d8] text-left">
                  <th className="border border-[#d4d0c8] px-2 py-1">Имя</th>
                  <th className="border border-[#d4d0c8] px-2 py-1">Жанр</th>
                  <th className="border border-[#d4d0c8] px-2 py-1">Длит.</th>
                  <th className="border border-[#d4d0c8] px-2 py-1">▶</th>
                  <th className="border border-[#d4d0c8] px-2 py-1">Дата</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((track) => (
                  <tr
                    key={track.id}
                    onClick={() => onPlay(track.id)}
                    className={`cursor-pointer ${
                      currentId === track.id ? "bg-[#316ac5] text-white" : "hover:bg-[#e4eefb]"
                    }`}
                  >
                    <td className="px-2 py-[3px]">🎵 {track.title}</td>
                    <td className="px-2 py-[3px]">{track.genre || "—"}</td>
                    <td className="px-2 py-[3px] tabular-nums">{formatDuration(track.duration)}</td>
                    <td className="px-2 py-[3px] tabular-nums">{track.playbackCount}</td>
                    <td className="px-2 py-[3px]">
                      {track.releasedAt
                        ? new Date(track.releasedAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
