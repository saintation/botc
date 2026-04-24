import type { PublicRoomState, SecretRoomState } from '../types/game';

/**
 * 악마가 사망했을 때 홍등가 여인(Scarlet Woman)이 계승할 수 있는지 체크하고 처리합니다.
 * @returns 계승 성공 여부
 */
export function handleDemonDeath(pub: PublicRoomState, sec: SecretRoomState): boolean {
  const alivePlayers = Object.values(pub.players).filter(p => !p.isDead);
  
  // 룰북: 생존자가 5명 이상일 때만 홍등가 여인이 계승함
  if (alivePlayers.length >= 5) {
    const swEntry = Object.entries(sec.players).find(([uid, p]) => 
      p.character === 'scarlet_woman' && !pub.players[uid]?.isDead
    );

    if (swEntry) {
      const swUid = swEntry[0];
      sec.players[swUid].character = 'imp';
      return true; // 계승 성공
    }
  }
  return false; // 계승 실패 (게임 종료 대상)
}

/**
 * 현재 게임의 승리 조건을 판정합니다.
 */
export function checkWinCondition(pub: PublicRoomState, sec: SecretRoomState): 'good' | 'evil' | null {
  const alivePlayers = Object.values(pub.players).filter(p => !p.isDead);
  const imp = Object.entries(sec.players).find(([uid, p]) => 
    p.character === 'imp' && !pub.players[uid]?.isDead
  );

  // 1. 선의 승리: 악마가 죽고 계승자도 없을 때
  if (!imp) {
    return 'good';
  }

  // 2. 악의 승리: 생존자가 2명만 남았을 때 (악마 포함됨)
  if (alivePlayers.length <= 2) {
    return 'evil';
  }

  return null;
}
