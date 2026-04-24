import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { DayPhase } from './components/game/DayPhase'
import { NightPhase } from './components/game/NightPhase'
import { TownSquare } from './components/game/TownSquare'
import { useGameStore } from './store/gameStore'
import { useGameData } from './hooks/useFirebaseSync'
import { Button } from './components/ui/Button'

function App() {
  const { user, loading, error: authError } = useAuth()
  const { roomId, roomState, role, setRole, setRoomId } = useGameStore()

  const { error: syncError } = useGameData(roomId)

  const setRoleLocal = (newRole: 'st' | 'player' | null) => {
    setRole(newRole);
  };

  const resetSession = () => {
    setRole(null);
    setRoomId(null);
  };

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
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verifying Identity...</p>
              </div>
            )}

            {(authError || syncError) && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-4 shadow-inner">
                <p className="text-rose-500 text-xs font-bold uppercase tracking-tight mb-2">Sync Connection Lost</p>
                <p className="text-[11px] text-slate-400 mb-4">{authError?.message || syncError?.message}</p>
                <button onClick={resetSession} className="text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">Force Session Wipe</button>
              </div>
            )}
            
            {user && role && roomId && !roomState && (
               <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                  <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sky-400 font-bold text-sm uppercase tracking-widest animate-pulse">Synchronizing Grimoire...</p>
                  <button onClick={resetSession} className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-12 hover:text-white transition-colors">Abort & Reset</button>
               </div>
            )}

            {user && !role && !roomId && (
              <div className="flex flex-col gap-8 mt-2 w-full animate-fade-in">
                <div className="space-y-4">
                  <PlayerLobby />
                </div>

                <div className="pt-6 border-t border-slate-800/30">
                  <button 
                    onClick={() => setRoleLocal('st')}
                    className="text-slate-600 hover:text-amber-500/80 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <span className="opacity-50">ST MODE (ADMIN ONLY)</span>
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
                 <div className="bg-slate-900 border-2 border-amber-500/50 p-10 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center max-w-sm w-full space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
                    <h2 className="text-4xl font-black text-amber-500 uppercase tracking-tighter italic italic-none font-serif">Game Concluded</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">악마가 처형되었거나 마을의 모든 위협이 사라졌습니다.</p>

                    <div className="py-8 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-inner">
                       <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Final Verdict</p>
                       <p className="text-3xl font-black text-white uppercase tracking-widest">Victory</p>
                    </div>

                    <Button onClick={resetSession} variant="primary" size="lg" className="w-full font-black uppercase tracking-widest shadow-xl">New Grimoire</Button>
                 </div>
              </div>
            )}
            </div>          
          {role && (!roomState || roomState.status === 'lobby' || roomState.status === 'setup') && (
            <button 
              onClick={resetSession}
              className="mt-6 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <span>←</span> Change Role
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
