import { ImageResponse } from 'next/og';
import { getRound } from '@/lib/domain/round';
import { formatDateTime } from '@/lib/format';
import { getTheme } from '@/lib/theme';
import { OG_SIZE, OgFrame, ogFonts } from '@/lib/og/frame';
import { ordinal } from '@/components/stage/rundan';

export const alt = 'Rundan i repris';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Delningsbild för en runda: vinnaren, när, och resten av placeringen. Så blir länken fin i Slack. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  const theme = getTheme(round?.theme);
  const c = theme.colors;
  const players = round?.standings ?? [];
  return new ImageResponse(
    (
      <OgFrame theme={theme}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 8, color: c.muted, textTransform: 'uppercase' }}>Rundan i repris · Jeditemplet</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 84, lineHeight: 1.05, color: c.gold }}>{players[0] ? `👑 ${players[0].name}` : 'Rundan'}</div>
        {round && <div style={{ display: 'flex', marginTop: 14, fontSize: 28, color: c.text, opacity: 0.85 }}>{formatDateTime(round.occurredAt)}</div>}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, fontSize: 30 }}>
          {players.slice(1, 8).map((p, i) => (
            <span key={p.id} style={{ display: 'flex', color: c.text }}><span style={{ color: c.muted, marginRight: 10 }}>{ordinal(i + 2)}</span>{p.name}</span>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts(), emoji: 'twemoji' },
  );
}
