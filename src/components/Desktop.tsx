"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SettingsRow, TrackRow } from "@/db/schema";
import AdminWindow from "@/components/AdminWindow";
import BioWindow from "@/components/BioWindow";
import Player from "@/components/Player";
import TracksWindow from "@/components/TracksWindow";
import XPWindow, { type WindowGeometry, type WindowState } from "@/components/xp/Window";

type WinId = "tracks" | "player" | "bio" | "admin" | "readme";

const META: Record<WinId, { title: string; icon: string; menu?: string[]; resizable?: boolean }> = {
  tracks: {
    title: "Мои треки — fowww",
    icon: "🎵",
    menu: ["Файл", "Правка", "Вид", "Избранное", "Сервис", "Справка"],
  },
  player: { title: "fowww Media Player", icon: "▶️", menu: ["Файл", "Вид", "Воспроизведение"] },
  bio: { title: "fowww — биография", icon: "📇", menu: ["Файл", "Правка", "Вид", "Справка"] },
  admin: { title: "Панель управления", icon: "⚙️", menu: ["Файл", "Вид", "Справка"] },
  readme: { title: "readme.txt — Блокнот", icon: "📝", menu: ["Файл", "Правка", "Формат", "Справка"] },
};

const ORDER: WinId[] = ["tracks", "player", "bio", "admin", "readme"];

function baseState(geo: WindowGeometry, z: number): WindowState {
  return { ...geo, open: false, minimized: false, maximized: false, z };
}

function initialWindows(width: number, height: number): Record<WinId, WindowState> {
  const narrow = width < 900;
  const availH = height - 32;
  const clampH = (h: number) => Math.min(h, availH - 12);

  if (narrow) {
    const w = Math.min(width - 16, 520);
    return {
      tracks: baseState({ x: 8, y: 8, w, h: clampH(430) }, 12),
      player: baseState({ x: 14, y: 60, w, h: clampH(430) }, 13),
      bio: baseState({ x: 20, y: 40, w, h: clampH(420) }, 11),
      admin: baseState({ x: 10, y: 20, w, h: clampH(460) }, 14),
      readme: baseState({ x: 24, y: 90, w: Math.min(width - 30, 420), h: clampH(300) }, 10),
    };
  }

  return {
    tracks: baseState({ x: 46, y: 24, w: Math.min(760, width - 380), h: clampH(470) }, 12),
    player: baseState({ x: Math.max(300, width - 430), y: 300, w: 400, h: clampH(430) }, 13),
    bio: baseState({ x: Math.max(240, width - 640), y: 34, w: 580, h: clampH(440) }, 11),
    admin: baseState({ x: 120, y: 70, w: Math.min(720, width - 200), h: clampH(520) }, 14),
    readme: baseState({ x: 180, y: 190, w: 470, h: clampH(330) }, 10),
  };
}

const DESKTOP_ICONS: { id: WinId | "soundcloud"; label: string; glyph: string }[] = [
  { id: "tracks", label: "Мои треки", glyph: "🎵" },
  { id: "player", label: "Media Player", glyph: "▶️" },
  { id: "bio", label: "Биография", glyph: "📇" },
  { id: "admin", label: "Панель управления", glyph: "⚙️" },
  { id: "readme", label: "readme.txt", glyph: "📝" },
  { id: "soundcloud", label: "SoundCloud", glyph: "☁️" },
];

type Props = {
  initialSettings: SettingsRow;
  initialTracks: TrackRow[];
  initialAdmin: boolean;
};

