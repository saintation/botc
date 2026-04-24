import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { resolveNightActions, getNightSuggestions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { useState, useEffect } from 'react';

export function STNightDashboard() {
  const { roomId, roomState } = useGameStore();
  const { secretState } = useSecretData(roomId, true);
  
  // 모든 플레이어에 대한 메시지 상태 관리
  const [editedSuggestions, setEditedSuggestions] = useState<Record<string, string>>({});
  const [pendingDeaths, setPendingDeaths] = useState<string[]>([]);

  useEffect(() => {
    // 초기 로딩 시 기존 정보가 있다면 세팅
    if (secretState?.nightResults) {
      const results: Record<string, string> = {};
      Object.entries(secretState.nightResults).forEach(([uid, res]) => {
        results[uid] = res.message;
      });
      setEditedSuggestions(prev => ({ ...results, ...prev }));
    }
    
    // 사망 예정자 시뮬레이션
    if (roomState && secretState) {
       const { newPublicState } = resolveNightActions(roomState, secretState);
       const deaths = Object.keys(newPublicState.players).filter(uid => 
          newPublicState.players[uid].isDead && !roomState.players[uid].isDead
       );
       setPendingDeaths(deaths);
    }
  }, [roomState, secretState]);

  if (!roomState || !secretState) return null;

  const handleUpdateSuggestion = (uid: string, msg: string) => {
    setEditedSuggestions(prev => ({ ...prev, [uid]: msg }));
  };

  const generateAutoSuggestions = () => {
     const suggestions = getNightSuggestions(roomState, secretState);
     const newEdits: Record<string, string> = { ...editedSuggestions };
     Object.entries(suggestions).forEach(([uid, res]) => {
        newEdits[uid] = res.message;
     });
     setEditedSuggestions(newEdits);
  };

  const toggleDeath = (uid: string) => {
    setPendingDeaths(prev => 
       prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const finalizeNight = async () => {
    const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
    
    // 모든 입력된 메시지를 히스토리에 반영
    Object.entries(editedSuggestions).forEach(([uid, msg]) => {
       if (msg.trim()) {
          newSecretState.players[uid].messageHistory = [
             ...(newSecretState.players[uid].messageHistory || []),
             msg
          ];
       }
    });

    // 사망자 직접 확정 반영
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
    <div className="w-full space-y-8 animate-fade-in pb-20">
      {/* 1. 행동 모니터링 */}
      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">실시간 밤 행동 모니터링</h3>
         <div className="space-y-3">
            {players.filter(p => !p.isDead).map(p => {
               const action = actions[p.uid];
               const role = secretState.players[p.uid]?.character;
               const roleName = getRoleName(role);
               
               return (
                 <div key={p.uid} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-500 font-bold">{roleName}</span>
                       <span className="text-xs font-black text-slate-300">{p.name}</span>
                    </div>
                    <div className="text-right">
                       {action?.status === 'completed' ? (
                          <span className="text-[10px] text-sky-400 font-black bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                             {roomState.players[action.targetUid || '']?.name || '완료'}
                             {action.target2Uid && `, ${roomState.players[action.target2Uid]?.name}`}
                          </span>
                       ) : (
                          <span className="text-[10px] text-slate-600 font-black animate-pulse italic">생각 중...</span>
                       )}
                    </div>
                 </div>
               );
            })}
         </div>
      </div>

      {/* 2. 사망자 확정 */}
      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-3">사망자 최종 확정</h3>
         <div className="flex flex-wrap gap-2 mb-4">
            {players.map(p => (
               <button
                 key={p.uid}
                 onClick={() => toggleDeath(p.uid)}
                 className={cn(
                   "px-3 py-2 rounded-xl text-[10px] font-black border transition-all",
                   p.isDead ? "hidden" : (
                      pendingDeaths.includes(p.uid)
                      ? "bg-rose-600 border-rose-400 text-white shadow-lg"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                   )
                 )}
               >
                  {p.name} {pendingDeaths.includes(p.uid) ? '사망' : '생존'}
               </button>
            ))}
         </div>
         <p className="text-[9px] text-slate-600 italic">* 붉은색 플레이어가 아침에 사망자로 발표됩니다.</p>
      </div>

      {/* 3. 개별 메시지 전송 */}
      <div className="bg-slate-900/90 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
         <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">플레이어 정보 전송</h3>
            <button 
               onClick={generateAutoSuggestions}
               className="text-[9px] font-black bg-sky-500 text-slate-950 px-3 py-1 rounded-full hover:bg-sky-400 transition-colors uppercase tracking-tighter"
            >
               자동 제안 생성
            </button>
         </div>
         
         <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {players.map(p => {
               const secret = secretState.players[p.uid];
               return (
                 <div key={p.uid} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", p.isDead ? "bg-slate-700" : "bg-emerald-500")}></span>
                          <span className="text-[11px] font-black text-slate-300">{p.name} <span className="text-slate-500 font-bold ml-1">({getRoleName(secret?.character)})</span></span>
                       </div>
                       <div className="flex gap-1">
                          {secret?.isPoisoned && <span className="text-[8px] bg-purple-600 text-white px-1.5 rounded-full font-black uppercase">독</span>}
                          {secret?.isDrunk && <span className="text-[8px] bg-amber-600 text-slate-950 px-1.5 rounded-full font-black uppercase">취함</span>}
                       </div>
                    </div>
                    <textarea
                      placeholder={`${p.name}님에게 보낼 정보를 입력하세요...`}
                      value={editedSuggestions[p.uid] || ''}
                      onChange={(e) => handleUpdateSuggestion(p.uid, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:border-sky-500 outline-none min-h-[70px] custom-scrollbar transition-colors"
                    />
                 </div>
               );
            })}
         </div>
      </div>

      <Button onClick={finalizeNight} variant="primary" size="lg" className="w-full h-20 font-black uppercase tracking-[0.3em] text-xl shadow-2xl border-transparent">
         아침을 깨우기 (Finalize)
      </Button>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
