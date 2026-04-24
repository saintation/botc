import { useGameStore } from '../../store/gameStore';
import { useGameData, usePlayerSecretData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function DayPhase({ isST }: { isST: boolean }) {
  const { user } = useAuth();
  const { roomId, roomState } = useGameStore();
  const { updatePublicState } = useGameData(roomId);
  const { nightResult, playerSecret } = usePlayerSecretData(roomId, user?.uid || null);

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
    if (myPlayer.isDead && vote === true) updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = false;
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

  const events = roomState.events || {};
  const lastEventId = Object.keys(events).sort().pop();
  const lastEvent = lastEventId ? events[lastEventId] : null;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg animate-fade-in pb-20">
      {isST && lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 10000) && (
        <div className="bg-rose-600 text-white p-4 rounded-xl shadow-2xl animate-bounce text-center font-bold">
           📢 학살자 능력 발동! <br/>
           {lastEvent.actorName} {'->'} {lastEvent.targetName}
        </div>
      )}

      {/* Voting Panel */}
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

      {/* Info Message for Players */}
      {!isST && nightResult && (
        <div className="bg-sky-500/5 p-5 rounded-2xl border border-sky-500/20 text-center shadow-inner">
          <h3 className="text-sky-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Morning Intelligence</h3>
          <p className="text-sm text-slate-300 italic font-serif leading-relaxed">"{nightResult.message}"</p>
        </div>
      )}

      {/* Slayer Special Action Button */}
      {!isST && playerSecret?.character === 'slayer' && !roomState.players[user.uid]?.isDead && (
         <div className="bg-rose-950/20 p-4 rounded-2xl border border-rose-500/20 text-center animate-pulse shadow-lg mt-4">
            <p className="text-[10px] text-rose-400 font-bold mb-3 uppercase tracking-widest underline underline-offset-4 decoration-rose-500/30">학살자 전용 능력</p>
            <div className="flex flex-wrap gap-2 justify-center">
               {players.filter(p => !p.isDead && p.uid !== user.uid).map(p => (
                 <button key={p.uid} onClick={() => handleSlayerShot(p.uid)} className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-md transition-all">
                    {p.name} SHOOT
                 </button>
               ))}
            </div>
         </div>
      )}

      {/* ST Control Panel */}
      {isST && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur shadow-xl mt-4">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex justify-between">
              <span>Admin Controls</span>
              {roomState.executionTargetUid && <span className="text-rose-400 font-black">Candidate: {roomState.players[roomState.executionTargetUid]?.name}</span>}
           </h3>
           {!isVoting ? (
             <div className="space-y-4">
                <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-tighter">Quick Nomination (ST Only)</p>
                <div className="grid grid-cols-2 gap-2 max-h-[20vh] overflow-y-auto pr-1 custom-scrollbar">
                   {players.filter(p => !p.isDead).map(p => (
                      <Button key={p.uid} onClick={() => handleNominate(p.uid, 'system')} variant="outline" size="sm" className="h-8 text-[9px] font-black border-slate-800 hover:border-rose-500/50">
                         NOMINATE {p.name}
                      </Button>
                   ))}
                </div>
                <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-6 font-black uppercase tracking-widest h-14 shadow-2xl border-transparent">
                   {roomState.executionTargetUid ? 'Execute & Go to Night' : 'Skip Execution'}
                </Button>
             </div>
           ) : (
             <p className="text-xs text-slate-500 italic text-center py-4 uppercase font-black tracking-widest animate-pulse">Vote in progress...</p>
           )}
        </div>
      )}
    </div>
  );
}
