import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';

// Helper to determine if a player is Demon (or Red Herring)
const isDemon = (character: RoleType | null) => character === 'imp';

export function resolveNightActions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const newPublicState: PublicRoomState = JSON.parse(JSON.stringify(publicState));
  const newSecretState: SecretRoomState = JSON.parse(JSON.stringify(secretState));

  // Reset transient statuses
  Object.keys(newSecretState.players).forEach(uid => {
    newSecretState.players[uid].isPoisoned = false;
  });

  const actions = newSecretState.nightActions;
  const protectedUids = new Set<string>();

  // Night 1 Special Setup (Start of game roles)
  if (publicState.dayNumber === 1) {
    Object.entries(newSecretState.players).forEach(([uid, player]) => {
      if (player.character === 'washerwoman') {
         // Washerwoman sees one of two people is a specific Townsfolk
         const townsfolk = Object.entries(newSecretState.players).filter(([pUid, p]) => p.alignment === 'good' && pUid !== uid && p.character !== 'drunk');
         if (townsfolk.length > 0) {
            const target = townsfolk[Math.floor(Math.random() * townsfolk.length)];
            const decoy = Object.entries(newSecretState.players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            newSecretState.nightResults[uid] = { message: `${newPublicState.players[target[0]].name} 또는 ${newPublicState.players[decoy[0]].name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
      if (player.character === 'librarian') {
         // Librarian sees one of two people is a specific Outsider
         const outsiders = Object.entries(newSecretState.players).filter(([pUid, p]) => p.alignment === 'good' && p.character !== 'drunk' && (p.character === 'butler' || p.character === 'saint' || p.character === 'recluse'));
         if (outsiders.length > 0) {
            const target = outsiders[Math.floor(Math.random() * outsiders.length)];
            const decoy = Object.entries(newSecretState.players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            newSecretState.nightResults[uid] = { message: `${newPublicState.players[target[0]].name} 또는 ${newPublicState.players[decoy[0]].name} 중 한 명은 ${target[1].character}입니다.` };
         } else {
            newSecretState.nightResults[uid] = { message: "이 게임에 외부인은 없습니다." };
         }
      }
      if (player.character === 'investigator') {
         // Investigator sees one of two people is a specific Minion
         const minions = Object.entries(newSecretState.players).filter(([pUid, p]) => p.alignment === 'evil' && p.character !== 'imp');
         if (minions.length > 0) {
            const target = minions[Math.floor(Math.random() * minions.length)];
            const decoy = Object.entries(newSecretState.players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            newSecretState.nightResults[uid] = { message: `${newPublicState.players[target[0]].name} 또는 ${newPublicState.players[decoy[0]].name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
    });
  }

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
        const targetCharacter = newSecretState.players[action.targetUid]?.character;
        if (!protectedUids.has(action.targetUid) && targetCharacter !== 'soldier' && publicState.dayNumber > 1) {
          newPublicState.players[action.targetUid].isDead = true;
          newPublicState.players[action.targetUid].hasGhostVote = true;
        }
      }
    }
  });

  // Priority 4: Information roles
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    const isMisinformed = player.isPoisoned || player.isDrunk;
    
    if (player.character === 'fortune_teller' && !newPublicState.players[uid].isDead) {
      if (action.targetUid && action.target2Uid) {
        const t1Demon = isDemon(newSecretState.players[action.targetUid]?.character);
        const t2Demon = isDemon(newSecretState.players[action.target2Uid]?.character);
        const realAnswer = t1Demon || t2Demon;
        const finalAnswer = isMisinformed ? (Math.random() > 0.5) : realAnswer; // Truly arbitrary if poisoned
        newSecretState.nightResults[uid] = { message: finalAnswer ? 'Yes' : 'No' };
      }
    }

    if (player.character === 'butler' && !newPublicState.players[uid].isDead) {
       if (action.targetUid) {
          newSecretState.nightResults[uid] = { message: `당신이 선택한 주인: ${newPublicState.players[action.targetUid].name}` };
       }
    }
  });

  newSecretState.nightActions = {};
  return { newPublicState, newSecretState };
}
