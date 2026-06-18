import { formatDate } from '@/lib/format';

const EVENT_META: Record<string, { label: string; emoji: string; tone: string }> = {
  NEW_KING: { label: 'Ny kung krönt', emoji: '👑', tone: 'crown' },
  FIRST_WIN: { label: 'Första vinsten', emoji: '🌟', tone: 'crown' },
  SAME_KING_STREAK_2: { label: 'Försvarade tronen (x2)', emoji: '🛡️', tone: 'streak' },
  SAME_KING_STREAK_3: { label: 'Dynasti byggs (x3)', emoji: '🔥', tone: 'streak' },
  SAME_KING_STREAK_4: { label: 'Järngrepp (x4)', emoji: '🔥', tone: 'streak' },
  SAME_KING_STREAK_5_PLUS: { label: 'Tyranni (x5+)', emoji: '⚡', tone: 'streak' },
  STREAK_BREAK_SMALL: { label: 'Bröt en liten streak', emoji: '⚔️', tone: 'break' },
  STREAK_BREAK_MEDIUM: { label: 'Bröt en streak', emoji: '⚔️', tone: 'break' },
  STREAK_BREAK_MAJOR: { label: 'Störtade en dynasti', emoji: '💥', tone: 'break' },
  STREAK_BREAK_LEGENDARY: { label: 'Legendariskt störtande', emoji: '🌋', tone: 'break' },
  COMEBACK: { label: 'Comeback', emoji: '🔁', tone: 'crown' },
  FRIDAY_FINAL: { label: 'Fredagsfinal', emoji: '🍻', tone: 'friday' },
  RECORD_BROKEN: { label: 'Rekord slaget', emoji: '🏆', tone: 'crown' },
};

function metaFor(eventType: string) {
  return EVENT_META[eventType] ?? { label: eventType, emoji: '🏓', tone: 'crown' };
}

export function PlayerTimeline({ items }: { items: any[] }) {
  return (
    <section className='royal-chronicle-panel'>
      <h2>Kungakrönika</h2>
      <p className='royal-panel-sub'>Spelarens väg genom riket, senaste först.</p>
      {items.length ? (
        <ol className='royal-chronicle'>
          {items.map((item) => {
            const meta = metaFor(item.eventType);
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
          <p>Ingen historik ännu — krönikan väntar på sitt första kapitel.</p>
        </div>
      )}
    </section>
  );
}
