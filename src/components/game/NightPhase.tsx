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
  
  // DRUNK LOGIC: Display fake character to the player
  const role = playerSecret?.fakeCharacter || playerSecret?.character;
  const realRole = playerSecret?.character;
  
  const isFirstNight = roomState.dayNumber === 1;
  const isDead = roomState.players[user.uid]?.isDead;

  let needsRealAction = false;
  let actionType: 'none' | 'one_target' | 'two_targets' = 'none';

  // Determine action based on REAL role
  if (!isDead && realRole) {
    if (realRole === 'poisoner' || realRole === 'monk' || realRole === 'imp' || realRole === 'butler') {
       if (!(realRole === 'imp' && isFirstNight)) {
          needsRealAction = true;
          actionType = 'one_target';
       }
    } else if (realRole === 'fortune_teller') {
       needsRealAction = true;
       actionType = 'two_targets';
    }
  }

  const handleSubmit = async () => {
    setSubmitted(true);
    await submitNightAction({
      targetUid: target1 || null,
      target2Uid: target2 || null,
      status: 'completed',
    });
  };

  if (isST) {
    return <STNightDashboard />;
  }

  let actionLabel = "대상을 선택하세요";
  if (realRole === 'butler') actionLabel = "오늘 밤 모실 주인을 선택하세요";
  if (realRole === 'poisoner') actionLabel = "중독시킬 대상을 선택하세요";
  if (realRole === 'monk') actionLabel = "보호할 대상을 선택하세요";
  if (realRole === 'imp') actionLabel = "살해할 대상을 선택하세요";
  if (realRole === 'fortune_teller') actionLabel = "조사할 두 명을 선택하세요";

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg text-center animate-fade-in pb-10">
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center justify-center gap-2 relative z-10">
          <span className="text-sky-400 font-serif">🌙</span>
          {roomState.dayNumber}일차 밤
        </h2>
        
        {playerSecret && (
           <div className="mb-8 p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner relative z-10">
             <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Your Identity</p>
             <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-100 uppercase tracking-tight">{role || 'WAITING...'}</p>
             
             {/* Evil Info on Night 1 */}
             {isFirstNight && playerSecret.alignment === 'evil' && secretState?.evilInfo && (
               <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-2 text-left">
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Evil Intelligence</p>
                  {realRole === 'imp' ? (
                    <>
                      <p className="text-[11px] text-slate-400">하수인: <span className="text-rose-400 font-bold">{secretState.evilInfo.minionUids.map(uid => roomState.players[uid]?.name).join(', ') || '없음'}</span></p>
                      <p className="text-[11px] text-slate-400">가짜 직업: <span className="text-sky-400 font-bold">{secretState.evilInfo.bluffs.join(', ')}</span></p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">악마: <span className="text-rose-400 font-bold">{roomState.players[secretState.evilInfo.demonUid]?.name}</span></p>
                  )}
               </div>
             )}
           </div>
        )}

        {submitted ? (
          <div className="py-12 relative z-10 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse-slow">
              <span className="text-emerald-400 text-2xl">✓</span>
            </div>
            <p className="text-emerald-400/90 font-medium text-lg text-center leading-relaxed">
              행동이 접수되었습니다.<br/>아침을 기다려주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
             <div className="bg-slate-800/20 p-3 rounded-lg border border-slate-800/50">
               <p className="text-xs text-slate-400 leading-relaxed italic font-serif">
                 {needsRealAction 
                   ? actionLabel
                   : "당신은 오늘 밤 사용할 능력이 없습니다. 아무렇게나 조작 후 확인 버튼을 눌러주세요."}
               </p>
             </div>

             <div className="flex flex-col gap-4 text-left">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Target 1</label>
                 <select 
                   value={target1} 
                   onChange={e => setTarget1(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl p-3.5 outline-none focus:border-sky-500 transition-all shadow-sm appearance-none"
                 >
                   <option value="">-- 선택 안함 --</option>
                   {playersList.map(p => (
                     <option key={p.uid} value={p.uid}>{p.name} {p.isDead ? '(사망)' : ''}</option>
                   ))}
                 </select>
               </div>

               {actionType === 'two_targets' && (
                 <div className="space-y-1.5 mt-2 animate-fade-in">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Target 2</label>
                   <select 
                     value={target2} 
                     onChange={e => setTarget2(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl p-3.5 outline-none focus:border-sky-500 transition-all shadow-sm appearance-none"
                   >
                     <option value="">-- 선택 안함 --</option>
                     {playersList.map(p => (
                       <option key={p.uid} value={p.uid}>{p.name} {p.isDead ? '(사망)' : ''}</option>
                     ))}
                   </select>
                 </div>
               )}
             </div>

             <Button 
               onClick={handleSubmit}
               variant={needsRealAction ? "primary" : "secondary"}
               size="lg"
               className="w-full mt-4 font-bold tracking-tight shadow-xl"
             >
               {needsRealAction ? 'ACTION CONFIRM' : 'CONFIRM (FAKE)'}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
