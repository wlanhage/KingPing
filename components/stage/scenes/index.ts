import type { Scene, SceneKey } from '../types';
import { temple } from './temple';
import { mustafar } from './mustafar';

export const SCENES: Record<SceneKey, Scene> = { temple, mustafar };
export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];
