import { fridayIntros, nationIntros, streakTemplates } from '../../copy/templates';
import type { Theme } from '../theme-types';

/** Ursprungstemat: svenskt medeltidsrike. Färgerna speglar :root i globals.css. */
export const realm: Theme = {
  key: 'realm',
  appName: 'Rundpingisriket',
  tagline: 'Tronen, riddarna och kröningarna i kontorets pingisrike.',
  nav: {
    home: 'Tronsalen',
    leaderboard: 'Rikets främsta',
    history: 'Krönikan',
    players: 'Riddare',
    badges: 'Utmärkelser',
    settings: 'Rådet',
  },
  pages: {
    home: { title: 'Tronsalen', subtitle: 'Vem härskar över riket — och vem vågar utmana?' },
    leaderboard: { title: 'Rikets främsta', subtitle: 'Rankat efter total tid på tronen.' },
    history: { title: 'Historik', subtitle: 'De senaste 50 händelserna i riket.' },
    players: { title: 'Riddare', subtitle: 'Rikets utmanare. Klicka in på en riddare för full profil.' },
    badges: { title: 'Utmärkelser', subtitle: 'Alla {count} bragder en riddare kan förtjäna i riket.' },
    settings: { title: 'Rådet', subtitle: 'Miljöstatus för integrationer.' },
  },
  epithets: { rank1: 'Kejsaren', rank2: 'Kronprinsen', rank3: 'Rikets tredje kraft' },
  roles: { monarch: 'Kung', monarchLower: 'kung', challenger: 'Utmanare', player: 'riddare', players: 'Riddare' },
  verbs: { crown: 'Kröna', crowning: 'kröning' },
  badgeOverrides: {},
  announcements: { streakTemplates, nationIntros, fridayIntros },
  colors: {
    bg: '#120d08',
    panel: '#1e1810',
    panelSoft: '#271f15',
    text: '#f1e3c6',
    muted: '#b29a72',
    accent: '#c9a227',
    accent2: '#8a2b22',
    border: '#4b3a1f',
    gold: '#e7c25c',
  },
};
