import Desktop from "@/components/Desktop";
import { isAdmin } from "@/lib/auth";
import { getSettings, getTracks } from "@/lib/data";
import { syncFromSoundCloud } from "@/lib/soundcloud";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSettings();
  let tracks = await getTracks(true);

  // first boot: pull the catalogue from SoundCloud automatically
  if (tracks.length === 0) {
    try {
      await syncFromSoundCloud(settings.soundcloudUrl);
      tracks = await getTracks(true);
    } catch {
      tracks = [];
    }
  }

  const admin = await isAdmin();
  const visible = admin ? tracks : tracks.filter((track) => !track.hidden);

  return <Desktop initialSettings={settings} initialTracks={visible} initialAdmin={admin} />;
}
