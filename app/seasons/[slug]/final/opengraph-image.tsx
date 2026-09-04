import { ImageResponse } from 'next/og';
import { getLeaderboard } from '@/lib/domain/riket';
import { getSeasonBySlug } from '@/lib/domain/season';
import { formatDate } from '@/lib/format';
import { getTheme } from '@/lib/theme';
import { OG_SIZE, OgFrame, ogFonts } from '@/lib/og/frame';

export const alt = 'Krönikan';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Delningsbild för en säsongs krönika: säsongens namn, period och härskare i säsongens tema. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await getSeasonBySlug(slug);
  const theme = getTheme(season?.theme ?? 'realm');
  const ruler = season?.endedAt ? (await getLeaderboard(season))[0]?.name ?? null : null;
  const c = theme.colors;

  return new ImageResponse(
    (
      <OgFrame theme={theme}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 8, color: c.muted, textTransform: 'uppercase' }}>Krönikan · {theme.appName}</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 92, lineHeight: 1.05, color: c.gold }}>{season?.name ?? 'Säsongen'}</div>
        {season && (
          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: c.text, opacity: 0.85 }}>
            {formatDate(season.startedAt)} — {season.endedAt ? formatDate(season.endedAt) : 'pågår'}
          </div>
        )}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        {ruler ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 40 }}>
            <span>👑</span>
            <span style={{ color: c.muted, fontSize: 24, letterSpacing: 6, textTransform: 'uppercase' }}>Säsongens härskare</span>
            <span style={{ color: c.gold }}>{ruler}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 28, color: c.muted }}>Kronans vandring — se hela krönikan</div>
        )}
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts(), emoji: 'twemoji' },
  );
}
