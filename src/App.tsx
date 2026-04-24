import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { DayPhase } from './components/game/DayPhase'
import { NightPhase } from './components/game/NightPhase'
import { useGameStore } from './store/gameStore'
import { Button } from './components/ui/Button'

function App() {
  const { user, loading, error } = useAuth()
  const [role, setRole] = useState<'st' | 'player' | null>(null)
  const { roomState } = useGameStore()

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
               <p className="text-sm font-medium text-slate-400">마도서와 연결 중...</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <p className="text-rose-500 text-sm font-medium">연결 오류: {error.message}</p>
            </div>
          )}
          
          {user && !role && !roomState && (
            <div className="flex flex-col gap-4 mt-2 w-full animate-fade-in">
              <p className="text-sm text-slate-400 mb-2">접속 성공! 역할을 선택하세요.</p>
              <Button 
                onClick={() => setRole('st')}
                variant="primary"
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                스토리텔러로 방 만들기
              </Button>
              <Button 
                onClick={() => setRole('player')}
                variant="primary"
                size="lg"
                className="w-full"
              >
                플레이어로 방 참가하기
              </Button>
            </div>
          )}

          {user && role === 'st' && (roomState?.status === 'lobby' || roomState?.status === 'setup' || !roomState) && <STLobby />}
          {user && role === 'player' && (roomState?.status === 'lobby' || roomState?.status === 'setup' || !roomState) && <PlayerLobby />}
          
          {/* Day & Voting Phase */}
          {user && role && isDayPhase && <DayPhase isST={role === 'st'} />}
          
          {/* Night Phase Component */}
          {user && role && isNightPhase && <NightPhase isST={role === 'st'} />}
        </div>
        
        {role && (!roomState?.status) && (
          <button 
            onClick={() => setRole(null)}
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
