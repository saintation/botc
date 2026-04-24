import { create } from 'zustand';
import type { PublicRoomState, GamePhase } from '../types/game';

interface GameState {
  // 상태
  roomState: PublicRoomState | null;
  roomId: string | null;
  
  // 액션 (Firebase 연동 전 UI 테스트용 또는 로컬 반영용)
  setRoomState: (state: PublicRoomState) => void;
  setRoomId: (id: string) => void;
  nominatePlayer: (targetUid: string, nominatorUid: string) => void;
  updatePhase: (newPhase: GamePhase) => void;
}

// 초기 Mock 상태 (테스트용)
export const initialMockState: PublicRoomState = {
  status: 'lobby',
  dayNumber: 0,
  players: {},
  nominations: null,
};

export const useGameStore = create<GameState>((set) => ({
  roomState: initialMockState,
  roomId: null,

  setRoomState: (state) => set({ roomState: state }),
  
  setRoomId: (id) => set({ roomId: id }),

  nominatePlayer: (targetUid, nominatorUid) => set((state) => {
    if (!state.roomState) return state;
    
    // 단순한 로컬 액션 시뮬레이션 (실제로는 Firebase Hooks에서 서버 업데이트로 처리)
    return {
      roomState: {
        ...state.roomState,
        status: 'voting',
        nominations: {
          [targetUid]: {
            targetUid,
            nominatorUid,
            yesVotes: 0,
            noVotes: 0,
            voters: {},
          }
        }
      }
    };
  }),

  updatePhase: (newPhase) => set((state) => {
    if (!state.roomState) return state;
    return {
      roomState: {
        ...state.roomState,
        status: newPhase,
      }
    };
  }),
}));
