export type Player = { id: string; username?: string; joinedAt: number; active?: boolean };
export type Team = { id: string; members: Player[] };
export type Pair = { a: Player; b: Player; index: number };
export type PairingMeta = { mode: 'bench' | 'rotate' | 'duplicate'; minSize: number; maxSize: number; duplicatedFrom?: 'A' | 'B' };
export type PairingResult = { pairs: Pair[]; benchA: Player[]; benchB: Player[]; meta: PairingMeta };
export type PairingMode = 'bench' | 'rotate' | 'duplicate';
export type PairingOptions = { round?: number; rotationWindow?: number };

export { pairTeams } from './groupPairing.js';
