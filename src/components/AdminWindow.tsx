"use client";

import { useEffect, useState } from "react";
import type { SettingsRow, SiteLink, TrackRow } from "@/db/schema";

type Props = {
  settings: SettingsRow;
  tracks: TrackRow[];
  admin: boolean;
  onAdminChange: (admin: boolean) => void;
  onSettingsChange: (settings: SettingsRow) => void;
  onTracksChange: (tracks: TrackRow[]) => void;
};

type Tab = "profile" | "bio" | "links" | "tracks";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Оформление" },
  { id: "bio", label: "Биография" },
  { id: "links", label: "Ссылки" },
  { id: "tracks", label: "Треки" },
];

export default function AdminWindow({
  settings,
  tracks,
  admin,
  onAdminChange,
  onSettingsChange,
  onTracksChange,
}: Props) {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("profile");
  const [draft, setDraft] = useState<SettingsRow>(settings);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");
    setBusy(true);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setAuthError(json.error ?? "Ошибка входа");
      return;
    }
    setPassword("");
    onAdminChange(true);
    await refreshTracks();
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    onAdminChange(false);
  }

  async function refreshTracks() {
    const res = await fetch("/api/tracks", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) onTracksChange(json.tracks as TrackRow[]);
  }

  async function save() {
    setBusy(true);
    setStatus("Сохранение...");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(json.error ?? "Ошибка сохранения");
      return;
    }
    onSettingsChange(json.settings as SettingsRow);
    setStatus("✔ Изменения применены");
  }

  async function sync() {
    setBusy(true);
    setStatus("Подключение к SoundCloud...");
    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: draft.soundcloudUrl }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(`✖ ${json.error ?? "Синхронизация не удалась"}`);
      return;
    }
    setStatus(`✔ Импортировано треков: ${json.imported}. Всего в базе: ${json.total}`);
    await refreshTracks();
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    const settingsJson = await settingsRes.json();
    if (settingsJson.ok) onSettingsChange(settingsJson.settings as SettingsRow);
  }

  async function patchTrack(id: number, patch: Record<string, unknown>) {
    await fetch(`/api/admin/tracks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refreshTracks();
  }

  async function removeTrack(id: number) {
    await fetch(`/api/admin/tracks/${id}`, { method: "DELETE" });
    await refreshTracks();
  }

  if (!admin) {
    return (
      <div className="flex h-full items-center justify-center bg-[#ece9d8] p-4">
        <form
          onSubmit={login}
          className="xp-panel w-[330px] p-4"
          style={{ background: "linear-gradient(180deg,#fff,#ece9d8)" }}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded bg-gradient-to-br from-[#bcd4f6] to-[#4a80c8] text-[24px] shadow">
              🔐
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#0a246a]">Вход в систему</div>
              <div className="text-[11px] text-[#555]">Панель управления fowww.xp</div>
            </div>
          </div>

          <label className="mb-1 block font-bold" htmlFor="admin-password">
            Пароль администратора
          </label>
          <input
            id="admin-password"
            type="password"
            className="xp-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {authError ? (
            <div className="mt-2 border border-[#d99] bg-[#fff0f0] px-2 py-1 text-[#a00]">
              ✖ {authError}
            </div>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button className="xp-btn primary" disabled={busy} type="submit">
              ОК
            </button>
            <button
              className="xp-btn"
              type="button"
              onClick={() => {
                setPassword("");
                setAuthError("");
              }}
            >
              Отмена
            </button>
          </div>
          <div className="mt-3 text-[10.5px] text-[#666]">
            На хостинге пароль задается защищенной переменной окружения <b>ADMIN_PASSWORD</b>.
          </div>
        </form>
      </div>
    );
  }

  const updateLink = (index: number, patch: Partial<SiteLink>) => {
    const links = draft.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    setDraft({ ...draft, links });
  };

  return (
    <div className="flex h-full flex-col bg-[#ece9d8]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#aca899] bg-[#f6f4ec] px-2 pt-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="rounded-t-[4px] border border-[#aca899] px-3 py-[3px] text-[11px]"
            style={{
              background:
                tab === item.id
                  ? "linear-gradient(180deg,#fff,#ece9d8)"
                  : "linear-gradient(180deg,#f2f0e6,#d9d4c5)",
              borderBottomColor: tab === item.id ? "#ece9d8" : "#aca899",
              fontWeight: tab === item.id ? 700 : 400,
              marginBottom: tab === item.id ? -1 : 0,
            }}
          >
            {item.label}
          </button>
        ))}
        <button className="xp-btn ml-auto mb-1" type="button" onClick={logout}>
          Выйти
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "profile" ? (
          <div className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="block">
                <span className="font-bold">Имя артиста</span>
                <input
                  className="xp-input"
                  value={draft.artistName}
                  onChange={(event) => setDraft({ ...draft, artistName: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="font-bold">Подпись / слоган</span>
                <input
                  className="xp-input"
                  value={draft.tagline}
                  onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
                />
              </label>
            </div>

            <fieldset className="xp-fieldset">
              <legend className="xp-legend">Аватар (URL картинки)</legend>
              <div className="flex gap-3">
                <div className="h-[84px] w-[84px] flex-none border border-[#7f9db9] bg-white p-[2px]">
                  {draft.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[26px]">👤</div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    className="xp-input"
                    placeholder="https://..."
                    value={draft.avatarUrl}
                    onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })}
                  />
                  <div className="mt-1 text-[10.5px] text-[#555]">
                    Вставьте прямую ссылку на изображение. Превью обновится сразу.
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="xp-fieldset">
              <legend className="xp-legend">Баннер профиля (URL картинки)</legend>
              <input
                className="xp-input"
                placeholder="https://..."
                value={draft.bannerUrl}
                onChange={(event) => setDraft({ ...draft, bannerUrl: event.target.value })}
              />
              <div className="mt-2 h-[92px] w-full overflow-hidden border border-[#7f9db9] bg-white">
                {draft.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.bannerUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[11px] text-[#777]">
                    баннер не задан — будет показан градиент
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset className="xp-fieldset">
              <legend className="xp-legend">Обои рабочего стола (URL, необязательно)</legend>
              <input
                className="xp-input"
                placeholder="/images/wallpaper.jpg или https://..."
                value={draft.wallpaperUrl}
                onChange={(event) => setDraft({ ...draft, wallpaperUrl: event.target.value })}
              />
            </fieldset>

            <label className="block">
              <span className="font-bold">Бегущая строка в трее</span>
              <input
                className="xp-input"
                value={draft.marquee}
                onChange={(event) => setDraft({ ...draft, marquee: event.target.value })}
              />
            </label>
          </div>
        ) : null}

        {tab === "bio" ? (
          <div className="flex h-full flex-col gap-2">
            <div className="font-bold">Текст биографии</div>
            <textarea
              className="xp-textarea min-h-[240px] flex-1"
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
              placeholder="Расскажите о себе..."
            />
            <div className="text-[10.5px] text-[#555]">
              Символов: {draft.bio.length}. Переносы строк сохраняются.
            </div>
          </div>
        ) : null}

        {tab === "links" ? (
          <div className="space-y-2">
            {draft.links.map((link, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <input
                  className="xp-input max-w-[160px]"
                  placeholder="название"
                  value={link.label}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                />
                <input
                  className="xp-input flex-1"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                />
                <button
                  className="xp-btn"
                  style={{ minWidth: 40 }}
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, links: draft.links.filter((_, i) => i !== index) })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="xp-btn"
              type="button"
              onClick={() => setDraft({ ...draft, links: [...draft.links, { label: "", url: "" }] })}
            >
              + Добавить ссылку
            </button>
          </div>
        ) : null}

        {tab === "tracks" ? (
          <div className="space-y-2">
            <fieldset className="xp-fieldset">
              <legend className="xp-legend">Синхронизация SoundCloud</legend>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="xp-input min-w-[220px] flex-1"
                  value={draft.soundcloudUrl}
                  onChange={(event) => setDraft({ ...draft, soundcloudUrl: event.target.value })}
                />
                <button className="xp-btn primary" type="button" disabled={busy} onClick={sync}>
                  ⟳ Синхронизировать
                </button>
              </div>
              <div className="mt-1 text-[10.5px] text-[#555]">
                Импортирует все публичные треки профиля: название, обложку, длительность,
                прослушивания и лайки.
              </div>
            </fieldset>

            <div className="xp-sunken max-h-[300px] overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#ece9d8]">
                  <tr>
                    <th className="border-b border-[#aca899] px-2 py-1 text-left">Трек</th>
                    <th className="border-b border-[#aca899] px-2 py-1">Закреп.</th>
                    <th className="border-b border-[#aca899] px-2 py-1">Скрыт</th>
                    <th className="border-b border-[#aca899] px-2 py-1">Удалить</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track) => (
                    <tr key={track.id} className="odd:bg-[#f7f7f2]">
                      <td className="px-2 py-1">
                        {track.title}
                        <span className="ml-1 text-[#777]">({track.genre || "—"})</span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={track.pinned}
                          onChange={(event) =>
                            patchTrack(track.id, { pinned: event.target.checked })
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={track.hidden}
                          onChange={(event) =>
                            patchTrack(track.id, { hidden: event.target.checked })
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          className="xp-btn"
                          style={{ minWidth: 30 }}
                          type="button"
                          onClick={() => removeTrack(track.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tracks.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-center text-[#555]" colSpan={4}>
                        Список пуст — запустите синхронизацию.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-[#aca899] bg-[#f6f4ec] p-2">
        <div className="flex-1 truncate text-[11px] text-[#0a246a]">{status}</div>
        <button className="xp-btn primary" type="button" disabled={busy} onClick={save}>
          Применить
        </button>
        <button className="xp-btn" type="button" onClick={() => setDraft(settings)}>
          Сбросить
        </button>
      </div>
    </div>
  );
}
