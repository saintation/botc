import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { resolveNightActions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { useState, useEffect } from 'react';

export function STNightDashboard() {
  const { roomId, roomState } = useGameStore();
  const { secretState } = useSecretData(roomId, true);
  const [editedSuggestions, setEditedSuggestions] = useState<Record<string, string>>({});
  const [pendingDeaths, setPendingDeaths] = useState<string[]>([]);

  useEffect(() => {
    if (secretState?.nightResults) {
      const results: Record<string, string> = {};
      Object.entries(secretState.nightResults).forEach(([uid, res]) => {
        results[uid] = res.message;
      });
      setEditedSuggestions(results);
    }
    
    // Initial simulation of deaths
    if (roomState && secretState) {
       const { newPublicState } = resolveNightActions(roomState, secretState);
       const deaths = Object.keys(newPublicState.players).filter(uid => 
          newPublicState.players[uid].isDead && !roomState.players[uid].isDead
       );
       setPendingDeaths(deaths);
    }
  }, [secretState?.nightResults, roomState, secretState]);

  if (!roomState || !secretState) return null;

  const handleUpdateSuggestion = (uid: string, msg: string) => {
    setEditedSuggestions(prev => ({ ...prev, [uid]: msg }));
  };

  const toggleDeath = (uid: string) => {
    setPendingDeaths(prev => 
       prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const finalizeNight = async () => {
    const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
    
    // Override messages with ST edits
    Object.entries(editedSuggestions).forEach(([uid, msg]) => {
       newSecretState.players[uid].messageHistory = [
          ...(newSecretState.players[uid].messageHistory || []),
          msg
       ];
    });

    // Override deaths with ST edits (Manual Override for Mayor/Soldier etc)
    Object.keys(newPublicState.players).forEach(uid => {
       const wasDeadBefore = roomState.players[uid].isDead;
       if (!wasDeadBefore) {
          const shouldBeDead = pendingDeaths.includes(uid);
          newPublicState.players[uid].isDead = shouldBeDead;
          if (shouldBeDead) newPublicState.players[uid].hasGhostVote = true;
       }
    });

    newPublicState.status = 'day';
    newSecretState.nightResults = {};
    newSecretState.nightActions = {};

    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}`] = newPublicState;
    updates[`secret/rooms/${roomId}`] = newSecretState;
    await update(ref(database), updates);
  };

  const actions = secretState.nightActions || {};
  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);

  return (
    <div className="w-full space-y-8 animate-fade-in pb-10">
      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">실시간 밤 행동 모니터링</h3>
         <div className="space-y-3">
            {players.filter(p => !p.isDead).map(p => {
               const action = actions[p.uid];
               const role = secretState.players[p.uid]?.character;
               if (!['imp', 'poisoner', 'monk', 'fortune_teller', 'butler'].includes(role || '')) return null;
               
               return (
                 <div key={p.uid} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-bold">{getRoleName(role)}</span>
                       <span className="text-xs font-black text-slate-300">{p.name}</span>
                    </div>
                    <div className="text-right">
                       {action?.status === 'completed' ? (
                          <span className="text-[10px] text-sky-400 font-black bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                             선택: {roomState.players[action.targetUid || '']?.name || '없음'}
                             {action.target2Uid && `, ${roomState.players[action.target2Uid]?.name}`}
                          </span>
                       ) : (
                          <span className="text-[10px] text-slate-600 font-black animate-pulse">대기 중...</span>
                       )}
                    </div>
                 </div>
               );
            })}
         </div>
      </div>

      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">사망자 최종 확정</h3>
         <div className="flex flex-wrap gap-2 mb-6">
            {players.map(p => (
               <button
                 key={p.uid}
                 onClick={() => toggleDeath(p.uid)}
                 disabled={roomState.players[p.uid].isDead}
                 className={cn(
                   "px-3 py-2 rounded-xl text-[10px] font-black border transition-all",
                   pendingDeaths.includes(p.uid) 
                    ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-900/40" 
                    : "bg-slate-950 border-slate-800 text-slate-500 opacity-60",
                   roomState.players[p.uid].isDead && "hidden"
                 )}
               >
                  {p.name} {pendingDeaths.includes(p.uid) ? '사망' : '생존'}
               </button>
            ))}
         </div>
         <p className="text-[9px] text-slate-600 leading-relaxed italic">
            * 붉은색 플레이어가 내일 아침 사망자로 발표됩니다. 시장의 능력이 발동했다면 여기서 직접 대상을 변경하세요.
         </p>
      </div>

      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">플레이어 정보 제공 (편집 가능)</h3>
         <div className="space-y-4">
            {Object.entries(editedSuggestions).map(([uid, msg]) => (
               <div key={uid} className="space-y-2">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-sky-500">{roomState.players[uid]?.name} ({getRoleName(secretState.players[uid]?.character)})</span>
                     {secretState.players[uid]?.isPoisoned && <span className="text-[8px] bg-purple-600 text-white px-1.5 rounded-full font-black">독</span>}
                     {secretState.players[uid]?.isDrunk && <span className="text-[8px] bg-amber-600 text-slate-950 px-1.5 rounded-full font-black">취함</span>}
                  </div>
                  <textarea
                    value={msg}
                    onChange={(e) => handleUpdateSuggestion(uid, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:border-sky-500 outline-none min-h-[60px] custom-scrollbar"
                  />
               </div>
            ))}
         </div>
      </div>

      <Button onClick={finalizeNight} variant="primary" size="lg" className="w-full h-20 font-black uppercase tracking-[0.3em] text-xl shadow-2xl shadow-sky-950/40">
         마을 깨우기 (해 뜨는 중)
      </Button>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
