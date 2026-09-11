import { prisma } from './prisma';

export type AuditAction = 'WIN_RECORDED' | 'PLAYER_CREATED' | 'SEASON_CREATED' | 'SEASON_ROLLED' | 'SEASON_THEME_CHANGED';

/**
 * Riket har ingen inloggning. Aktören är därför YTAN handlingen kom ifrån, inte en person:
 * 'web' = någon i webbgränssnittet, 'cli:namn' = den som körde ett script i terminalen,
 * 'seed' = såddata. Loggen svarar alltså på "vad hände och varifrån", aldrig på "vem av oss".
 */
export type Actor = 'web' | 'seed' | `cli:${string}`;

/**
 * Raden som hamnar i loggboken vid en kröning. Beskriver handlingen, inte utropet:
 * torr och temalös, så att den går att läsa om tio säsonger när temat är ett annat.
 */
export function describeWin(ctx: { winner: string; previousKing?: string | null; streakCount: number }): string {
  if (ctx.previousKing === ctx.winner) return `${ctx.winner} försvarade tronen (${ctx.streakCount} raka).`;
  if (!ctx.previousKing) return `${ctx.winner} tog den tomma tronen.`;
  return `${ctx.winner} tog tronen från ${ctx.previousKing}.`;
}

/**
 * Loggen får aldrig fälla handlingen den beskriver — en kröning som gått igenom ska stå kvar
 * även om logg-raden fallerar. Därför sväljs felet här, och bara här.
 */
export async function audit(action: AuditAction, summary: string, actor: Actor = 'web') {
  try {
    await prisma.auditLog.create({ data: { action, actor, summary } });
  } catch (e) {
    console.error(`Audit-loggning misslyckades (${action}):`, e);
  }
}
