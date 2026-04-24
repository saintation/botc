import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { useAuth } from '../../hooks/useAuth';
import { STNightDashboard } from './STNightDashboard';
import { Button } from '../ui/Button';

export function NightPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret, submitNightAction } = usePlayerSecretData(roomId, user?.uid || null);

  const [target1, setTarget1] = useState<string>('');
  const [target2, setTarget2] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);

  if (!roomState || !user || !roomId) return null;

  const playersList = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const role = playerSecret?.character;
  const isFirstNight = roomState.dayNumber === 1;
  const isDead = roomState.players[user.uid]?.isDead;

  let needsRealAction = false;
  let actionType: 'none' | 'one_target' | 'two_targets' = 'none';

  if (!isDead && role) {
    if (role === 'poisoner' || role === 'monk' || role === 'imp' || role === 'butler') {
       // Poisoner, Monk, Butler act every night. Imp acts from Night 2.
       if (!(role === 'imp' && isFirstNight)) {
          needsRealAction = true;
          actionType = 'one_target';
       }
    } else if (role === 'fortune_teller') {
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

  // Set action label based on role
  let actionLabel = "대상을 선택하세요";
  if (role === 'butler') actionLabel = "오늘 밤 모실 주인을 선택하세요";
  if (role === 'poisoner') actionLabel = "중독시킬 대상을 선택하세요";
  if (role === 'monk') actionLabel = "보호할 대상을 선택하세요";
  if (role === 'imp') actionLabel = "살해할 대상을 선택하세요";
  if (role === 'fortune_teller') actionLabel = "조사할 대상 두 명을 선택하세요";

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg text-center animate-fade-in">
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center justify-center gap-2 relative z-10">
          <span className="text-sky-400">🌙</span>
          {roomState.dayNumber}일차 밤
        </h2>
        
        {playerSecret && (
           <div className="mb-8 p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner relative z-10">
             <p className="text-xs font-medium text-slate-400 tracking-wider uppercase mb-1">당신의 직업</p>
             <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-200">{playerSecret.character || '알 수 없음'}</p>
             {playerSecret.bluffs && playerSecret.bluffs.length > 0 && (
               <div className="mt-3 pt-3 border-t border-slate-800/50">
                 <p className="text-xs text-rose-400/80 font-medium uppercase tracking-wider mb-1">악마 블러프 (가짜 직업)</p>
                 <div className="flex flex-wrap justify-center gap-2 mt-1.5">
                   {playerSecret.bluffs.map((b, i) => (
                     <span key={i} className="bg-rose-950/40 text-rose-300 border border-rose-500/20 text-xs px-2.5 py-1 rounded-md font-medium">
                       {b}
                     </span>
                   ))}
                 </div>
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
              행동이 안전하게 접수되었습니다.<br/>아침이 밝을 때까지 기다려주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
             <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
               <p className="text-sm text-slate-300 leading-relaxed">
                 {needsRealAction 
                   ? "오늘 밤 능력을 사용할 대상을 선택하세요." 
                   : "당신은 오늘 밤 사용할 능력이 없습니다. 아무렇게나 조작 후 확인 버튼을 눌러주세요."}
               </p>
             </div>

             <div className="flex flex-col gap-4 text-left">
               <div className="space-y-1.5">
                 <label className="text-xs font-medium text-slate-400 pl-1 uppercase tracking-wider">대상 1 (선택사항)</label>
                 <select 
                   value={target1} 
                   onChange={e => setTarget1(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3.5 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all shadow-sm"
                 >
                   <option value="">대상을 선택하지 않음</option>
                   {playersList.map(p => (
                     <option key={p.uid} value={p.uid}>{p.name} {p.isDead ? '(사망)' : ''}</option>
                   ))}
                 </select>
               </div>

               {actionType === 'two_targets' && (
                 <div className="space-y-1.5 mt-2 animate-fade-in">
                   <label className="text-xs font-medium text-slate-400 pl-1 uppercase tracking-wider flex items-center gap-1">
                     <span>대상 2</span>
                   </label>
                   <select 
                     value={target2} 
                     onChange={e => setTarget2(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-sm"
                   >
                     <option value="">대상을 선택하지 않음</option>
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
               className="w-full mt-4 shadow-xl"
             >
               {needsRealAction ? '능력 사용 확정' : '확인 (넘어가기)'}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
