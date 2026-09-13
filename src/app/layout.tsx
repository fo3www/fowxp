import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "fowww.xp — экспериментальная музыка",
  description:
    "Рабочий стол fowww: треки с SoundCloud плиткой, встроенный проигрыватель и панель управления в эстетике Windows XP.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#245edb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
