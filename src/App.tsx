import { useState as setRoleState } from 'react'
import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { DayPhase } from './components/game/DayPhase'
import { NightPhase } from './components/game/NightPhase'
import { useGameStore } from './store/gameStore'
import { useGameData } from './hooks/useFirebaseSync'

function App() {
  const { user, loading, error: authError } = useAuth()
  const { roomId, roomState, setRoomId } = useGameStore()
  const [role, setRoleLocal] = setRoleState<'st' | 'player' | null>(localStorage.getItem('botc_role') as 'st' | 'player')

  // Core Sync: Listen for game data whenever roomId is present
  const { error: syncError } = useGameData(roomId)

  const setRole = (newRole: 'st' | 'player' | null) => {
    if (newRole) localStorage.setItem('botc_role', newRole);
    else localStorage.removeItem('botc_role');
    setRoleLocal(newRole);
  };

  const resetSession = () => {
    setRole(null);
    setRoomId(null);
  };

  // Game Phases
  const isDayPhase = roomState?.status === 'day' || roomState?.status === 'voting';
  const isNightPhase = roomState?.status === 'night';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center border border-slate-800/80 backdrop-blur-sm">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-sky-600 mb-8 text-center tracking-tight drop-shadow-sm">
          BotC Digital Grimoire
        </h1>
        
        <div className="text-slate-300 mb-6 text-center w-full">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
               <svg className="animate-spin h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <p className="text-sm font-medium text-slate-400">인증 확인 중...</p>
            </div>
          )}

          {(authError || syncError) && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4">
              <p className="text-rose-500 text-sm font-medium">연결 오류: {authError?.message || syncError?.message}</p>
              <button onClick={resetSession} className="text-xs text-rose-400 underline mt-2">강제 초기화 후 메인으로</button>
            </div>
          )}
          
          {user && role && roomId && !roomState && (
             <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sky-400 font-medium tracking-wide animate-pulse">마도서 기록 복구 중...</p>
                <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">네트워크 상태가 좋지 않거나 방이 사라졌을 수 있습니다.</p>
                <button onClick={resetSession} className="text-sm text-slate-400 underline mt-6 hover:text-white transition-colors">기록 삭제하고 처음으로 돌아가기</button>
             </div>
          )}

          {user && !role && !roomState && !roomId && (
            <div className="flex flex-col gap-8 mt-2 w-full animate-fade-in">
              <div className="space-y-4">
                <PlayerLobby />
              </div>
              <div className="pt-6 border-t border-slate-800/50">
                <button 
                  onClick={() => setRole('st')}
                  className="text-slate-500 hover:text-amber-400/80 text-xs font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <span>⚙️</span>
                  <span>스토리텔러 전용 관리자 모드</span>
                </button>
              </div>
            </div>
          )}

          {user && role === 'st' && (roomState?.status === 'lobby' || roomState?.status === 'setup' || !roomState) && <STLobby />}
          {user && role === 'player' && roomState && (roomState?.status === 'lobby' || roomState?.status === 'setup') && <PlayerLobby />}
          
          {/* Day & Voting Phase */}
          {user && role && isDayPhase && <DayPhase isST={role === 'st'} />}
          
          {/* Night Phase Component */}
          {user && role && isNightPhase && <NightPhase isST={role === 'st'} />}
        </div>
        
        {role && (!roomState?.status) && (
          <button 
            onClick={resetSession}
            className="mt-6 text-slate-500 text-sm hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <span>←</span> 역할 다시 선택하기
          </button>
        )}
      </div>
    </div>
  )
}

export default App
