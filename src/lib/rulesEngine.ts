import type { PublicRoomState, SecretRoomState } from '../types/game';
import type { RoleType } from '../types/character';
import { handleDemonDeath, checkWinCondition } from './gameLogic';

const isDemon = (character: RoleType | null) => character === 'imp';
const isEvil = (alignment: string | null) => alignment === 'evil';

export function getNightSuggestions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const suggestions: Record<string, { message: string }> = {};
  const { players: secretPlayers, evilInfo } = secretState;
  const { players: pubPlayers, dayNumber, lastExecutedUid } = publicState;
  const orderedPubPlayers = Object.values(pubPlayers).sort((a, b) => a.seatIndex - b.seatIndex);

  Object.entries(secretPlayers).forEach(([uid, player]) => {
    const isMisinformed = player.isPoisoned || player.isDrunk;
    const effectiveCharacter = player.isDrunk ? player.fakeCharacter : player.character; 
    if (!effectiveCharacter || pubPlayers[uid]?.isDead) return;

    switch (effectiveCharacter) {
      case 'washerwoman':
        if (dayNumber === 1) {
          const townsfolk = Object.entries(secretPlayers).filter(([pUid, p]) => p.alignment === 'good' && pUid !== uid && p.character !== 'drunk');
          if (townsfolk.length > 0) {
            const target = townsfolk[Math.floor(Math.random() * townsfolk.length)];
            const decoy = Object.entries(secretPlayers).filter(([pUid]) => pUid !== uid && pUid !== target[0])[0];
            const msg = isMisinformed 
              ? `${pubPlayers[decoy[0]]?.name} 또는 ${pubPlayers[uid]?.name}(본인) 중 한 명은 세탁부입니다.` 
              : `${pubPlayers[target[0]]?.name} 또는 ${pubPlayers[decoy[0]]?.name} 중 한 명은 ${target[1].character}입니다.`;
            suggestions[uid] = { message: msg };
          }
        }
        break;

      case 'chef':
        if (dayNumber === 1) {
          let evilPairs = 0;
          for (let i = 0; i < orderedPubPlayers.length; i++) {
            const current = orderedPubPlayers[i];
            const next = orderedPubPlayers[(i + 1) % orderedPubPlayers.length];
            if (isEvil(secretPlayers[current.uid]?.alignment) && isEvil(secretPlayers[next.uid]?.alignment)) evilPairs++;
          }
          suggestions[uid] = { message: `악의 진영 이웃 쌍의 수: ${isMisinformed ? (evilPairs + 1) % 3 : evilPairs}` };
        }
        break;

      case 'empath':
        const alivePlayers = orderedPubPlayers.filter(p => !p.isDead || p.uid === uid);
        const myIndex = alivePlayers.findIndex(p => p.uid === uid);
        if (myIndex !== -1) {
          const prevPlayer = alivePlayers[(myIndex - 1 + alivePlayers.length) % alivePlayers.length];
          const nextPlayer = alivePlayers[(myIndex + 1) % alivePlayers.length];
          let evilCount = 0;
          if (isEvil(secretPlayers[prevPlayer.uid]?.alignment)) evilCount++;
          if (isEvil(secretPlayers[nextPlayer.uid]?.alignment)) evilCount++;
          suggestions[uid] = { message: `당신의 양옆에 있는 악마 기운: ${isMisinformed ? (evilCount === 0 ? 1 : 0) : evilCount}` };
        }
        break;

      case 'undertaker':
        if (lastExecutedUid) {
          const realRole = secretPlayers[lastExecutedUid]?.character;
          const fakeRoles: RoleType[] = ['imp', 'poisoner', 'fortune_teller', 'mayor'];
          suggestions[uid] = { message: `오늘 처형된 자의 정체: ${isMisinformed ? fakeRoles[Math.floor(Math.random() * fakeRoles.length)] : realRole}` };
        }
        break;

      case 'fortune_teller':
        const action = secretState.nightActions?.[uid];
        if (action?.targetUid && action?.target2Uid) {
          const isT1Evil = isDemon(secretPlayers[action.targetUid]?.character) || secretPlayers[action.targetUid]?.isRedHerring;
          const isT2Evil = isDemon(secretPlayers[action.target2Uid]?.character) || secretPlayers[action.target2Uid]?.isRedHerring;
          const realAnswer = isT1Evil || isT2Evil;
          suggestions[uid] = { message: (isMisinformed ? !realAnswer : realAnswer) ? 'Yes' : 'No' };
        }
        break;
    }
  });

  if (dayNumber === 1 && evilInfo) {
    const minionNames = evilInfo.minionUids.map(u => pubPlayers[u]?.name).join(', ');
    suggestions[evilInfo.demonUid] = { message: `[악마 정보] 하수인: ${minionNames || '없음'} | 가짜직업: ${evilInfo.bluffs.join(', ')}` };
    evilInfo.minionUids.forEach(mUid => {
      suggestions[mUid] = { message: `[하수인 정보] 악마: ${pubPlayers[evilInfo.demonUid]?.name}` };
    });
  }

  return suggestions;
}

export function resolveNightActions(publicState: PublicRoomState, secretState: SecretRoomState) {
  const newPublicState: PublicRoomState = JSON.parse(JSON.stringify(publicState));
  const newSecretState: SecretRoomState = JSON.parse(JSON.stringify(secretState));
  const actions = newSecretState.nightActions || {};
  const protectedUids = new Set<string>();

  // 1. 상태 리셋
  Object.keys(newSecretState.players).forEach(uid => {
    newSecretState.players[uid].isPoisoned = false;
  });

  // 2. 밤의 액션 처리 (공식 순서)
  // Priority: Poisoner
  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'poisoner' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) newSecretState.players[action.targetUid].isPoisoned = true;
    }
  });

  // Priority: Monk
  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'monk' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead) {
      if (action.targetUid) protectedUids.add(action.targetUid);
    }
  });

  // Priority: Imp
  Object.entries(actions).forEach(([uid, action]) => {
    const p = newSecretState.players[uid];
    if (p.character === 'imp' && !p.isPoisoned && !p.isDrunk && !newPublicState.players[uid].isDead && publicState.dayNumber > 1) {
      if (action.targetUid && !protectedUids.has(action.targetUid)) {
        const targetSecret = newSecretState.players[action.targetUid];
        if (targetSecret?.character !== 'soldier') {
          newPublicState.players[action.targetUid].isDead = true;
          newPublicState.players[action.targetUid].hasGhostVote = true;
        }
      }
    }
  });

  // 3. 악마 계승 체크 (Imp 사망 여부 확인)
  const impEntry = Object.entries(newSecretState.players).find(([_, p]) => p.character === 'imp');
  if (impEntry && newPublicState.players[impEntry[0]]?.isDead) {
     handleDemonDeath(newPublicState, newSecretState);
  }

  // 4. 승리 조건 체크
  const winner = checkWinCondition(newPublicState, newSecretState);
  if (winner) {
    newPublicState.status = 'end';
    newPublicState.winner = winner;
  }

  const suggestions = getNightSuggestions(publicState, secretState);
  newSecretState.nightResults = { ...(newSecretState.nightResults || {}), ...suggestions };

  newSecretState.nightActions = {};
  return { newPublicState, newSecretState };
}
