import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';

// Helper to determine if a player is Demon (or Red Herring, though simplified here)
const isDemon = (character: RoleType | null) => character === 'imp';

export function resolveNightActions(publicState: PublicRoomState, secretState: SecretRoomState) {
  // Create deep copies to avoid mutating original state
  const newPublicState: PublicRoomState = JSON.parse(JSON.stringify(publicState));
  const newSecretState: SecretRoomState = JSON.parse(JSON.stringify(secretState));

  // Reset poisoned status from previous night before applying new ones
  Object.keys(newSecretState.players).forEach(uid => {
    newSecretState.players[uid].isPoisoned = false;
  });

  const actions = newSecretState.nightActions;
  const protectedUids = new Set<string>();

  // Priority 1: Poisoner
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'poisoner' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid && newSecretState.players[action.targetUid]) {
        newSecretState.players[action.targetUid].isPoisoned = true;
      }
    }
  });

  // Priority 2: Monk
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'monk' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) {
        protectedUids.add(action.targetUid);
      }
    }
  });

  // Priority 3: Demon (Imp)
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'imp' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) {
        // If target is not protected by Monk and target is not soldier
        const targetCharacter = newSecretState.players[action.targetUid]?.character;
        if (!protectedUids.has(action.targetUid) && targetCharacter !== 'soldier') {
          newPublicState.players[action.targetUid].isDead = true;
          // Set ghost vote when killed
          newPublicState.players[action.targetUid].hasGhostVote = true;
        }
      }
    }
  });

  // Priority 4: Information roles (Fortune Teller, Empath, etc.)
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    const isMisinformed = player.isPoisoned || player.isDrunk;
    
    if (player.character === 'fortune_teller' && !newPublicState.players[uid].isDead) {
      if (action.targetUid && action.target2Uid) {
        const t1Demon = isDemon(newSecretState.players[action.targetUid]?.character);
        const t2Demon = isDemon(newSecretState.players[action.target2Uid]?.character);
        const realAnswer = t1Demon || t2Demon;
        
        // If poisoned/drunk, flip the answer (simplified auto-ST logic for MVP)
        const finalAnswer = isMisinformed ? !realAnswer : realAnswer;
        
        newSecretState.nightResults[uid] = {
          message: finalAnswer ? 'Yes' : 'No'
        };
      }
    }
  });

  // Clear actions for next night
  newSecretState.nightActions = {};

  return { newPublicState, newSecretState };
}
