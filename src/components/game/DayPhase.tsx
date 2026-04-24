import { useGameStore } from '../../store/gameStore';
import { useGameData, usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { useState } from 'react';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState, setShowSpyIntel } = useGameStore();
  const { updatePublicState } = useGameData(roomId);
  const { playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const { secretState } = useSecretData(roomId, isST);

  const [showPlayerLogLocal, setShowPlayerLogLocal] = useState(false);

  const setShowPlayerLog = (val: boolean) => {
    setShowPlayerLogLocal(val);
    setShowSpyIntel(val);
  };

  if (!roomState || !user || !roomId) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const isVoting = roomState.status === 'voting';
  const currentNominationKey = roomState.nominations ? Object.keys(roomState.nominations)[0] : null;
  const currentNomination = currentNominationKey && roomState.nominations ? roomState.nominations[currentNominationKey] : null;

  const alivePlayers = players.filter(p => !p.isDead);
  const majorityNeeded = Math.ceil(alivePlayers.length / 2);

  const voters = currentNomination?.voters || {};
  const yesCount = Object.values(voters).filter(v => v === true).length;
  const noCount = Object.values(voters).filter(v => v === false).length;

  const handleNominate = async (targetUid: string, nominatorUid: string) => {
    if (!isST) return;
    const targetSecret = secretState?.players[targetUid];
    const nominatorSecret = secretState?.players[nominatorUid];
    if (targetSecret?.character === 'virgin' && !targetSecret.isPoisoned && !targetSecret.isDrunk && !targetSecret.isUsed) {
       if (nominatorSecret?.alignment === 'good' && !['butler', 'drunk', 'recluse', 'saint'].includes(nominatorSecret.character || '')) {
          const updates: Record<string, any> = {};
          updates[`public/rooms/${roomId}/players/${nominatorUid}/isDead`] = true;
          updates[`public/rooms/${roomId}/players/${nominatorUid}/hasGhostVote`] = true;
          updates[`public/rooms/${roomId}/lastExecutedUid`] = nominatorUid;
          updates[`public/rooms/${roomId}/status`] = 'night';
          updates[`public/rooms/${roomId}/dayNumber`] = roomState.dayNumber + 1;
          updates[`secret/rooms/${roomId}/players/${targetUid}/isUsed`] = true;
          alert(`처녀(Virgin) 능력이 발동되었습니다! 지목자 ${roomState.players[nominatorUid].name}님이 즉시 처형됩니다.`);
          await update(ref(database), updates);
          return;
       }
    }
    const newNomination = { targetUid, nominatorUid, yesVotes: 0, noVotes: 0, voters: {} };
    await updatePublicState({ status: 'voting', nominations: { [targetUid]: newNomination } });
  };

  const handleCancelNomination = async () => {
    if (!isST) return;
    await updatePublicState({ status: 'day', nominations: null });
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey || !currentNomination) return;
    const myPlayer = roomState.players[user.uid];
    if (myPlayer.isDead && !myPlayer.hasGhostVote) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/nominations/${currentNominationKey}/voters/${user.uid}`] = vote;
    if (myPlayer.isDead && vote === true) {
       updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = false;
    }
    await update(ref(database), updates);
  };

  const endVoting = async () => {
    if (!isST || !currentNominationKey || !currentNomination) return;
    const currentHighest = roomState.highestVotes || 0;
    const updates: Record<string, any> = {};
    if (yesCount >= majorityNeeded && yesCount > currentHighest) {
       updates[`public/rooms/${roomId}/highestVotes`] = yesCount;
       updates[`public/rooms/${roomId}/executionTargetUid`] = currentNomination.targetUid;
    } else if (yesCount >= majorityNeeded && yesCount === currentHighest) {
       updates[`public/rooms/${roomId}/executionTargetUid`] = null;
    }
    updates[`public/rooms/${roomId}/status`] = 'day';
    updates[`public/rooms/${roomId}/nominations`] = null;
    await update(ref(database), updates);
  };

  const finalizeDay = async () => {
    if (!isST) return;
    const updates: Record<string, any> = {};
    const targetUid = roomState.executionTargetUid;
    if (targetUid) {
       updates[`public/rooms/${roomId}/players/${targetUid}/isDead`] = true;
       updates[`public/rooms/${roomId}/players/${targetUid}/hasGhostVote`] = true;
       updates[`public/rooms/${roomId}/lastExecutedUid`] = targetUid;
    } else {
       updates[`public/rooms/${roomId}/lastExecutedUid`] = null;
    }
    updates[`public/rooms/${roomId}/status`] = 'night';
    updates[`public/rooms/${roomId}/dayNumber`] = roomState.dayNumber + 1;
    updates[`public/rooms/${roomId}/highestVotes`] = 0;
    updates[`public/rooms/${roomId}/executionTargetUid`] = null;
    await update(ref(database), updates);
  };

  const handleSlayerShot = async (targetUid: string) => {
    if (isST || playerSecret?.character !== 'slayer') return;
    const targetName = roomState.players[targetUid].name;
    if (window.confirm(`${targetName}님에게 학살자 능력을 사용하시겠습니까?`)) {
       const eventId = Date.now().toString();
       const updates: Record<string, any> = {};
       updates[`public/rooms/${roomId}/events/${eventId}`] = {
          type: 'slayer_shot',
          actorName: roomState.players[user.uid].name,
          targetName: targetName,
          timestamp: Date.now()
       };
       await update(ref(database), updates);
    }
  };

  const handleResolveSlayer = async (success: boolean) => {
    const events = roomState.events || {};
    const lastEventId = Object.keys(events).sort().pop();
    const lastEvent = lastEventId ? events[lastEventId] : null;
    if (!isST || !lastEvent) return;
    
    const updates: Record<string, any> = {};
    if (success) {
       const targetUid = Object.keys(roomState.players).find(k => roomState.players[k].name === lastEvent.targetName);
       if (targetUid) {
          updates[`public/rooms/${roomId}/players/${targetUid}/isDead`] = true;
          updates[`public/rooms/${roomId}/players/${targetUid}/hasGhostVote`] = true;
          updates[`public/rooms/${roomId}/status`] = 'end'; 
       }
    }
    updates[`public/rooms/${roomId}/events/${lastEventId}`] = null;
    await update(ref(database), updates);
  };

  const events = roomState.events || {};
  const lastEventId = Object.keys(events).sort().pop();
  const lastEvent = lastEventId ? events[lastEventId] : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg animate-fade-in pb-20 px-4 sm:px-0">
      {isST && lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 60000) && (
        <div className="bg-rose-600 text-white p-8 rounded-[2.5rem] shadow-2xl animate-bounce text-center space-y-6">
           <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Critical Event: Slayer Shot</p>
              <p className="text-2xl font-black">{lastEvent.actorName} {'->'} {lastEvent.targetName}</p>
           </div>
           <div className="flex gap-3">
              <Button onClick={() => handleResolveSlayer(true)} variant="primary" className="flex-1 bg-white text-rose-600 font-black text-base h-16">악마 사망</Button>
              <Button onClick={() => handleResolveSlayer(false)} variant="secondary" className="flex-1 bg-rose-900 text-white border-transparent font-black text-base h-16">불발</Button>
           </div>
        </div>
      )}

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur flex justify-between items-center shadow-lg">
        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter italic italic-none font-serif">Day {roomState.dayNumber}</h2>
        {roomState.executionTargetUid && (
          <div className="text-right">
            <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Execution Target</p>
            <p className="text-base text-white font-bold">{roomState.players[roomState.executionTargetUid]?.name}</p>
          </div>
        )}
      </div>

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-sky-500/30 text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-sky-400 font-black uppercase text-sm tracking-[0.3em] mb-6">Voting in Progress</h3>
          <p className="text-slate-300 mb-8 leading-tight">
             <span className="text-slate-500 text-[11px] uppercase font-bold mb-2 block tracking-widest">Nominator: {roomState.players[currentNomination.nominatorUid]?.name}</span>
             <span className="font-black text-white text-3xl uppercase tracking-tighter border-b-4 border-sky-500/20 pb-1 inline-block">{roomState.players[currentNomination.targetUid]?.name}</span>
          </p>
          <div className="flex justify-center gap-10 mb-10">
            <div className="flex flex-col items-center bg-slate-900/60 p-6 rounded-3xl border border-sky-500/20 w-32 shadow-inner">
              <span className="text-5xl font-black text-sky-400 mb-2">{yesCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Yes (Min: {majorityNeeded})</span>
            </div>
            <div className="flex flex-col items-center bg-slate-900/60 p-6 rounded-3xl border border-rose-500/20 w-32 shadow-inner">
              <span className="text-5xl font-black text-rose-400 mb-2">{noCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No</span>
            </div>
          </div>
          {!isST ? (
            <div className="flex gap-4">
              <Button onClick={() => handleVote(true)} variant={voters[user.uid] === true ? "primary" : "secondary"} size="lg" className="flex-1 font-black h-20 text-xl shadow-xl">YES</Button>
              <Button onClick={() => handleVote(false)} variant={voters[user.uid] === false ? "danger" : "secondary"} size="lg" className="flex-1 font-black h-20 text-xl shadow-xl">NO</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               <Button onClick={endVoting} variant="primary" size="lg" className="w-full font-black uppercase tracking-widest h-16 shadow-xl border-transparent">Finalize Results</Button>
               <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-xs text-slate-500 uppercase font-bold tracking-widest">Cancel Vote</Button>
            </div>
          )}
        </div>
      )}

      {/* Identity & Intelligence Archive (NEW TOGGLE) */}
      {!isST && (
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 backdrop-blur shadow-2xl overflow-hidden">
          <button 
            onClick={() => setShowPlayerLog(!showPlayerLogLocal)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-5">
               <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">🎭</div>
               <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 block mb-1">Confidential</span>
                  <span className="text-lg font-black text-slate-200 tracking-tight">IDENTITY & INTEL ARCHIVE</span>
               </div>
            </div>
            <span className={`text-slate-600 transition-transform duration-500 ${showPlayerLogLocal ? 'rotate-180' : ''}`}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </button>
          
          {showPlayerLogLocal && (
            <div className="p-8 pt-0 space-y-8 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40">
               <div className="py-6 px-8 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-inner mt-6">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Current Guise</p>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-100 to-sky-400 uppercase tracking-tighter">
                    {getRoleName(playerSecret?.fakeCharacter || playerSecret?.character)}
                  </p>
               </div>

               {playerSecret?.alignment === 'evil' && playerSecret.evilTeamInfo && (
                  <div className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-3xl space-y-6 shadow-xl">
                     <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-3">Operational Team Briefing</p>
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                           <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Demon</span>
                           <span className="text-xl text-rose-400 font-black uppercase tracking-tight italic underline decoration-rose-500/20">{playerSecret.evilTeamInfo.demonName}</span>
                        </div>
                        <div>
                           <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Minions</span>
                           <span className="text-base text-white font-bold leading-tight uppercase tracking-tight">{playerSecret.evilTeamInfo.minionNames.join(', ')}</span>
                        </div>
                     </div>
                     {playerSecret.evilTeamInfo.bluffs.length > 0 && (
                        <div className="pt-4 border-t border-rose-500/10">
                           <span className="block text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">Recommended Bluffs</span>
                           <div className="flex flex-wrap gap-2">
                              {playerSecret.evilTeamInfo.bluffs.map(b => (
                                 <span key={b} className="bg-sky-500/10 text-sky-400 px-4 py-1.5 rounded-xl border border-sky-500/20 text-xs font-black uppercase tracking-widest shadow-sm">{getRoleName(b)}</span>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               )}

               <div className="space-y-4">
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">Chronicle of Intelligence</p>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {playerSecret?.messageHistory && playerSecret.messageHistory.length > 0 ? (
                        playerSecret.messageHistory.map((msg, i) => (
                          <div key={i} className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg text-base text-slate-300 italic font-serif leading-relaxed relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/20 group-hover:bg-sky-500 transition-colors"></div>
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-sky-500/60 uppercase tracking-[0.2em]">Record #{i + 1}</span>
                                <span className="text-[8px] font-bold text-slate-700 font-mono">DATED: NIGHT {i + 1}</span>
                             </div>
                             <p className="pl-2">"{msg}"</p>
                          </div>
                        ))
                     ) : (
                        <div className="py-12 px-6 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/20 shadow-inner">
                           <p className="text-slate-700 font-black uppercase tracking-widest text-xs">No records recovered from the void.</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Slayer shot remains high-visibility */}
      {!isST && playerSecret?.character === 'slayer' && !roomState.players[user.uid]?.isDead && (
         <div className="bg-rose-950/30 p-8 rounded-[3rem] border border-rose-500/30 text-center shadow-2xl mt-4 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20 animate-pulse"></div>
            <p className="text-sm text-rose-500 font-black uppercase tracking-[0.4em] mb-2 shadow-sm">Execute Slayer's Shot</p>
            <div className="grid grid-cols-1 gap-2">
               {players.filter(p => !p.isDead && p.uid !== user.uid).map(p => (
                 <Button key={p.uid} onClick={() => handleSlayerShot(p.uid)} variant="danger" className="w-full font-black uppercase tracking-widest h-14 text-base shadow-xl">
                    KILL {p.name}
                 </Button>
               ))}
            </div>
         </div>
      )}

      {/* ST Command Center - High Legibility */}
      {isST && (
        <div className="bg-slate-900/90 p-8 rounded-[3rem] border border-slate-800 backdrop-blur shadow-[0_30px_60px_rgba(0,0,0,0.5)] mt-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-500/5 to-transparent pointer-events-none"></div>
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 border-b border-slate-800 pb-5 flex justify-between items-center">
              <span>Grimoire Master Control</span>
              {roomState.executionTargetUid && <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] animate-pulse">On Block: {roomState.players[roomState.executionTargetUid]?.name}</span>}
           </h3>
           {!isVoting ? (
             <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4 max-h-[35vh] overflow-y-auto pr-3 custom-scrollbar">
                   {players.filter(p => !p.isDead).map(p => (
                      <div key={p.uid} className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner group hover:border-slate-600 transition-all">
                         <p className="text-sm text-slate-300 font-black uppercase w-28 truncate">{p.name}</p>
                         <div className="flex gap-1.5 flex-1 flex-wrap justify-end">
                            {players.filter(n => !n.isDead).map(nominator => (
                               <button 
                                 key={nominator.uid} 
                                 onClick={() => handleNominate(p.uid, nominator.uid)} 
                                 className="h-10 min-w-[40px] text-[11px] bg-slate-900 hover:bg-rose-600 text-slate-500 hover:text-white px-2 rounded-xl border border-slate-800 hover:border-rose-400 uppercase font-black transition-all shadow-md active:scale-90"
                                 title={`${nominator.name} 지목`}
                               >
                                  {nominator.name.substring(0,2)}
                               </button>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
                <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-6 font-black uppercase tracking-[0.3em] h-20 shadow-2xl border-transparent text-xl shadow-rose-950/40 hover:shadow-rose-600/20 active:scale-[0.98]">
                   {roomState.executionTargetUid ? 'Execute & Wake Night' : 'End Day (No Execution)'}
                </Button>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="w-16 h-16 border-8 border-sky-500/20 border-t-sky-500 rounded-full animate-spin shadow-2xl"></div>
                <p className="text-sm font-black text-sky-500 uppercase tracking-[0.4em] animate-pulse">The Council is Deciding...</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
