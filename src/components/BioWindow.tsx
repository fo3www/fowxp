"use client";

import type { SettingsRow } from "@/db/schema";

type Props = {
  settings: SettingsRow;
  trackCount: number;
};

export default function BioWindow({ settings, trackCount }: Props) {
  return (
    <div className="h-full overflow-auto bg-white">
      {settings.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.bannerUrl}
          alt="banner"
          className="h-[132px] w-full border-b border-[#7f9db9] object-cover"
        />
      ) : (
        <div
          className="flex h-[132px] w-full items-center justify-center border-b border-[#7f9db9] text-[24px] font-bold text-white"
          style={{
            background:
              "linear-gradient(120deg,#0b3f9e 0%,#1a6ae0 40%,#4aa72f 75%,#61bb46 100%)",
            fontFamily: "'Trebuchet MS', Tahoma",
            textShadow: "2px 2px 4px rgba(0,0,0,.55)",
          }}
        >
          {settings.artistName}
        </div>
      )}

      <div className="flex flex-wrap gap-4 p-4">
        <div className="flex-none">
          <div className="border-2 border-[#b6c8e8] bg-white p-1 shadow-[2px_2px_6px_rgba(0,0,0,.3)]">
            {settings.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.avatarUrl}
                alt="avatar"
                className="h-[124px] w-[124px] object-cover"
              />
            ) : (
              <div className="grid h-[124px] w-[124px] place-items-center bg-[#dfe9f8] text-[42px]">
                👤
              </div>
            )}
          </div>
          <div className="mt-2 w-[132px] text-center text-[11px] text-[#0a246a]">
            <b>{settings.artistName}</b>
            <br />
            {trackCount} треков в системе
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <h2
            className="text-[19px] font-bold text-[#0a246a]"
            style={{ fontFamily: "'Trebuchet MS', Tahoma" }}
          >
            {settings.artistName}
          </h2>
          <div className="mb-3 text-[12px] italic text-[#4a4a44]">{settings.tagline}</div>

          <div className="xp-sunken whitespace-pre-wrap p-3 text-[12px] leading-[1.55]">
            {settings.bio || "Биография ещё не написана."}
          </div>

          {settings.links.length > 0 ? (
            <fieldset className="xp-fieldset">
              <legend className="xp-legend">Ссылки</legend>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {settings.links.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <a
                      className="text-[#0645ad] underline"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}

          <div className="mt-3 text-[10.5px] text-[#6a6a62]">
            Последняя синхронизация с SoundCloud:{" "}
            {settings.lastSyncAt
              ? new Date(settings.lastSyncAt).toLocaleString("ru-RU")
              : "ещё не выполнялась"}
          </div>
        </div>
      </div>
    </div>
  );
}
