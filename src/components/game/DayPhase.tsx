import { useGameStore } from '../../store/gameStore';
import { usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { getRoleName } from '../../constants/roles';
import { useState } from 'react';
import { handleDemonDeath, checkWinCondition } from '../../lib/gameLogic';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState, setShowSpyIntel } = useGameStore();
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

  const usedNominators = roomState.usedNominators || [];
  const usedTargets = roomState.usedTargets || [];

  const handleNominate = async (targetUid: string, nominatorUid: string) => {
    if (!isST) return;
    const targetSecret = secretState?.players[targetUid];
    const nominatorSecret = secretState?.players[nominatorUid];
    
    if (targetSecret?.character === 'virgin' && !targetSecret.isPoisoned && !targetSecret.isDrunk && !targetSecret.isUsed) {
       if (nominatorSecret?.alignment === 'good' && !['butler', 'drunk', 'recluse', 'saint'].includes(nominatorSecret.character || '')) {
          const pubClone = JSON.parse(JSON.stringify(roomState));
          const secClone = JSON.parse(JSON.stringify(secretState));
          pubClone.players[nominatorUid].isDead = true;
          pubClone.players[nominatorUid].hasGhostVote = true;
          pubClone.lastExecutedUid = nominatorUid;
          secClone.players[targetUid].isUsed = true;

          const winner = checkWinCondition(pubClone, secClone);
          if (winner) {
             pubClone.status = 'end';
             pubClone.winner = winner;
          } else {
             pubClone.status = 'night';
             pubClone.dayNumber += 1;
             pubClone.usedNominators = [];
             pubClone.usedTargets = [];
          }

          const updates: Record<string, any> = {};
          updates[`public/rooms/${roomId}`] = pubClone;
          updates[`secret/rooms/${roomId}/players`] = secClone.players;
          alert(`처녀(Virgin) 능력이 발동되었습니다! 지목자 ${roomState.players[nominatorUid].name}님이 즉시 처형됩니다.`);
          await update(ref(database), updates);
          return;
       }
    }
    const newNomination = { targetUid, nominatorUid, yesVotes: 0, noVotes: 0, voters: {} };
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/status`] = 'voting';
    updates[`public/rooms/${roomId}/nominations`] = { [targetUid]: newNomination };
    updates[`public/rooms/${roomId}/usedNominators`] = [...usedNominators, nominatorUid];
    updates[`public/rooms/${roomId}/usedTargets`] = [...usedTargets, targetUid];
    await update(ref(database), updates);
  };

  const handleCancelNomination = async () => {
    if (!isST || !currentNomination) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/status`] = 'day';
    updates[`public/rooms/${roomId}/nominations`] = null;
    updates[`public/rooms/${roomId}/usedNominators`] = usedNominators.filter(u => u !== currentNomination.nominatorUid);
    updates[`public/rooms/${roomId}/usedTargets`] = usedTargets.filter(u => u !== currentNomination.targetUid);
    await update(ref(database), updates);
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey || !currentNomination) return;
    const myPlayer = roomState.players[user.uid];
    if (myPlayer.isDead && vote === true && !myPlayer.hasGhostVote) return;
    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}/nominations/${currentNominationKey}/voters/${user.uid}`] = vote;
    if (myPlayer.isDead) {
       if (vote === true) {
          updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = false;
       } else if (vote === false && voters[user.uid] === true) {
          updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = true;
       }
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
    if (!isST || !secretState) return;
    const pubClone = JSON.parse(JSON.stringify(roomState));
    const secClone = JSON.parse(JSON.stringify(secretState));
    const targetUid = pubClone.executionTargetUid;
    const targetSecret = targetUid ? secClone.players[targetUid] : null;

    if (targetUid) {
       pubClone.players[targetUid].isDead = true;
       pubClone.players[targetUid].hasGhostVote = true;
       pubClone.lastExecutedUid = targetUid;
       if (targetSecret?.character === 'saint' && !targetSecret.isPoisoned && !targetSecret.isDrunk) {
          pubClone.status = 'end';
          pubClone.winner = 'evil';
       } else {
          if (targetSecret?.character === 'imp') handleDemonDeath(pubClone, secClone);
          const winner = checkWinCondition(pubClone, secClone);
          if (winner) {
             pubClone.status = 'end';
             pubClone.winner = winner;
          } else {
             pubClone.status = 'night';
             pubClone.dayNumber += 1;
          }
       }
    } else {
       const finalAlive = players.filter(p => !p.isDead);
       const isMayorAlive = finalAlive.some(p => secClone.players[p.uid]?.character === 'mayor');
       if (finalAlive.length === 3 && isMayorAlive) {
          if (window.confirm("시장 승리 조건 충족. 게임을 종료할까요?")) {
             pubClone.status = 'end';
             pubClone.winner = 'good';
          } else {
             pubClone.status = 'night';
             pubClone.dayNumber += 1;
          }
       } else {
          pubClone.status = 'night';
          pubClone.dayNumber += 1;
       }
    }

    if (pubClone.status === 'night') {
       pubClone.highestVotes = 0;
       pubClone.executionTargetUid = null;
       pubClone.usedNominators = [];
       pubClone.usedTargets = [];
    }

    const updates: Record<string, any> = {};
    updates[`public/rooms/${roomId}`] = pubClone;
    updates[`secret/rooms/${roomId}/players`] = secClone.players;
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
    if (!isST || !lastEvent || !secretState) return;
    const updates: Record<string, any> = {};
    if (success) {
       const targetUid = Object.keys(roomState.players).find(k => roomState.players[k].name === lastEvent.targetName);
       if (targetUid) {
          const pubClone = JSON.parse(JSON.stringify(roomState));
          const secClone = JSON.parse(JSON.stringify(secretState));
          pubClone.players[targetUid].isDead = true;
          pubClone.players[targetUid].hasGhostVote = true;
          if (secClone.players[targetUid]?.character === 'imp') {
             if (handleDemonDeath(pubClone, secClone)) {
                updates[`secret/rooms/${roomId}`] = secClone;
                updates[`public/rooms/${roomId}/players`] = pubClone.players;
             } else {
                updates[`public/rooms/${roomId}/status`] = 'end';
                updates[`public/rooms/${roomId}/winner`] = 'good';
             }
          } else {
             updates[`public/rooms/${roomId}/players/${targetUid}`] = pubClone.players[targetUid];
          }
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
        <div className="bg-rose-600 text-white p-6 rounded-[2.5rem] shadow-2xl animate-bounce text-center space-y-4">
           <div><p className="text-[10px] font-black uppercase opacity-80 mb-2 tracking-widest">Slayer Shot Alert</p><p className="text-2xl font-black">{lastEvent.actorName} {'->'} {lastEvent.targetName}</p></div>
           <div className="flex gap-3">
              <Button onClick={() => handleResolveSlayer(true)} variant="primary" className="flex-1 bg-white text-rose-600 font-black h-16">DEAD</Button>
              <Button onClick={() => handleResolveSlayer(false)} variant="secondary" className="flex-1 bg-rose-900 text-white border-transparent h-16">MISS</Button>
           </div>
        </div>
      )}

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur flex justify-between items-center shadow-lg">
        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter font-serif">Day {roomState.dayNumber}</h2>
        {roomState.executionTargetUid && (
          <div className="text-right">
            <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Candidate</p>
            <p className="text-base text-white font-bold">{roomState.players[roomState.executionTargetUid]?.name}</p>
          </div>
        )}
      </div>

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-sky-500/30 text-center relative overflow-hidden shadow-2xl animate-fade-in">
          <h3 className="text-sky-400 font-black uppercase text-sm tracking-[0.3em] mb-6">Vote Active</h3>
          <p className="text-slate-300 mb-8 leading-tight">
             <span className="text-slate-500 text-[11px] uppercase font-bold mb-2 block tracking-widest">Nominator: {roomState.players[currentNomination.nominatorUid]?.name}</span>
             <span className="font-black text-white text-3xl uppercase tracking-tighter border-b-4 border-sky-500/20 pb-1 inline-block">{roomState.players[currentNomination.targetUid]?.name}</span>
          </p>
          <div className="flex justify-center gap-10 mb-10">
            <div className="flex flex-col items-center bg-slate-900/60 p-6 rounded-3xl border border-sky-500/20 w-32 shadow-inner">
              <span className="text-5xl font-black text-sky-400 mb-2">{yesCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Yes (Min: {majorityNeeded})</span>
            </div>
            <div className="flex flex-col items-center bg-slate-900/60 p-6 rounded-3xl border border-rose-500/20 w-32 shadow-inner">
              <span className="text-5xl font-black text-rose-400 mb-2">{noCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase">No</span>
            </div>
          </div>
          {!isST ? (
            <div className="flex gap-4">
              <Button onClick={() => handleVote(true)} variant={voters[user.uid] === true ? "primary" : "secondary"} size="lg" className="flex-1 font-black h-20 text-xl shadow-xl">YES</Button>
              <Button onClick={() => handleVote(false)} variant={voters[user.uid] === false ? "danger" : "secondary"} size="lg" className="flex-1 font-black h-20 text-xl shadow-xl">NO</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               <Button onClick={endVoting} variant="primary" className="w-full font-black uppercase h-16 shadow-xl border-transparent">Finalize Results</Button>
               <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-xs text-slate-500 uppercase tracking-widest font-black underline underline-offset-8 decoration-slate-800">Cancel Vote</Button>
            </div>
          )}
        </div>
      )}

      {!isST && (
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 backdrop-blur shadow-2xl overflow-hidden">
          <button onClick={() => setShowPlayerLog(!showPlayerLogLocal)} className="w-full p-8 flex items-center justify-between hover:bg-slate-800/50 transition-all group">
            <div className="flex items-center gap-5">
               <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">🎭</div>
               <div className="text-left"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 block mb-1">Confidential</span><span className="text-lg font-black text-slate-200 tracking-tight uppercase">Identity & Intel</span></div>
            </div>
            <span className={`text-slate-600 transition-transform duration-500 ${showPlayerLogLocal ? 'rotate-180' : ''}`}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
          </button>
          {showPlayerLogLocal && (
            <div className="p-8 pt-0 space-y-8 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40">
               <div className="py-6 px-8 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-inner mt-6 text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Current Role</p>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-100 to-sky-400 uppercase tracking-tighter italic">{getRoleName(playerSecret?.fakeCharacter || playerSecret?.character)}</p>
               </div>
               {playerSecret?.alignment === 'evil' && playerSecret.evilTeamInfo && (
                  <div className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-3xl space-y-6 shadow-xl text-center">
                     <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-3">Operational Briefing</p>
                     <div className="grid grid-cols-1 gap-6">
                        <div><span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Demon</span><span className="text-xl text-rose-400 font-black uppercase tracking-tight italic underline decoration-rose-500/20">{playerSecret.evilTeamInfo.demonName}</span></div>
                        <div><span className="block text-[10px] text-slate-500 font-black uppercase mb-1">Minions</span><span className="text-base text-white font-bold leading-tight uppercase tracking-tight">{playerSecret.evilTeamInfo.minionNames.join(', ')}</span></div>
                        {playerSecret.evilTeamInfo.bluffs.length > 0 && (
                           <div className="pt-4 border-t border-rose-500/10">
                              <span className="block text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">Recommended Bluffs</span>
                              <div className="flex flex-wrap gap-2 justify-center">{playerSecret.evilTeamInfo.bluffs.map(b => (<span key={b} className="bg-sky-500/10 text-sky-400 px-4 py-1.5 rounded-xl border border-sky-500/20 text-xs font-black uppercase shadow-sm">{getRoleName(b)}</span>))}</div>
                           </div>
                        )}
                     </div>
                  </div>
               )}
               <div className="space-y-4">
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">Chronicle of Intelligence</p>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {playerSecret?.messageHistory && playerSecret.messageHistory.length > 0 ? (
                        playerSecret.messageHistory.map((msg, i) => (
                          <div key={i} className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg text-base text-slate-300 italic font-serif leading-relaxed relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/20 group-hover:bg-sky-500 transition-colors"></div>
                             <div className="flex justify-between items-center mb-3"><span className="text-[10px] font-black text-sky-500/60 uppercase tracking-[0.2em]">Record #{i + 1}</span><span className="text-[8px] font-bold text-slate-700 font-mono text-xs">NIGHT {i + 1}</span></div>
                             <p className="pl-2">"{msg}"</p>
                          </div>
                        ))
                     ) : (<div className="py-12 px-6 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/20 shadow-inner"><p className="text-slate-700 font-black uppercase tracking-widest text-xs">No records available.</p></div>)}
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Slayer Shot */}
      {!isST && playerSecret?.character === 'slayer' && !roomState.players[user.uid]?.isDead && (
         <div className="bg-rose-950/30 p-8 rounded-[3rem] border border-rose-500/30 text-center shadow-2xl mt-4 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20 animate-pulse"></div>
            <p className="text-sm text-rose-500 font-black uppercase tracking-[0.4em] mb-2">Execute Slayer's Shot</p>
            <div className="grid grid-cols-1 gap-2">
               {players.filter(p => !p.isDead && p.uid !== user.uid).map(p => (
                 <Button key={p.uid} onClick={() => handleSlayerShot(p.uid)} variant="danger" className="w-full font-black uppercase tracking-widest h-14 text-base shadow-xl border-transparent">KILL {p.name}</Button>
               ))}
            </div>
         </div>
      )}

      {/* ST Control Panel - Redesigned Nomination UI */}
      {isST && (
        <div className="bg-slate-900/95 p-8 rounded-[3rem] border border-slate-800 backdrop-blur shadow-[0_30px_60px_rgba(0,0,0,0.5)] mt-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-500/5 to-transparent pointer-events-none"></div>
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 border-b border-slate-800 pb-5 flex justify-between items-center">
              <span>Admin Grimoire Deck</span>
              {roomState.executionTargetUid && <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] animate-pulse italic font-black uppercase tracking-tighter">On Block: {roomState.players[roomState.executionTargetUid]?.name}</span>}
           </h3>
           {!isVoting ? (
             <div className="space-y-10">
                <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar">
                   {players.filter(p => !p.isDead).map(target => {
                      const isTargetUsed = usedTargets.includes(target.uid);
                      return (
                        <div key={target.uid} className={`bg-slate-950/80 p-5 rounded-[2rem] border transition-all ${isTargetUsed ? 'border-slate-900 opacity-30 grayscale' : 'border-slate-800 shadow-xl hover:border-slate-600'}`}>
                           <div className="flex justify-between items-center mb-4">
                              <span className="text-base font-black text-sky-500 uppercase tracking-tighter italic">Target: {target.name}</span>
                              {isTargetUsed && <span className="text-[8px] bg-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase font-black">Nominated</span>}
                           </div>
                           <div className="flex flex-col gap-3">
                              <p className="text-[10px] text-slate-600 font-black uppercase ml-1 tracking-[0.2em]">Select Nominator</p>
                              <div className="flex flex-wrap gap-2">
                                 {players.filter(n => !n.isDead).map(nominator => {
                                    const isNominatorUsed = usedNominators.includes(nominator.uid);
                                    const canNominate = !isTargetUsed && !isNominatorUsed;
                                    return (
                                      <button 
                                        key={nominator.uid} 
                                        onClick={() => canNominate && handleNominate(target.uid, nominator.uid)} 
                                        disabled={!canNominate}
                                        className={`h-11 min-w-[44px] text-[12px] font-black rounded-xl border transition-all uppercase px-3
                                          ${canNominate ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-400 shadow-lg active:scale-90' : 'bg-slate-950 border-slate-900 text-slate-800 opacity-40'}
                                        `}
                                      >
                                         {nominator.name.substring(0,2)}
                                      </button>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
                <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-6 font-black uppercase tracking-[0.3em] h-20 shadow-2xl border-transparent text-xl shadow-rose-950/40 hover:shadow-rose-600/20 active:scale-[0.98]">
                   {roomState.executionTargetUid ? 'Execute & Dawn' : 'End Day (Skip)'}
                </Button>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-24 gap-8">
                <div className="w-20 h-20 border-8 border-sky-500/10 border-t-sky-500 rounded-full animate-spin shadow-[0_0_40px_rgba(14,165,233,0.2)]"></div>
                <p className="text-sm font-black text-sky-500 uppercase tracking-[0.5em] animate-pulse">The Council is in Session</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
