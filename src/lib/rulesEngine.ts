import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';

const isDemon = (character: RoleType | null) => character === 'imp';
const isEvil = (alignment: string | null) => alignment === 'evil';

export function getNightSuggestions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const suggestions: Record<string, { message: string }> = {};
  const { players: secretPlayers, evilInfo } = secretState;
  const { players: pubPlayers, dayNumber, lastExecutedUid } = publicState;
  
  const orderedPubPlayers = Object.values(pubPlayers).sort((a, b) => a.seatIndex - b.seatIndex);

  // Night 1 Special Setup
  if (dayNumber === 1) {
    if (evilInfo) {
       const demonName = pubPlayers[evilInfo.demonUid]?.name;
       const minionNames = evilInfo.minionUids.map(uid => pubPlayers[uid]?.name).join(', ');
       const bluffNames = evilInfo.bluffs.join(', ');
       suggestions[evilInfo.demonUid] = { message: `하수인: ${minionNames || '없음'} | 가짜 직업: ${bluffNames}` };
       evilInfo.minionUids.forEach(uid => {
         suggestions[uid] = { message: `악마: ${demonName}` };
       });
    }

    Object.entries(secretPlayers).forEach(([uid, player]) => {
      if (player.character === 'washerwoman') {
         const townsfolk = Object.entries(secretPlayers).filter(([_, p]) => p.alignment === 'good' && _ !== uid && p.character !== 'drunk' && p.character !== 'washerwoman');
         if (townsfolk.length > 0) {
            const target = townsfolk[Math.floor(Math.random() * townsfolk.length)];
            const decoy = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
      if (player.character === 'librarian') {
         const outsiders = Object.entries(secretPlayers).filter(([_, p]) => p.alignment === 'good' && p.character !== 'drunk' && (p.character === 'butler' || p.character === 'saint' || p.character === 'recluse'));
         if (outsiders.length > 0) {
            const target = outsiders[Math.floor(Math.random() * outsiders.length)];
            const decoy = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         } else {
            suggestions[uid] = { message: "이 게임에 외부인은 없습니다." };
         }
      }
      if (player.character === 'investigator') {
         const minions = Object.entries(secretPlayers).filter(([_, p]) => p.alignment === 'evil' && p.character !== 'imp');
         if (minions.length > 0) {
            const target = minions[Math.floor(Math.random() * minions.length)];
            const decoy = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            suggestions[uid] = { message: `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.` };
         }
      }
      if (player.character === 'chef') {
         let evilPairs = 0;
         for (let i = 0; i < orderedPubPlayers.length; i++) {
            const current = orderedPubPlayers[i];
            const next = orderedPubPlayers[(i + 1) % orderedPubPlayers.length];
            if (isEvil(secretPlayers[current.uid]?.alignment) && isEvil(secretPlayers[next.uid]?.alignment)) evilPairs++;
         }
         suggestions[uid] = { message: `악의 진영 이웃 쌍의 수: ${evilPairs}` };
      }
    });
  }

  // Every Night Actions
  Object.entries(secretPlayers).forEach(([uid, player]) => {
    if (player.character === 'empath' && !pubPlayers[uid]?.isDead) {
       const alivePlayers = orderedPubPlayers.filter(p => !p.isDead || p.uid === uid);
       const myAliveIndex = alivePlayers.findIndex(p => p.uid === uid);
       if (myAliveIndex !== -1) {
          const prev = alivePlayers[(myAliveIndex - 1 + alivePlayers.length) % alivePlayers.length];
          const next = alivePlayers[(myAliveIndex + 1) % alivePlayers.length];
          let evilCount = 0;
          if (isEvil(secretPlayers[prev.uid]?.alignment)) evilCount++;
          if (isEvil(secretPlayers[next.uid]?.alignment)) evilCount++;
          suggestions[uid] = { message: `당신의 양옆에 있는 악마 기운: ${evilCount}` };
       }
    }
    if (player.character === 'undertaker' && !pubPlayers[uid]?.isDead && lastExecutedUid) {
       const executedRole = secretPlayers[lastExecutedUid]?.character;
       suggestions[uid] = { message: `오늘 처형된 자의 정체: ${executedRole}` };
    }
  });

  Object.entries(secretState.nightActions || {}).forEach(([uid, action]) => {
    const player = secretPlayers[uid];
    if (player?.character === 'butler' && action.targetUid) {
       suggestions[uid] = { message: `당신이 선택한 주인: ${pubPlayers[action.targetUid]?.name}` };
    }
    if (player?.character === 'fortune_teller' && action.targetUid && action.target2Uid) {
       const isMisinformed = player.isPoisoned || player.isDrunk;
       const t1Demon = isDemon(secretPlayers[action.targetUid]?.character);
       const t2Demon = isDemon(secretPlayers[action.target2Uid]?.character);
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

  // 1. SCARLET WOMAN CHECK (Scene 6)
  // If Demon died today, check for inheritance before calculating night actions
  const alivePlayers = Object.values(newPublicState.players).filter(p => !p.isDead);
  const imp = Object.entries(newSecretState.players).find(([_, p]) => p.character === 'imp');
  const impUid = imp ? imp[0] : null;
  const isImpDead = impUid ? newPublicState.players[impUid]?.isDead : true;

  if (isImpDead && alivePlayers.length >= 5) {
     const sw = Object.entries(newSecretState.players).find(([_, p]) => p.character === 'scarlet_woman' && !newPublicState.players[_].isDead);
     if (sw) {
        newSecretState.players[sw[0]].character = 'imp';
        alert(`홍등가 여인이 새로운 임프가 되었습니다!`);
     }
  }

  const suggestions = getNightSuggestions(publicState, secretState);
  newSecretState.nightResults = { ...(newSecretState.nightResults || {}), ...suggestions };

  // 2. Night Actions execution
  Object.entries(actions).forEach(([uid, action]) => {
    const player = newSecretState.players[uid];
    if (player.character === 'poisoner' && !player.isPoisoned && !player.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) newSecretState.players[action.targetUid].isPoisoned = true;
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
