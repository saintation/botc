import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';

const isDemon = (character: RoleType | null) => character === 'imp';

export function getNightSuggestions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const suggestions: Record<string, { message: string }> = {};
  const { players } = secretState;
  const { players: pubPlayers, dayNumber } = publicState;

  if (dayNumber === 1) {
    Object.entries(players).forEach(([uid, player]) => {
      if (player.character === 'washerwoman') {
         const townsfolk = Object.entries(players).filter(([pUid, p]) => p.alignment === 'good' && pUid !== uid && p.character !== 'drunk');
         if (townsfolk.length > 0) {
            const target = townsfolk[Math.floor(Math.random() * townsfolk.length)];
            const decoy = Object.entries(players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
      if (player.character === 'librarian') {
         const outsiders = Object.entries(players).filter(([_, p]) => p.alignment === 'good' && p.character !== 'drunk' && (p.character === 'butler' || p.character === 'saint' || p.character === 'recluse'));
         if (outsiders.length > 0) {
            const target = outsiders[Math.floor(Math.random() * outsiders.length)];
            const decoy = Object.entries(players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         } else {
            suggestions[uid] = { message: "이 게임에 외부인은 없습니다." };
         }
      }
      if (player.character === 'investigator') {
         const minions = Object.entries(players).filter(([_, p]) => p.alignment === 'evil' && p.character !== 'imp');
         if (minions.length > 0) {
            const target = minions[Math.floor(Math.random() * minions.length)];
            const decoy = Object.entries(players).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
    });
  }

  Object.entries(secretState.nightActions || {}).forEach(([uid, action]) => {
    const player = players[uid];
    if (player?.character === 'butler' && action.targetUid) {
       suggestions[uid] = { message: `당신이 선택한 주인: ${pubPlayers[action.targetUid]?.name}` };
    }
    if (player?.character === 'fortune_teller' && action.targetUid && action.target2Uid) {
       const isMisinformed = player.isPoisoned || player.isDrunk;
       const t1Demon = isDemon(players[action.targetUid]?.character);
       const t2Demon = isDemon(players[action.target2Uid]?.character);
       const realAnswer = t1Demon || t2Demon;
       const finalAnswer = isMisinformed ? (Math.random() > 0.5) : realAnswer;
       suggestions[uid] = { message: finalAnswer ? 'Yes' : 'No' };
    }
  });

  return suggestions;
}

export function resolveNightActions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const newPublicState: PublicRoomState = JSON.parse(JSON.stringify(publicState));
  const newSecretState: SecretRoomState = JSON.parse(JSON.stringify(secretState));

  Object.keys(newSecretState.players).forEach(uid => {
    newSecretState.players[uid].isPoisoned = false;
  });

  const actions = newSecretState.nightActions || {};
  const protectedUids = new Set<string>();

  const suggestions = getNightSuggestions(publicState, secretState);
  newSecretState.nightResults = {
    ...(newSecretState.nightResults || {}),
    ...suggestions
  };

  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'poisoner' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid && newSecretState.players[action.targetUid]) {
        newSecretState.players[action.targetUid].isPoisoned = true;
      }
    }
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'monk' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) protectedUids.add(action.targetUid);
    }
  });

  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'imp' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) {
        const targetChar = newSecretState.players[action.targetUid]?.character;
        if (!protectedUids.has(action.targetUid) && targetChar !== 'soldier' && publicState.dayNumber > 1) {
          newPublicState.players[action.targetUid].isDead = true;
          newPublicState.players[action.targetUid].hasGhostVote = true;
        }
      }
    }
  });

  newSecretState.nightActions = {};
  return { newPublicState, newSecretState };
}
