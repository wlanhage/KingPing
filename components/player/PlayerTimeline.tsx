import { formatDate } from '@/lib/format';
import type { Theme } from '@/lib/theme';

// Etiketten kommer från temat; emoji och ton är gemensamma.
const EVENT_META: Record<string, { emoji: string; tone: string }> = {
  NEW_KING: { emoji: '👑', tone: 'crown' },
  FIRST_WIN: { emoji: '🌟', tone: 'crown' },
  SAME_KING_STREAK_2: { emoji: '🛡️', tone: 'streak' },
  SAME_KING_STREAK_3: { emoji: '🔥', tone: 'streak' },
  SAME_KING_STREAK_4: { emoji: '🔥', tone: 'streak' },
  SAME_KING_STREAK_5_PLUS: { emoji: '⚡', tone: 'streak' },
  STREAK_BREAK_SMALL: { emoji: '⚔️', tone: 'break' },
  STREAK_BREAK_MEDIUM: { emoji: '⚔️', tone: 'break' },
  STREAK_BREAK_MAJOR: { emoji: '💥', tone: 'break' },
  STREAK_BREAK_LEGENDARY: { emoji: '🌋', tone: 'break' },
  COMEBACK: { emoji: '🔁', tone: 'crown' },
  FRIDAY_FINAL: { emoji: '🍻', tone: 'friday' },
  RECORD_BROKEN: { emoji: '🏆', tone: 'crown' },
};

function metaFor(eventType: string, labels: Record<string, string>) {
  const base = EVENT_META[eventType] ?? { emoji: '🏓', tone: 'crown' };
  return { ...base, label: labels[eventType] ?? eventType };
}

export function PlayerTimeline({ items, copy }: { items: any[]; copy: Theme['profile'] }) {
  return (
    <section className='royal-chronicle-panel'>
      <h2>{copy.timelineTitle}</h2>
      <p className='royal-panel-sub'>{copy.timelineSubtitle}</p>
      {items.length ? (
        <ol className='royal-chronicle'>
          {items.map((item) => {
            const meta = metaFor(item.eventType, copy.events);
            return (
              <li key={item.id} className={`royal-chronicle-item tone-${meta.tone}`}>
                <div className='royal-chronicle-node' aria-hidden>{meta.emoji}</div>
                <div className='royal-chronicle-body'>
                  <div className='royal-chronicle-head'>
                    <span className='royal-chronicle-event'>{meta.label}</span>
                    <span className='royal-chronicle-date'>{formatDate(item.date)}</span>
                  </div>
                  {item.announcementText && <p className='royal-chronicle-text'>{item.announcementText}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className='royal-chronicle-empty'>
          <span aria-hidden>📜</span>
          <p>{copy.timelineEmpty}</p>
        </div>
      )}
    </section>
  );
}
