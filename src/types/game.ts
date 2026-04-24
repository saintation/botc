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
  yesVotes: number;
  noVotes: number;
  voters: Record<string, boolean>;
}

export interface PublicRoomState {
  status: GamePhase;
  players: Record<string, PublicPlayer>;
  dayNumber: number;
  nominations: Record<string, Nomination> | null;
  lastExecutedUid?: string | null; 
  highestVotes?: number; // 이번 낮에 나온 최고 득표수
  executionTargetUid?: string | null; // 현재 처형 후보자
}

export interface SecretPlayer {
  character: RoleType | null; 
  fakeCharacter?: RoleType | null; // 취객이 보는 가짜 직업
  alignment: Alignment | null;
  isDrunk: boolean;
  isPoisoned: boolean;
  bluffs: RoleType[]; 
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
  evilInfo?: {
    demonUid: string;
    minionUids: string[];
    bluffs: RoleType[];
  } | null;
}
