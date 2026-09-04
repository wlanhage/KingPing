import Link from 'next/link';
import { BadgeIcon } from '@/components/badges/BadgeIcon';
import { BADGES } from '@/lib/badges/badge-definitions';
import { getLeaderboard } from '@/lib/domain/riket';
import { getActiveTheme } from '@/lib/theme/server';
import { themedBadge } from '@/lib/theme';

const RARITY_ORDER = ['mythical', 'legendary', 'epic', 'rare', 'common'] as const;
const RARITY_LABEL: Record<string, string> = {
  mythical: 'Mytiska',
  legendary: 'Legendariska',
  epic: 'Episka',
  rare: 'Sällsynta',
  common: 'Vanliga',
};
const RARITY_TAG: Record<string, string> = {
  mythical: 'Mytisk',
  legendary: 'Legendarisk',
  epic: 'Episk',
  rare: 'Sällsynt',
  common: 'Vanlig',
};

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { theme } = await getActiveTheme();
  return { title: theme.pages.badges.title };
}

export default async function BadgesPage() {
  const { theme } = await getActiveTheme();
  // Namnen kommer från temat; vilka badges som finns är oförändrat.
  const badges = BADGES.map((b) => themedBadge(b, theme));
  // Vilka som bär varje badge just nu. I en ladder syns man bara på steget man står på.
  const owners = new Map<string, { id: string; name: string }[]>();
  for (const row of await getLeaderboard()) {
    for (const earned of row.badges) owners.set(earned.id, [...(owners.get(earned.id) ?? []), { id: row.id, name: row.name }]);
  }
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.badges.title}</h1>
        <p className='subtitle'>{theme.pages.badges.subtitle.replace('{count}', String(badges.length))}</p>
      </section>

      {RARITY_ORDER.map((rarity) => {
        const items = badges.filter((b) => b.rarity === rarity);
        if (!items.length) return null;
        return (
          <section key={rarity} className='badge-codex-group'>
            <h2 className={`badge-codex-title rarity-text-${rarity}`}>
              {RARITY_LABEL[rarity]} <span>· {items.length}</span>
            </h2>
            <div className='badge-codex-grid'>
              {items.map((b) => (
                <article key={b.id} className={`badge-codex-card rarity-accent-${rarity}`}>
                  <div className={`badge-codex-medallion rarity-${rarity}`} aria-hidden><BadgeIcon badge={b} /></div>
                  <div className='badge-codex-body'>
                    <h3 className='badge-codex-name'>{b.name}</h3>
                    <span className={`badge-codex-rarity rarity-text-${rarity}`}>{RARITY_TAG[rarity]}</span>
                    <p className='badge-codex-desc'>{b.description}</p>
                    <div className='badge-codex-owners'>
                      {(owners.get(b.id) ?? []).map((o) => (
                        <Link key={o.id} href={`/players/${o.id}`} className='badge-owner' title={o.name}>{o.name.trim()[0]?.toUpperCase()}</Link>
                      ))}
                      {!owners.get(b.id)?.length && <span className='badge-owner-none'>Ingen bär den ännu</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
