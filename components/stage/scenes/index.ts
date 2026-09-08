import type { Scene, SceneKey } from '../types';
import { temple } from './temple';

export const SCENES: Record<SceneKey, Scene> = { temple };
export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];
