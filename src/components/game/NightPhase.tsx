import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { useAuth } from '../../hooks/useAuth';
import { STNightDashboard } from './STNightDashboard';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';

export function NightPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret, submitNightAction } = usePlayerSecretData(roomId, user?.uid || null);

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
      <div className="bg-slate-900/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <h2 className="text-2xl font-black text-slate-200 mb-6 flex items-center justify-center gap-2">
          <span className="text-sky-400 font-serif">🌙</span> Night {roomState.dayNumber}
        </h2>
        
        {/* Identity Badge */}
        <div className="mb-6 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner overflow-hidden relative">
          <p className="text-[9px] font-black text-slate-600 tracking-[0.2em] uppercase mb-1">Your Identity</p>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-100 uppercase tracking-tighter">{getRoleName(role) || 'WAITING'}</p>
          
          {/* Evil Info integrated directly under identity on Night 1 */}
          {isFirstNight && playerSecret?.alignment === 'evil' && playerSecret.evilTeamInfo && (
             <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3 text-left animate-fade-in">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Evil Team Dossier</p>
                <div className="space-y-2">
                   {realRole === 'imp' ? (
                     <>
                       <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Minions</span>
                          <span className="text-[11px] text-white font-medium">{playerSecret.evilTeamInfo.minionNames.join(', ') || 'None'}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Demon Bluffs</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                             {playerSecret.evilTeamInfo.bluffs.map(b => (
                               <span key={b} className="text-[10px] bg-sky-900/30 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded font-bold uppercase">{getRoleName(b)}</span>
                             ))}
                          </div>
                       </div>
                     </>
                   ) : (
                     <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Your Demon</span>
                        <span className="text-[11px] text-rose-400 font-black">{playerSecret.evilTeamInfo.demonName}</span>
                     </div>
                   )}
                </div>
             </div>
          )}
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
              <span className="text-emerald-400 text-3xl font-black">✓</span>
            </div>
            <p className="text-emerald-400/90 font-black uppercase text-[10px] tracking-[0.2em]">Action Transmitted</p>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <span className="text-amber-500 animate-pulse text-lg">●</span>
              <p className="text-xs text-slate-300 font-medium leading-relaxed italic">{actionLabel}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Choice A</label>
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
                <div className="space-y-2 animate-fade-in">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Choice B</label>
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
              className="w-full mt-6 font-black uppercase tracking-widest shadow-2xl h-14 border-transparent"
              disabled={needsRealAction && (!target1 || (actionType === 'two_targets' && !target2))}
            >
              {needsRealAction ? 'Commit Action' : 'Confirm & Wait'}
            </Button>          </div>
        )}
      </div>
    </div>
  );
}
