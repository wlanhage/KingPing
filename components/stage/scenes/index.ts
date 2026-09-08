import type { Scene, SceneKey } from '../types';
import { temple } from './temple';
import { senate } from './senate';
import { mustafar } from './mustafar';
import { cloudcity } from './cloudcity';
import { tantive } from './tantive';
import { deathstar } from './deathstar';

export const SCENES: Record<SceneKey, Scene> = { temple, senate, mustafar, cloudcity, tantive, deathstar };
export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];
