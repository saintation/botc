import { useGameStore } from '../../store/gameStore';
import { useGameData, usePlayerSecretData, useSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { updatePublicState } = useGameData(roomId);
  const { nightResult, playerSecret } = usePlayerSecretData(roomId, user?.uid || null);
  const { secretState } = useSecretData(roomId, isST);

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
       alert("유령 투표권을 사용하셨습니다!");
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
    <div className="flex flex-col gap-4 w-full max-w-lg animate-fade-in pb-20">
      {isST && lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 60000) && (
        <div className="bg-rose-600 text-white p-6 rounded-[2rem] shadow-2xl animate-bounce text-center space-y-4">
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Critical Event: Slayer Shot</p>
              <p className="text-lg font-black">{lastEvent.actorName} {'->'} {lastEvent.targetName}</p>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => handleResolveSlayer(true)} variant="primary" className="flex-1 bg-white text-rose-600 font-black">악마 사망 (성공)</Button>
              <Button onClick={() => handleResolveSlayer(false)} variant="secondary" className="flex-1 bg-rose-800 text-white border-transparent font-black">불발 (실패)</Button>
           </div>
        </div>
      )}

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-6 rounded-3xl border border-sky-500/30 text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-sky-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4">Nomination Activity</h3>
          <p className="text-slate-300 mb-6 leading-tight">
            <span className="font-black text-white text-2xl uppercase tracking-tighter">{roomState.players[currentNomination.targetUid]?.name}</span>
          </p>
          <div className="flex justify-center gap-6 mb-8">
            <div className="flex flex-col items-center bg-slate-900/40 p-4 rounded-2xl border border-sky-500/10 w-24">
              <span className="text-3xl font-black text-sky-400">{yesCount}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase">Yes</span>
            </div>
            <div className="flex flex-col items-center bg-slate-900/40 p-4 rounded-2xl border border-rose-500/10 w-24">
              <span className="text-3xl font-black text-rose-400">{noCount}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase">No</span>
            </div>
          </div>
          {!isST ? (
            <div className="flex gap-4">
              <Button onClick={() => handleVote(true)} variant={voters[user.uid] === true ? "primary" : "secondary"} size="lg" className="flex-1 font-black">YES</Button>
              <Button onClick={() => handleVote(false)} variant={voters[user.uid] === false ? "danger" : "secondary"} size="lg" className="flex-1 font-black">NO</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
               <Button onClick={endVoting} variant="primary" className="w-full font-black uppercase tracking-widest">Confirm Votes</Button>
               <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-[10px] text-slate-500 uppercase">Cancel</Button>
            </div>
          )}
        </div>
      )}

      {!isST && nightResult && (
        <div className="bg-sky-500/5 p-5 rounded-2xl border border-sky-500/20 text-center shadow-inner">
          <h3 className="text-sky-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Morning Intelligence</h3>
          <p className="text-sm text-slate-300 italic font-serif leading-relaxed">"{nightResult.message}"</p>
        </div>
      )}

      {/* Slayer Special Action */}
      {!isST && playerSecret?.character === 'slayer' && !roomState.players[user.uid]?.isDead && (
         <div className="bg-rose-950/20 p-4 rounded-2xl border border-rose-500/20 text-center shadow-lg mt-4">
            <p className="text-[10px] text-rose-400 font-bold mb-3 uppercase tracking-widest">Slayer Shot Available</p>
            <div className="flex flex-wrap gap-2 justify-center">
               {players.filter(p => !p.isDead && p.uid !== user.uid).map(p => (
                 <button key={p.uid} onClick={() => handleSlayerShot(p.uid)} className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-md transition-all">
                    {p.name}
                 </button>
               ))}
            </div>
         </div>
      )}

      {isST && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur shadow-xl mt-4">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex justify-between">
              <span>Admin Controls</span>
              {roomState.executionTargetUid && <span className="text-rose-400 font-black">On the Block: {roomState.players[roomState.executionTargetUid]?.name}</span>}
           </h3>
           {!isVoting ? (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 max-h-[25vh] overflow-y-auto pr-1 custom-scrollbar">
                   {players.filter(p => !p.isDead).map(p => (
                      <div key={p.uid} className="flex flex-col gap-1">
                         <p className="text-[8px] text-slate-600 font-black text-center">{p.name}</p>
                         <div className="flex gap-1">
                            {players.filter(n => !n.isDead).map(nominator => (
                               <button key={nominator.uid} onClick={() => handleNominate(p.uid, nominator.uid)} className="flex-1 text-[8px] bg-slate-950 hover:bg-rose-900 text-slate-500 py-1 rounded border border-slate-800 uppercase font-black">
                                  {nominator.name.substring(0,1)}
                               </button>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
                <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-6 font-black uppercase tracking-widest h-14 shadow-2xl border-transparent">
                   {roomState.executionTargetUid ? 'Execute & Go to Night' : 'Skip Execution'}
                </Button>
             </div>
           ) : (
             <p className="text-xs text-slate-500 italic text-center py-4 uppercase font-black animate-pulse">Voting...</p>
           )}
        </div>
      )}
    </div>
  );
}
