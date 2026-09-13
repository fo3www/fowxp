import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  scId: text("sc_id").notNull().unique(),
  title: text("title").notNull(),
  permalinkUrl: text("permalink_url").notNull(),
  artworkUrl: text("artwork_url"),
  description: text("description"),
  genre: text("genre"),
  duration: integer("duration").notNull().default(0),
  playbackCount: integer("playback_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  pinned: boolean("pinned").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  note: text("note"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteLink = {
  label: string;
  url: string;
};

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  artistName: text("artist_name").notNull().default("fowww"),
  tagline: text("tagline").notNull().default("экспериментальная музыка / звукосодержащий продукт"),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  bannerUrl: text("banner_url").notNull().default(""),
  wallpaperUrl: text("wallpaper_url").notNull().default(""),
  soundcloudUrl: text("soundcloud_url").notNull().default("https://soundcloud.com/fowwww"),
  marquee: text("marquee").notNull().default("fowww // new tracks loading..."),
  links: jsonb("links").$type<SiteLink[]>().notNull().default([]),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrackRow = typeof tracks.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
