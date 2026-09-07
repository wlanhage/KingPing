import type { Clip, ClipKey } from '../types';
import { jackpot, redcarpet, slowmo, strike } from './crowning';
import { hammer, spare, statues, turkey } from './streak';
import { crownflies, gutter, split, sweeper } from './deposed';
import { bumper, dusty, scoreboard } from './special';

export const CLIPS: Record<ClipKey, Clip> = { strike, slowmo, jackpot, redcarpet, spare, turkey, hammer, statues, gutter, crownflies, split, sweeper, bumper, dusty, scoreboard };
export const CLIP_KEYS = Object.keys(CLIPS) as ClipKey[];
