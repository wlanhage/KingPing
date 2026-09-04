import { ImageResponse } from 'next/og';
import { getPlayerProfile } from '@/lib/domain/riket';
import { formatDuration } from '@/lib/format';
import { themedBadge } from '@/lib/theme';
import { getActiveTheme } from '@/lib/theme/server';
import { OG_SIZE, OgFrame, ogFonts } from '@/lib/og/frame';
import { siteUrl } from '@/lib/site-url';

export const alt = 'Spelarprofil';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Delningsbild för en spelare: initial, namn, nyckeltal och de tre finaste utmärkelserna. */
export default async function Image({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const { theme } = await getActiveTheme();
  const profile = await getPlayerProfile(playerId);
  const c = theme.colors;
  const name = profile?.player.name ?? 'Okänd riddare';
  const s = profile?.stats;
  const badges = (s?.badges ?? []).slice(0, 3).map((b) => themedBadge(b.definition, theme));
  const stats = s ? [
    ['Placering', s.currentRankByThroneTime ? `#${s.currentRankByThroneTime}` : '–'],
    ['Vinster', String(s.totalWins)],
    ['Trontid', formatDuration(s.totalReignMs)],
    ['Längsta streak', String(s.longestStreak)],
  ] : [];

  return new ImageResponse(
    (
      <OgFrame theme={theme}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 190, height: 190, borderRadius: 999, border: `4px solid ${c.gold}`, background: c.panel, fontSize: 96, color: c.gold }}>
            {name.trim()[0]?.toUpperCase() ?? '–'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, letterSpacing: 8, color: c.muted, textTransform: 'uppercase' }}>{theme.appName}</div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: 84, lineHeight: 1.05, color: c.gold }}>{name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, marginTop: 44 }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', padding: '18px 26px', border: `1px solid ${c.border}`, borderRadius: 16, background: c.panel, minWidth: 200 }}>
              <span style={{ fontSize: 20, letterSpacing: 4, color: c.muted, textTransform: 'uppercase' }}>{label}</span>
              <span style={{ marginTop: 6, fontSize: 40, color: c.text }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: 34, alignItems: 'center', fontSize: 28, color: c.text }}>
            {badges.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {b.icon ? <img src={new URL(b.icon, siteUrl()).toString()} width={44} height={44} style={{ borderRadius: 999 }} alt='' /> : <span style={{ fontSize: 36 }}>{b.emoji}</span>}
                <span>{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts(), emoji: 'twemoji' },
  );
}
