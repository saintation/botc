import type { Alignment, RoleType } from './character';

export type GamePhase = 'lobby' | 'setup' | 'night' | 'day' | 'voting' | 'end';

export interface PublicPlayer {
  uid: string;
  name: string;
  isDead: boolean;
  hasGhostVote: boolean;
  seatIndex: number;
}

export interface Nomination {
  targetUid: string;
  nominatorUid: string;
  yesVotes: number; // 찬성 투표 수
  noVotes: number; // 반대 투표 수 (옵셔널이거나 불필요할 수도 있음)
  voters: Record<string, boolean>; // uid -> 찬성 여부
}

export interface PublicRoomState {
  status: GamePhase;
  players: Record<string, PublicPlayer>;
  dayNumber: number;
  nominations: Record<string, Nomination> | null; // 현재 지목 상태
  lastExecutedUid?: string | null; // 어제 처형된 사람
}

export interface SecretPlayer {
  character: RoleType | null; // 아직 배정 안되었을 수 있음
  alignment: Alignment | null;
  isDrunk: boolean;
  isPoisoned: boolean;
  bluffs: RoleType[]; // 악마에게 주어지는 3개의 가짜 직업
}

export interface NightAction {
  targetUid: string | null;
  target2Uid: string | null;
  status: 'pending' | 'completed';
}

export interface NightResult {
  message: string;
}

export interface SecretRoomState {
  stUid: string;
  players: Record<string, SecretPlayer>;
  nightActions: Record<string, NightAction>;
  nightResults: Record<string, NightResult>;
}
