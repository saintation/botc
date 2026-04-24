import { useAuth } from './hooks/useAuth'
import { STLobby } from './components/game/STLobby'
import { PlayerLobby } from './components/game/PlayerLobby'
import { DayPhase } from './components/game/DayPhase'
import { NightPhase } from './components/game/NightPhase'
import { TownSquare } from './components/game/TownSquare'
import { useGameStore } from './store/gameStore'
import { useGameData } from './hooks/useFirebaseSync'

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
