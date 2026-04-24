import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { DayPhase } from './components/game/DayPhase'
import { NightPhase } from './components/game/NightPhase'
import { TownSquare } from './components/game/TownSquare'
import { useGameStore } from './store/gameStore'
import { useGameData } from './hooks/useFirebaseSync'
import { Button } from './components/ui/Button'
import { cn } from './lib/utils/cn'

function App() {
  const { user, loading, error: authError } = useAuth()
  const { roomId, roomState, role, setRole, setRoomId } = useGameStore()

  const { error: syncError, resetRoom } = useGameData(roomId)

  const resetSession = () => {
    setRole(null);
    setRoomId(null);
  };

  const handleGlobalReset = async () => {
    if (window.confirm("주의: 방의 모든 기록이 삭제되며 모든 플레이어가 튕겨나갑니다. 정말 초기화하시겠습니까?")) {
       await resetRoom();
       resetSession();
    }
  };

  // Game Phases
  const isDayPhase = roomState?.status === 'day' || roomState?.status === 'voting';
  const isNightPhase = roomState?.status === 'night';
  const gameStarted = roomState && roomState.status !== 'lobby' && roomState.status !== 'setup';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center">
      {/* Persistent Town Square once game starts */}
      {gameStarted && <TownSquare />}

      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 animate-fade-in max-w-lg mx-auto">
        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl w-full flex flex-col items-center border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          {!gameStarted && (
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-sky-600 mb-8 text-center tracking-tighter drop-shadow-sm uppercase">
              BotC Digital Grimmoire
            </h1>
          )}
          
          <div className="text-slate-300 mb-6 text-center w-full">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                 <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">본인 인증 확인 중...</p>
              </div>
            )}

            {(authError || syncError) && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4 shadow-inner">
                <p className="text-rose-500 text-xs font-bold uppercase tracking-tight mb-2">동기화 연결 끊김</p>
                <p className="text-[11px] text-slate-400 mb-4">{authError?.message || syncError?.message}</p>
                <button onClick={resetSession} className="text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">세션 강제 초기화</button>
              </div>
            )}
            
            {user && role && roomId && !roomState && (
               <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                  <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sky-400 font-medium tracking-wide animate-pulse">마도서 기록 복구 중...</p>
                  <button onClick={resetSession} className="text-sm text-slate-400 underline mt-6 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-black">기록 삭제하고 처음으로</button>
               </div>
            )}

            {user && !role && !roomId && (
              <div className="flex flex-col gap-8 mt-2 w-full animate-fade-in">
                <div className="space-y-4">
                  <PlayerLobby />
                </div>

                <div className="pt-6 border-t border-slate-800/30">
                  <button 
                    onClick={() => setRole('st')}
                    className="text-slate-600 hover:text-amber-500/80 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <span className="opacity-50">스토리텔러 관리자 모드</span>
                  </button>
                </div>
              </div>
            )}

            {user && role === 'st' && (!roomState?.status || roomState?.status === 'lobby' || roomState?.status === 'setup') && <STLobby />}
            {user && role === 'player' && roomState && (roomState?.status === 'lobby' || roomState?.status === 'setup') && <PlayerLobby />}
            
            {user && role && isDayPhase && <DayPhase isST={role === 'st'} />}
            {user && role && isNightPhase && <NightPhase isST={role === 'st'} />}

            {/* Victory Screen */}
            {roomState?.status === 'end' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 animate-fade-in">
                 <div className={cn(
                   "bg-slate-900 border-2 p-10 rounded-[3rem] shadow-2xl text-center max-w-sm w-full space-y-8 relative overflow-hidden",
                   roomState.winner === 'good' ? "border-sky-500/50 shadow-sky-500/20" : "border-rose-600/50 shadow-rose-600/20"
                 )}>
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r",
                      roomState.winner === 'good' ? "from-transparent via-sky-400 to-transparent" : "from-transparent via-rose-600 to-transparent"
                    )}></div>
                    
                    <div className="space-y-2">
                       <h2 className={cn(
                         "text-5xl font-black uppercase tracking-tighter italic font-serif leading-none",
                         roomState.winner === 'good' ? "text-sky-400" : "text-rose-600"
                       )}>
                         {roomState.winner === 'good' ? 'Good Wins' : 'Evil Wins'}
                       </h2>
                       <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">게임 종료</p>
                    </div>

                    <div className="py-10 bg-slate-950/50 rounded-[2.5rem] border border-slate-800 shadow-inner px-4">
                       <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
                          {roomState.winner === 'good' 
                            ? "악마가 처단되었습니다. 마을에 다시 평화가 찾아왔습니다." 
                            : "그림자가 마을을 삼켰습니다. 악의 승리입니다."}
                       </p>
                    </div>

                    <Button onClick={resetSession} variant="primary" size="lg" className={cn(
                      "w-full font-black uppercase tracking-widest h-16 shadow-xl border-transparent",
                      roomState.winner === 'good' ? "bg-sky-500 text-slate-950 hover:bg-sky-400" : "bg-rose-600 text-white hover:bg-rose-500"
                    )}>새로운 마도서 시작</Button>
                 </div>
              </div>
            )}
          </div>
          
          {role && (!roomState || roomState.status === 'lobby' || roomState.status === 'setup') && (
            <button 
              onClick={resetSession}
              className="mt-6 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <span>←</span> 역할 변경
            </button>
          )}
        </div>
      </div>

      {/* Admin Reset Button (Nuclear Reset) */}
      {role === 'st' && roomId && (
        <button 
          onClick={handleGlobalReset}
          className="fixed bottom-4 right-4 bg-rose-950/40 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all z-[100] backdrop-blur"
        >
          방 전체 초기화
        </button>
      )}
    </div>
  )
}

export default App
