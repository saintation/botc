import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { useAuth } from '../../hooks/useAuth';
import { STNightDashboard } from './STNightDashboard';
import { Button } from '../ui/Button';

export function NightPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret, submitNightAction } = usePlayerSecretData(roomId, user?.uid || null);
  const { secretState } = useSecretData(roomId, isST);

  const [target1, setTarget1] = useState<string>('');
  const [target2, setTarget2] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  if (!roomState || !user || !roomId) return null;

  const playersList = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  
  const role = playerSecret?.fakeCharacter || playerSecret?.character;
  const realRole = playerSecret?.character;
  const isFirstNight = roomState.dayNumber === 1;
  const isDead = roomState.players[user.uid]?.isDead;

  let needsRealAction = false;
  let actionType: 'none' | 'one_target' | 'two_targets' = 'none';
  let actionLabel = "오늘 밤 사용할 능력이 없습니다.";

  if (!isDead && realRole) {
    if (realRole === 'poisoner' || realRole === 'monk' || realRole === 'imp' || realRole === 'butler') {
       if (!(realRole === 'imp' && isFirstNight)) {
          needsRealAction = true;
          actionType = 'one_target';
          if (realRole === 'poisoner') actionLabel = "누구를 중독시키겠습니까?";
          if (realRole === 'monk') actionLabel = "누구를 보호하시겠습니까?";
          if (realRole === 'imp') actionLabel = "누구를 살해하시겠습니까?";
          if (realRole === 'butler') actionLabel = "오늘 밤의 주인을 선택하세요.";
       }
    } else if (realRole === 'fortune_teller') {
       needsRealAction = true;
       actionType = 'two_targets';
       actionLabel = "악마 여부를 조사할 두 명을 고르세요.";
    }
  }

  const handleSubmit = async () => {
    setSubmitted(true);
    await submitNightAction({ targetUid: target1 || null, target2Uid: target2 || null, status: 'completed' });
  };

  if (isST) return <STNightDashboard />;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg text-center animate-fade-in pb-10">
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Night Header */}
        <h2 className="text-2xl font-black text-slate-200 mb-6 flex items-center justify-center gap-2">
          <span className="text-sky-400 font-serif">🌙</span> Night {roomState.dayNumber}
        </h2>
        
        {/* EVIL INFO - Priority 1 (Scene 3) */}
        {isFirstNight && playerSecret?.alignment === 'evil' && secretState?.evilInfo && (
           <div className="mb-6 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 text-left animate-fade-in">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Evil Dossier</p>
              {realRole === 'imp' ? (
                <>
                  <p className="text-[11px] text-slate-300 font-medium mb-1">하수인: <span className="text-rose-400">{secretState.evilInfo.minionUids.map(uid => roomState.players[uid]?.name).join(', ') || '없음'}</span></p>
                  <p className="text-[11px] text-slate-300 font-medium">가짜 직업: <span className="text-sky-400">{secretState.evilInfo.bluffs.join(', ')}</span></p>
                </>
              ) : (
                <p className="text-[11px] text-slate-300 font-medium">악마: <span className="text-rose-400">{roomState.players[secretState.evilInfo.demonUid]?.name}</span></p>
              )}
           </div>
        )}

        {/* Identity Section */}
        {playerSecret && (
           <div className="mb-8 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
             <p className="text-[9px] font-black text-slate-600 tracking-[0.2em] uppercase mb-1">Your True Identity</p>
             <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-100 uppercase">{role || 'WAITING'}</p>
           </div>
        )}

        {submitted ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
              <span className="text-emerald-400 text-2xl font-black">✓</span>
            </div>
            <p className="text-emerald-400/90 font-black uppercase text-xs tracking-widest">Action Logged</p>
          </div>
        ) : (
          <div className="space-y-8 text-left">
             <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 flex items-center gap-3 shadow-sm">
               <span className="text-amber-500">✨</span>
               <p className="text-xs text-slate-300 font-medium leading-relaxed italic">{actionLabel}</p>
             </div>

             <div className="space-y-4">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Choice A</label>
                 <select 
                   value={target1} 
                   onChange={e => setTarget1(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-2xl p-4 outline-none focus:border-sky-500 transition-all shadow-md appearance-none font-bold"
                 >
                   <option value="">-- NO ONE --</option>
                   {playersList.map(p => (
                     <option key={p.uid} value={p.uid}>{p.name} {p.isDead ? '(DEAD)' : ''}</option>
                   ))}
                 </select>
               </div>

               {actionType === 'two_targets' && (
                 <div className="space-y-1.5 animate-fade-in">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Choice B</label>
                   <select 
                     value={target2} 
                     onChange={e => setTarget2(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-2xl p-4 outline-none focus:border-sky-500 transition-all shadow-md appearance-none font-bold"
                   >
                     <option value="">-- NO ONE --</option>
                     {playersList.map(p => (
                       <option key={p.uid} value={p.uid}>{p.name} {p.isDead ? '(DEAD)' : ''}</option>
                     ))}
                   </select>
                 </div>
               )}
             </div>

             <Button 
               onClick={handleSubmit}
               variant={needsRealAction ? "primary" : "secondary"}
               size="lg"
               className="w-full mt-6 font-black uppercase tracking-widest shadow-2xl h-14"
             >
               Confirm Night Action
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
