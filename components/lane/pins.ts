import { ballistic, rng } from './anim';
import type { Vec3 } from './types';

/** Käglornas platser: bowlinguppställning med ettan längst fram. */
export const PIN_R = 0.33;
export const PIN_BASE: Vec3[] = [
  [0, PIN_R, -16], [-0.55, PIN_R, -16.55], [0.55, PIN_R, -16.55],
  [-1.1, PIN_R, -17.1], [0, PIN_R, -17.1], [1.1, PIN_R, -17.1],
  [-1.65, PIN_R, -17.65], [-0.55, PIN_R, -17.65], [0.55, PIN_R, -17.65], [1.65, PIN_R, -17.65],
];

/** Var kägla i står `dt` sekunder efter träffen: flyger, studsar, blir liggande. Deterministiskt per kägla. */
export function pinPose(i: number, dt: number, seed = 7, base: Vec3 = PIN_BASE[i]): { position: Vec3; rotation: Vec3 } {
  if (dt <= 0) return { position: base, rotation: [0, 0, 0] };
  const r = rng(seed * 31 + i * 7);
  const vx = (r() - 0.5) * 7 + Math.sign(base[0] || (r() - 0.5)) * 1.5;
  const vz = -2 - r() * 6;
  const vy = 3 + r() * 6;
  const { y, moving } = ballistic(dt, base[1], vy, 20, PIN_R, 0.35);
  const travel = moving ? dt : Math.min(dt, 1.4);
  return { position: [base[0] + vx * travel, y, base[2] + vz * travel], rotation: [dt * 4 * (r() - 0.5), 0, dt * 5 * (r() - 0.5)] };
}
