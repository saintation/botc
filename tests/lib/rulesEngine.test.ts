import { describe, it, expect } from 'vitest';
import { resolveNightActions } from '../../src/lib/rulesEngine';
import type { SecretRoomState, PublicRoomState } from '../../src/types/game';

describe('Rules Engine: Trouble Brewing', () => {
  it('should process poisoner -> monk -> demon -> info roles correctly', () => {
    const publicState: PublicRoomState = {
      status: 'night',
      dayNumber: 2,
      players: {
        'p1': { uid: 'p1', name: 'Alice', isDead: false, hasGhostVote: false, seatIndex: 0 }, // Poisoner
        'p2': { uid: 'p2', name: 'Bob', isDead: false, hasGhostVote: false, seatIndex: 1 },   // Monk
        'p3': { uid: 'p3', name: 'Charlie', isDead: false, hasGhostVote: false, seatIndex: 2 }, // Imp
        'p4': { uid: 'p4', name: 'Dave', isDead: false, hasGhostVote: false, seatIndex: 3 },  // Fortune Teller
        'p5': { uid: 'p5', name: 'Eve', isDead: false, hasGhostVote: false, seatIndex: 4 },   // Washerwoman
      },
      nominations: null,
    };

    const secretState: SecretRoomState = {
      stUid: 'st1',
      players: {
        'p1': { character: 'poisoner', alignment: 'evil', isDrunk: false, isPoisoned: false, bluffs: [] },
        'p2': { character: 'monk', alignment: 'good', isDrunk: false, isPoisoned: false, bluffs: [] },
        'p3': { character: 'imp', alignment: 'evil', isDrunk: false, isPoisoned: false, bluffs: ['soldier', 'mayor', 'saint'] },
        'p4': { character: 'fortune_teller', alignment: 'good', isDrunk: false, isPoisoned: false, bluffs: [] },
        'p5': { character: 'washerwoman', alignment: 'good', isDrunk: false, isPoisoned: false, bluffs: [] },
      },
      nightActions: {
        'p1': { targetUid: 'p4', target2Uid: null, status: 'completed' }, // Poisoner targets Fortune Teller
        'p2': { targetUid: 'p5', target2Uid: null, status: 'completed' }, // Monk protects Washerwoman
        'p3': { targetUid: 'p5', target2Uid: null, status: 'completed' }, // Imp attacks Washerwoman
        'p4': { targetUid: 'p3', target2Uid: 'p5', status: 'completed' }, // Fortune Teller checks Imp and Washerwoman
      },
      nightResults: {},
    };

    const { newPublicState, newSecretState } = resolveNightActions(publicState, secretState);

    // 1. Poisoner poisons p4 (Fortune Teller)
    expect(newSecretState.players['p4'].isPoisoned).toBe(true);

    // 2. Monk protects p5 (Washerwoman), Imp attacks p5 -> p5 should NOT be dead
    expect(newPublicState.players['p5'].isDead).toBe(false);

    // 3. Fortune Teller is poisoned, so they should get false info (or arbitrary, we'll simulate 'No' instead of 'Yes')
    // In our simplified engine, we might just return an 'error' or 'arbitrary' message for poisoned/drunk.
    expect(newSecretState.nightResults['p4'].message).toBeDefined();
    // In actual game, ST decides if poisoned FT gets a Yes or No. For our MVP automated engine, 
    // maybe we just flag it so ST can choose, or we auto-generate the wrong answer.
    // Let's assume the engine auto-generates the OPPOSITE answer if poisoned.
    // Imp is demon, Washerwoman is not. Real answer: Yes. Poisoned answer: No.
    expect(newSecretState.nightResults['p4'].message).toContain('No'); 
  });
});
