import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import { resolveNightActions, getNightSuggestions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';
import type { SecretRoomState } from '../../types/game';

export function STNightDashboard() {
  const { roomId, roomState } = useGameStore();
  const { secretState, updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);
  const [loading, setLoading] = useState(false);
  const [tempSecretState, setTempSecretState] = useState<SecretRoomState | null>(null);

  useEffect(() => {
    if (secretState && !tempSecretState) {
      setTempSecretState(JSON.parse(JSON.stringify(secretState)));
    }
  }, [secretState, tempSecretState]);

  if (!roomState || !secretState || !tempSecretState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const totalPlayers = players.length;
  const submittedCount = Object.keys(secretState.nightActions || {}).length;
  const allSubmitted = submittedCount >= totalPlayers;

  const handleUpdateResult = (uid: string, message: string) => {
    setTempSecretState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nightResults: {
          ...(prev.nightResults || {}),
          [uid]: { message }
        }
      };
    });
  };

  const onGenerateSuggestions = () => {
    if (!roomState || !secretState) return;
    const suggestions = getNightSuggestions(roomState, secretState);
    setTempSecretState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nightResults: {
          ...(prev.nightResults || {}),
          ...suggestions
        }
      };
    });
  };

  const handleResolveAndWakeUp = async () => {
    if (!roomId || !tempSecretState) return;
    setLoading(true);

    try {
      const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
      
      newSecretState.nightResults = {
        ...(newSecretState.nightResults || {}),
        ...(tempSecretState.nightResults || {})
      };

      newPublicState.status = 'day';
      await updateSecretState(newSecretState);
      await updatePublicState(newPublicState);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Players who are getting info or made actions
  const actionReport = players.map(p => {
    const s = secretState.players[p.uid];
    const action = secretState.nightActions?.[p.uid];
    const result = tempSecretState.nightResults?.[p.uid]?.message;
    return { p, s, action, result };
  });

  return (
    <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-amber-500/20 shadow-xl text-left w-full max-w-lg backdrop-blur-sm animate-fade-in relative overflow-hidden pb-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <h2 className="text-xl font-black text-amber-500 mb-6 flex items-center gap-2 relative z-10 border-b border-amber-500/10 pb-4 uppercase tracking-tighter">
        <span>📖</span> Grimmoire Management
      </h2>

      <div className="mb-8 relative z-10 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-slate-300 font-bold text-xs uppercase tracking-widest">Player Intelligence</h3>
          <Button variant="outline" size="sm" onClick={onGenerateSuggestions} className="text-[9px] h-6 px-2 border-amber-500/30 text-amber-400 font-black">
             GENERATE SUGGESTIONS
          </Button>
        </div>
        
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {actionReport.map(({ p, s, action, result }) => (
            <div key={p.uid} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 shadow-inner">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300">{p.name} <span className="text-[10px] text-slate-500 font-medium ml-1">({s?.character})</span></span>
                  {action && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Action In</span>}
               </div>
               
               {action && (
                 <div className="text-[10px] text-slate-500 bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
                    Choice: {roomState.players[action.targetUid!]?.name || 'NONE'} {action.target2Uid ? `& ${roomState.players[action.target2Uid]?.name}` : ''}
                 </div>
               )}

               <div className="space-y-1">
                 <p className="text-[9px] font-black text-sky-500 uppercase tracking-tighter ml-1">Message to Player</p>
                 <textarea 
                    value={result || ""}
                    onChange={(e) => handleUpdateResult(p.uid, e.target.value)}
                    placeholder="No info for this player..."
                    className="w-full bg-slate-900 border border-sky-500/20 rounded-lg p-2 text-[11px] text-sky-300 font-medium outline-none focus:border-amber-500 min-h-[50px] custom-scrollbar shadow-inner"
                 />
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 mb-6 relative z-10 shadow-inner">
        <div className="flex justify-between items-center mb-4">
           <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">Waking Up Order</p>
           <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-sky-400">
             {submittedCount} / {totalPlayers} Submissions
           </span>
        </div>
        
        <Button 
          onClick={handleResolveAndWakeUp}
          disabled={!allSubmitted || loading}
          isLoading={loading}
          variant="primary"
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg disabled:bg-slate-800 disabled:text-slate-600 border-transparent uppercase tracking-tight"
        >
          {allSubmitted ? 'Broadcast Results & Dawn' : 'Waiting for Players...'}
        </Button>
      </div>
      
      {!allSubmitted && (
         <Button 
          onClick={handleResolveAndWakeUp}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="w-full text-rose-500/30 hover:text-rose-500 transition-colors text-[9px] font-black"
         >
           FORCE START (IGNORE AFK)
         </Button>
      )}
    </div>
  );
}
