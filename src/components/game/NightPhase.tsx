import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { STNightDashboard } from './STNightDashboard';
import { useState } from 'react';

export function NightPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [target2Uid, setTarget2Uid] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showPlayerLogLocal, setShowPlayerLogLocal] = useState(false);

  if (!roomState || !user || !roomId) return null;

  const myRole = playerSecret?.character;

  const handleConfirmAction = async () => {
    const updates: Record<string, any> = {};
    updates[`secret/rooms/${roomId}/nightActions/${user.uid}`] = {
      targetUid,
      target2Uid,
      status: 'completed'
    };
    await update(ref(database), updates);
    setIsConfirmed(true);
  };

  if (isST) return <STNightDashboard />;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const needsTarget = ['imp', 'poisoner', 'monk', 'ravenkeeper'].includes(myRole || '');
  const needsTwoTargets = ['fortune_teller'].includes(myRole || '');
  const isButler = myRole === 'butler';

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg animate-fade-in pb-20">
      <div className="bg-slate-900/90 p-8 rounded-[3rem] border border-slate-800 backdrop-blur shadow-2xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent"></div>
        
        <div className="space-y-2">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Current Phase</p>
           <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic font-serif">The Night Deepens</h2>
        </div>

        {isConfirmed ? (
           <div className="py-12 px-6 bg-slate-950/50 rounded-[2.5rem] border border-slate-800 shadow-inner space-y-4">
              <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <div className="w-8 h-8 bg-sky-500 rounded-full animate-ping opacity-40"></div>
                 <div className="w-4 h-4 bg-sky-500 rounded-full absolute"></div>
              </div>
              <p className="text-sky-400 font-black uppercase tracking-widest text-sm">Action Transmitted</p>
              <p className="text-slate-500 text-xs leading-relaxed">스토리텔러가 밤의 결산을 마치고 아침을 깨울 때까지 기다려 주세요.</p>
           </div>
        ) : (
           <div className="space-y-8 animate-fade-in">
              {/* Action Selection UI */}
              {needsTarget || needsTwoTargets || isButler ? (
                 <div className="space-y-6">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{isButler ? '주인을 선택하세요' : '능력을 사용할 대상을 선택하세요'}</p>
                    <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                       {players.filter(p => p.uid !== user.uid).map(p => (
                          <button
                            key={p.uid}
                            onClick={() => {
                               if (needsTwoTargets) {
                                  if (targetUid === p.uid) setTargetUid(null);
                                  else if (!targetUid) setTargetUid(p.uid);
                                  else if (target2Uid === p.uid) setTarget2Uid(null);
                                  else if (!target2Uid) setTarget2Uid(p.uid);
                               } else {
                                  setTargetUid(targetUid === p.uid ? null : p.uid);
                               }
                            }}
                            className={cn(
                               "p-3 rounded-2xl border text-[11px] font-black uppercase transition-all truncate",
                               (targetUid === p.uid || target2Uid === p.uid)
                                ? "bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-900/40"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600"
                            )}
                          >
                             {p.name}
                          </button>
                       ))}
                    </div>
                 </div>
              ) : (
                 <div className="py-10 bg-slate-950/40 rounded-[2.5rem] border border-slate-800 shadow-inner">
                    <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-widest italic">당신은 밤에 깨지 않는 역할이거나,<br/>오늘 밤 특별한 행동이 필요하지 않습니다.</p>
                 </div>
              )}
              
              <Button onClick={handleConfirmAction} variant="primary" size="lg" className="w-full h-16 font-black uppercase tracking-widest shadow-xl border-transparent">
                 밤 행동 확정 (Confirm)
              </Button>
           </div>
        )}
      </div>

      {/* Identity & Intel Log */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 backdrop-blur shadow-2xl overflow-hidden mt-4">
          <button onClick={() => setShowPlayerLogLocal(!showPlayerLogLocal)} className="w-full p-6 flex items-center justify-between hover:bg-slate-800/50 transition-all group">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🎭</div>
               <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 block">비밀 기록관</span>
                  <span className="text-base font-black text-slate-200 tracking-tight uppercase font-serif">정체 및 과거 기록 확인</span>
               </div>
            </div>
            <span className={`text-slate-600 transition-transform duration-500 ${showPlayerLogLocal ? 'rotate-180' : ''}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
          </button>
          {showPlayerLogLocal && (
            <div className="p-6 pt-0 space-y-6 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40">
               <div className="py-5 px-6 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-inner mt-4 text-center">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">나의 정체</p>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-100 to-sky-400 uppercase tracking-tighter italic">{getRoleName(playerSecret?.fakeCharacter || playerSecret?.character)}</p>
               </div>
               {playerSecret?.alignment === 'evil' && playerSecret.evilTeamInfo && (
                  <div className="p-5 bg-rose-950/20 border border-rose-500/20 rounded-2xl space-y-5 shadow-xl text-center">
                     <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-2">작전 브리핑</p>
                     <div className="grid grid-cols-1 gap-4">
                        <div><span className="block text-[9px] text-slate-500 font-black uppercase mb-1">Demon</span><span className="text-lg text-rose-400 font-black uppercase tracking-tight italic">{playerSecret.evilTeamInfo.demonName}</span></div>
                        <div><span className="block text-[9px] text-slate-500 font-black uppercase mb-1">Minions</span><span className="text-sm text-white font-bold leading-tight uppercase tracking-tight">{playerSecret.evilTeamInfo.minionNames.join(', ')}</span></div>
                        {playerSecret.evilTeamInfo.bluffs.length > 0 && (
                           <div className="pt-3 border-t border-rose-500/10">
                              <span className="block text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest">Team Bluffs</span>
                              <div className="flex flex-wrap gap-1.5 justify-center">{playerSecret.evilTeamInfo.bluffs.map(b => (<span key={b} className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded-xl border border-sky-500/20 text-[10px] font-black uppercase shadow-sm">{getRoleName(b)}</span>))}</div>
                           </div>
                        )}
                     </div>
                  </div>
               )}
               <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">기록 아카이브</p>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                     {playerSecret?.messageHistory && playerSecret.messageHistory.length > 0 ? (
                        playerSecret.messageHistory.map((msg, i) => (
                          <div key={i} className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg text-sm text-slate-300 italic font-serif leading-relaxed relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/20 group-hover:bg-sky-500 transition-colors"></div>
                             <div className="flex justify-between items-center mb-2"><span className="text-[9px] font-black text-sky-500/60 uppercase tracking-[0.2em]">RECORD #{i + 1}</span><span className="text-[8px] font-bold text-slate-700 font-mono text-xs uppercase">Night {i + 1}</span></div>
                             <p className="pl-1">"{msg}"</p>
                          </div>
                        ))
                     ) : (<div className="py-10 px-6 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/20 shadow-inner"><p className="text-slate-700 font-black uppercase tracking-widest text-[10px]">No records found.</p></div>)}
                  </div>
               </div>
            </div>
          )}
        </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
