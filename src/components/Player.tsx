"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackRow } from "@/db/schema";
import { formatDuration } from "@/lib/format";

type WidgetEvents = {
  READY: string;
  PLAY: string;
  PAUSE: string;
  FINISH: string;
  PLAY_PROGRESS: string;
};

type Widget = {
  bind: (event: string, handler: (data?: { currentPosition?: number }) => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options: Record<string, unknown>) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  setVolume: (value: number) => void;
  getDuration: (cb: (value: number) => void) => void;
};

type SCApi = {
  Widget: ((el: HTMLIFrameElement) => Widget) & { Events: WidgetEvents };
};

declare global {
  interface Window {
    SC?: SCApi;
  }
}

const API_SRC = "https://w.soundcloud.com/player/api.js";

function loadApi(): Promise<SCApi> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if (window.SC) {
      resolve(window.SC);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.addEventListener("load", () => {
      if (window.SC) resolve(window.SC);
      else reject(new Error("SC widget api unavailable"));
    });
    script.addEventListener("error", () => reject(new Error("не удалось загрузить плеер")));
    if (!existing) document.body.appendChild(script);
  });
}

function embedUrl(permalink: string, autoPlay: boolean) {
  const params = new URLSearchParams({
    url: permalink,
    color: "#0058ee",
    auto_play: String(autoPlay),
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_teaser: "false",
    visual: "false",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

type Props = {
  tracks: TrackRow[];
  index: number;
  onIndexChange: (index: number) => void;
};

export default function Player({ tracks, index, onIndexChange }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<Widget | null>(null);
  const mountedTrack = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(80);
  const [ready, setReady] = useState(false);

  const track = tracks[index];
  const duration = track?.duration ?? 0;

  const bindEvents = useCallback(
    (widget: Widget, api: SCApi) => {
      const { Events } = api.Widget;
      widget.bind(Events.PLAY, () => setPlaying(true));
      widget.bind(Events.PAUSE, () => setPlaying(false));
      widget.bind(Events.PLAY_PROGRESS, (data) => setPosition(data?.currentPosition ?? 0));
      widget.bind(Events.FINISH, () => {
        setPlaying(false);
        setPosition(0);
        if (tracks.length > 1) onIndexChange((index + 1) % tracks.length);
      });
    },
    [index, onIndexChange, tracks.length],
  );

  // create the widget once the iframe exists
  useEffect(() => {
    let cancelled = false;
    if (!track || widgetRef.current) return;
    loadApi()
      .then((api) => {
        if (cancelled || !iframeRef.current) return;
        const widget = api.Widget(iframeRef.current);
        widgetRef.current = widget;
        widget.bind(api.Widget.Events.READY, () => {
          setReady(true);
          widget.setVolume(volume);
          bindEvents(widget, api);
        });
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  // switch tracks through the widget so playback is not interrupted by remounts
  useEffect(() => {
    if (!track) return;
    if (mountedTrack.current === null) {
      mountedTrack.current = track.permalinkUrl;
      return;
    }
    if (mountedTrack.current === track.permalinkUrl) return;
    mountedTrack.current = track.permalinkUrl;
    const widget = widgetRef.current;
    const api = typeof window !== "undefined" ? window.SC : undefined;
    if (!widget || !api) return;
    setPosition(0);
    widget.load(track.permalinkUrl, {
      auto_play: true,
      color: "#0058ee",
      show_comments: false,
      hide_related: true,
      visual: false,
      callback: () => {
        widget.setVolume(volume);
        bindEvents(widget, api);
        setPlaying(true);
      },
    });
  }, [bindEvents, track, volume]);

  const toggle = () => {
    const widget = widgetRef.current;
    if (!widget) return;
    if (playing) widget.pause();
    else widget.play();
  };

  const skip = (delta: number) => {
    if (tracks.length === 0) return;
    const next = (index + delta + tracks.length) % tracks.length;
    onIndexChange(next);
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const widget = widgetRef.current;
    if (!widget || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    widget.seekTo(Math.round(ratio * duration));
    setPosition(Math.round(ratio * duration));
  };

  if (!track) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-[#444]">
        Плейлист пуст. Синхронизируйте треки в «Панели управления».
      </div>
    );
  }

  const percent = duration ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="flex h-full flex-col bg-[#ece9d8]">
      <div
        className="flex gap-3 p-3"
        style={{
          background: "linear-gradient(180deg,#1f3f7a 0%,#20509f 45%,#14325f 100%)",
          borderBottom: "1px solid #0b1d3a",
        }}
      >
        <div className="relative h-[96px] w-[96px] flex-none border border-[#8fb4e8] bg-[#0b1d3a] shadow-[2px_2px_6px_rgba(0,0,0,0.6)]">
          {track.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[30px]">🎵</div>
          )}
          {playing ? (
            <div className="absolute bottom-0 left-0 flex h-4 w-full items-end gap-[2px] bg-black/45 px-1 pb-[2px]">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
                <i
                  key={bar}
                  className="block w-full bg-[#63e463]"
                  style={{
                    height: `${20 + ((bar * 37) % 70)}%`,
                    animation: `xp-boot-slide ${0.7 + bar * 0.13}s ease-in-out infinite alternate`,
                    animationName: "none",
                    opacity: 0.55 + ((bar % 3) * 0.2),
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 text-white">
          <div className="truncate text-[14px] font-bold" style={{ fontFamily: "'Trebuchet MS', Tahoma" }}>
            {track.title}
          </div>
          <div className="text-[11px] text-[#a9c8f5]">fowww — {track.genre || "experimental"}</div>
          <div className="mt-1 text-[10.5px] text-[#8fb4e8]">
            ▶ {track.playbackCount} · ♥ {track.likesCount} · {formatDuration(track.duration)}
          </div>
          <a
            href={track.permalinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[10.5px] text-[#ffd452] underline"
          >
            открыть на SoundCloud →
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2 text-[10.5px]">
          <span className="w-9 tabular-nums">{formatDuration(position)}</span>
          <div
            className="xp-progress flex-1 cursor-pointer"
            onClick={seek}
            title="Перемотка"
            role="presentation"
          >
            <div style={{ width: `${percent}%` }} />
          </div>
          <span className="w-9 text-right tabular-nums">{formatDuration(duration)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="xp-btn" style={{ minWidth: 44 }} onClick={() => skip(-1)} type="button">
            ⏮
          </button>
          <button
            className="xp-btn primary"
            style={{ minWidth: 76 }}
            onClick={toggle}
            disabled={!ready}
            type="button"
          >
            {playing ? "⏸ Пауза" : "▶ Играть"}
          </button>
          <button className="xp-btn" style={{ minWidth: 44 }} onClick={() => skip(1)} type="button">
            ⏭
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span>🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              className="w-24 accent-[#0058ee]"
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                widgetRef.current?.setVolume(next);
              }}
            />
          </div>
        </div>

        <div className="xp-sunken max-h-[150px] overflow-auto p-1">
          {tracks.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onIndexChange(itemIndex)}
              className={`flex w-full items-center gap-2 px-2 py-[3px] text-left text-[11px] ${
                itemIndex === index ? "bg-[#316ac5] text-white" : "hover:bg-[#e4eefb]"
              }`}
            >
              <span className="w-4 text-right opacity-70">{itemIndex + 1}</span>
              <span className="flex-1 truncate">{item.title}</span>
              <span className="tabular-nums opacity-80">{formatDuration(item.duration)}</span>
            </button>
          ))}
        </div>
      </div>

      <iframe
        ref={iframeRef}
        title="soundcloud-engine"
        allow="autoplay"
        src={embedUrl(track.permalinkUrl, false)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