export default function Desktop({ initialSettings, initialTracks, initialAdmin }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [tracks, setTracks] = useState(initialTracks);
  const [admin, setAdmin] = useState(initialAdmin);
  const [wins, setWins] = useState<Record<WinId, WindowState>>(() => initialWindows(1280, 800));

  const [focused, setFocused] = useState<WinId>("tracks");
  const [startOpen, setStartOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [shutdown, setShutdown] = useState(false);
  const [clock, setClock] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const layout = initialWindows(window.innerWidth, window.innerHeight);
    const openDefaults: WinId[] = window.innerWidth < 900 ? ["tracks"] : ["tracks", "bio"];
    for (const id of openDefaults) layout[id].open = true;
    setWins(layout);
    setFocused(openDefaults[0]);
    const timer = window.setTimeout(() => setBooting(false), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const focus = useCallback((id: WinId) => {
    setFocused(id);
    setWins((current) => {
      const topZ = Math.max(...ORDER.map((key) => current[key].z));
      if (current[id].z === topZ && !current[id].minimized) return current;
      return { ...current, [id]: { ...current[id], z: topZ + 1, minimized: false } };
    });
  }, []);

  const open = useCallback(
    (id: WinId) => {
      setWins((current) => ({ ...current, [id]: { ...current[id], open: true, minimized: false } }));
      focus(id);
      setStartOpen(false);
    },
    [focus],
  );

  const patch = useCallback((id: WinId, changes: Partial<WindowState>) => {
    setWins((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  }, []);

  const playTrack = useCallback(
    (trackId: number) => {
      const position = tracks.findIndex((track) => track.id === trackId);
      if (position >= 0) setIndex(position);
      open("player");
    },
    [open, tracks],
  );

  const currentTrack = tracks[index] ?? null;

  const openWindows = useMemo(() => ORDER.filter((id) => wins[id].open), [wins]);

  const wallpaper = settings.wallpaperUrl || "/images/wallpaper.jpg";

  if (shutdown) {
    return (
      <button
        type="button"
        onClick={() => setShutdown(false)}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-[#12379c] text-center text-white"
        style={{ fontFamily: "'Trebuchet MS', Tahoma" }}
      >
        <div className="text-[26px] font-bold">Теперь питание компьютера можно отключить.</div>
        <div className="text-[13px] opacity-80">кликните, чтобы включить снова</div>
      </button>
    );
  }

  return (
    <div
      className="xp-desktop"
      style={{ backgroundImage: `url(${wallpaper})` }}
      onPointerDown={() => {
        setStartOpen(false);
        setSelectedIcon(null);
      }}
    >
      {booting ? (
        <div className="xp-boot">
          <div className="text-[34px] font-bold tracking-tight">
            fowww<span className="text-[#ff8a00]">XP</span>
          </div>
          <div className="text-[12px] opacity-70">ща ща ща...</div>
          <div className="xp-boot-bar">
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : null}

      {/* desktop icons */}
      <div className="absolute left-2 top-2 flex max-h-[calc(100vh-70px)] flex-col flex-wrap gap-1">
        {DESKTOP_ICONS.map((icon) => (
          <div
            key={icon.id}
            className={`xp-icon ${selectedIcon === icon.id ? "selected" : ""}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              setSelectedIcon(icon.id);
            }}
            onDoubleClick={() => {
              if (icon.id === "soundcloud") {
                window.open(settings.soundcloudUrl, "_blank", "noreferrer");
                return;
              }
              open(icon.id);
            }}
            onClick={(event) => {
              if (event.detail === 1) return;
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" && icon.id !== "soundcloud") open(icon.id);
            }}
          >
            <span className="xp-icon-glyph">{icon.glyph}</span>
            <span>{icon.label}</span>
          </div>
        ))}
      </div>

      {/* windows */}
      <XPWindow
        title={META.tracks.title}
        icon={META.tracks.icon}
        menu={META.tracks.menu}
        state={wins.tracks}
        active={focused === "tracks"}
        onFocus={() => focus("tracks")}
        onClose={() => patch("tracks", { open: false })}
        onMinimize={() => patch("tracks", { minimized: true })}
        onMaximize={() => patch("tracks", { maximized: !wins.tracks.maximized })}
        onGeometry={(geo) => patch("tracks", geo)}
        statusBar={
          <>
            <div className="flex-1">Объектов: {tracks.length}</div>
            <div className="w-[170px] truncate">
              {currentTrack ? `Выбрано: ${currentTrack.title}` : "Ничего не выбрано"}
            </div>
            <div className="w-[90px]">💾 SoundCloud</div>
          </>
        }
      >
        <TracksWindow
          tracks={tracks}
          currentId={currentTrack?.id ?? null}
          onPlay={playTrack}
        />
      </XPWindow>

      <XPWindow
        title={currentTrack ? `${currentTrack.title} — fowww Media Player` : META.player.title}
        icon={META.player.icon}
        menu={META.player.menu}
        state={wins.player}
        active={focused === "player"}
        onFocus={() => focus("player")}
        onClose={() => patch("player", { open: false })}
        onMinimize={() => patch("player", { minimized: true })}
        onMaximize={() => patch("player", { maximized: !wins.player.maximized })}
        onGeometry={(geo) => patch("player", geo)}
        statusBar={
          <>
            <div className="flex-1 truncate">
              {currentTrack ? `Поток: ${currentTrack.permalinkUrl}` : "Нет потока"}
            </div>
            <div className="w-[70px]">stereo</div>
          </>
        }
      >
        <Player tracks={tracks} index={index} onIndexChange={setIndex} />
      </XPWindow>

      <XPWindow
        title={META.bio.title}
        icon={META.bio.icon}
        menu={META.bio.menu}
        state={wins.bio}
        active={focused === "bio"}
        onFocus={() => focus("bio")}
        onClose={() => patch("bio", { open: false })}
        onMinimize={() => patch("bio", { minimized: true })}
        onMaximize={() => patch("bio", { maximized: !wins.bio.maximized })}
        onGeometry={(geo) => patch("bio", geo)}
        statusBar={
          <>
            <div className="flex-1">Готово</div>
            <div className="w-[120px]">🌐 Интернет</div>
          </>
        }
      >
        <BioWindow settings={settings} trackCount={tracks.length} />
      </XPWindow>

      <XPWindow
        title={META.admin.title}
        icon={META.admin.icon}
        menu={META.admin.menu}
        state={wins.admin}
        active={focused === "admin"}
        onFocus={() => focus("admin")}
        onClose={() => patch("admin", { open: false })}
        onMinimize={() => patch("admin", { minimized: true })}
        onMaximize={() => patch("admin", { maximized: !wins.admin.maximized })}
        onGeometry={(geo) => patch("admin", geo)}
        statusBar={
          <>
            <div className="flex-1">{admin ? "Администратор: вход выполнен" : "Гостевой режим"}</div>
            <div className="w-[110px]">fowww.xp / v1.0</div>
          </>
        }
      >
        <AdminWindow
          settings={settings}
          tracks={tracks}
          admin={admin}
          onAdminChange={setAdmin}
          onSettingsChange={setSettings}
          onTracksChange={setTracks}
        />
      </XPWindow>

      <XPWindow
        title={META.readme.title}
        icon={META.readme.icon}
        menu={META.readme.menu}
        state={wins.readme}
        active={focused === "readme"}
        onFocus={() => focus("readme")}
        onClose={() => patch("readme", { open: false })}
        onMinimize={() => patch("readme", { minimized: true })}
        onMaximize={() => patch("readme", { maximized: !wins.readme.maximized })}
        onGeometry={(geo) => patch("readme", geo)}
      >
        <div className="h-full overflow-auto bg-white p-3 font-mono text-[12px] leading-[1.5] whitespace-pre-wrap">
          {`fowww.xp — персональный компьютер экспериментального музыканта

[1] «Мои треки» — все треки с SoundCloud в виде плиток.
    Клик по плитке открывает проигрыватель и запускает трек.

[2] «fowww Media Player» — поток идёт напрямую с SoundCloud,
    треки переключаются автоматически по окончании.

[3] «Панель управления» — вход по паролю: биография, аватар,
    баннер, обои и синхронизация треков.

[4] Все окна можно двигать, сворачивать и разворачивать.

(c) ${new Date().getFullYear()} ${settings.artistName}. Никаких прав не защищено.`}
        </div>
      </XPWindow>

      {/* start menu */}
      {startOpen ? (
        <div className="xp-startmenu" onPointerDown={(event) => event.stopPropagation()}>
          <div className="xp-startmenu-header">
            <div className="h-[38px] w-[38px] overflow-hidden rounded border-2 border-white/80 bg-white/20">
              {settings.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[18px]">👤</div>
              )}
            </div>
            {settings.artistName}
          </div>
          <div className="grid grid-cols-1 bg-white py-1">
            {ORDER.map((id) => (
              <button key={id} className="xp-startmenu-item" type="button" onClick={() => open(id)}>
                <span className="text-[18px]">{META[id].icon}</span>
                {META[id].title}
              </button>
            ))}
            <button
              className="xp-startmenu-item"
              type="button"
              onClick={() => window.open(settings.soundcloudUrl, "_blank", "noreferrer")}
            >
              <span className="text-[18px]">☁️</span>
              soundcloud.com/fowwww
            </button>
          </div>
          <div className="xp-startmenu-footer">
            <button
              className="flex items-center gap-2 text-[11.5px] text-white"
              type="button"
              onClick={() => setShutdown(true)}
            >
              🔴 Выключить компьютер
            </button>
          </div>
        </div>
      ) : null}

      {/* taskbar */}
      <div className="xp-taskbar" onPointerDown={(event) => event.stopPropagation()}>
        <button
          className={`xp-start ${startOpen ? "open" : ""}`}
          type="button"
          onClick={() => setStartOpen((prev) => !prev)}
        >
          <span className="not-italic">🪟</span> пуск
        </button>

        <div className="xp-tasks">
          {openWindows.map((id) => (
            <button
              key={id}
              type="button"
              className={`xp-task ${focused === id && !wins[id].minimized ? "active" : ""}`}
              onClick={() => {
                if (focused === id && !wins[id].minimized) patch(id, { minimized: true });
                else focus(id);
              }}
            >
              <span>{META[id].icon}</span>
              <span className="truncate">{META[id].title}</span>
            </button>
          ))}
        </div>

        <div className="xp-tray">
          <div className="xp-marquee hidden w-[190px] sm:block">
            <span>{settings.marquee}</span>
          </div>
          <span title={admin ? "Администратор" : "Гость"}>{admin ? "🔓" : "🔒"}</span>
          <span>🔊</span>
          <span className="tabular-nums">{clock}</span>
        </div>
      </div>
    </div>
  );
}
