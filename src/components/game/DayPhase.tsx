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
  const { nightResult } = usePlayerSecretData(roomId, user?.uid || null);
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
    
    // VIRGIN LOGIC
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
          alert(`처녀(Virgin)의 능력이 발동되었습니다! 지목자 ${roomState.players[nominatorUid].name}님이 즉시 처형됩니다.`);
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
    
    // GHOST VOTE CONSUMPTION
    if (myPlayer.isDead && vote === true) {
       updates[`public/rooms/${roomId}/players/${user.uid}/hasGhostVote`] = false;
       alert("유령 투표권을 사용하셨습니다! 이제 더 이상 찬성 투표를 할 수 없습니다.");
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

  const events = roomState.events || {};
  const lastEventId = Object.keys(events).sort().pop();
  const lastEvent = lastEventId ? events[lastEventId] : null;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg animate-fade-in pb-10">
      {isST && lastEvent && lastEvent.type === 'slayer_shot' && (Date.now() - lastEvent.timestamp < 10000) && (
        <div className="bg-rose-600 text-white p-4 rounded-xl shadow-2xl animate-bounce text-center font-bold">
           📢 학살자 능력 발동! <br/>
           {lastEvent.actorName} {'->'} {lastEvent.targetName}
        </div>
      )}

      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800/80 backdrop-blur flex justify-between items-center shadow-sm">
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-black text-slate-200 uppercase tracking-tighter">Day {roomState.dayNumber}</h2>
            {roomState.executionTargetUid && (
              <div className="text-right">
                <p className="text-[10px] text-rose-500 font-black uppercase">Candidate</p>
                <p className="text-xs text-white font-bold">{roomState.players[roomState.executionTargetUid]?.name} ({roomState.highestVotes} votes)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-sky-500/30 text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-sky-400 font-black uppercase text-xs tracking-widest mb-4">Nomination in Progress</h3>
          <p className="text-slate-300 mb-6 leading-tight">
            <span className="text-slate-500 text-[10px] uppercase font-bold">By {roomState.players[currentNomination.nominatorUid]?.name}</span><br/>
            <span className="font-black text-white text-2xl uppercase tracking-tighter">{roomState.players[currentNomination.targetUid]?.name}</span>
          </p>
          
          <div className="flex justify-center gap-6 mb-8">
            <div className="flex flex-col items-center bg-slate-900/40 p-4 rounded-2xl border border-sky-500/10 w-24">
              <span className="text-3xl font-black text-sky-400">{yesCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase">Yes</span>
              <span className="text-[8px] text-slate-600 mt-1">Min: {majorityNeeded}</span>
            </div>
            <div className="flex flex-col items-center bg-slate-900/40 p-4 rounded-2xl border border-rose-500/10 w-24">
              <span className="text-3xl font-black text-rose-400">{noCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase">No</span>
            </div>
          </div>

          {!isST ? (
            <div className="flex gap-4">
              <Button onClick={() => handleVote(true)} variant={voters[user.uid] === true ? "primary" : "secondary"} size="lg" className="flex-1 font-black">YES</Button>
              <Button onClick={() => handleVote(false)} variant={voters[user.uid] === false ? "danger" : "secondary"} size="lg" className="flex-1 font-black">NO</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
               <Button onClick={endVoting} variant="primary" className="w-full font-black uppercase tracking-widest">Finalize Vote</Button>
               <Button onClick={handleCancelNomination} variant="ghost" className="w-full text-xs text-slate-500">Cancel Nomination</Button>
            </div>
          )}
        </div>
      )}

      {!isST && nightResult && (
        <div className="bg-sky-500/5 p-4 rounded-xl border border-sky-500/20 text-center shadow-inner">
          <h3 className="text-sky-500 text-[10px] font-black uppercase tracking-widest mb-1">Previous Night Intelligence</h3>
          <p className="text-sm text-slate-300 italic font-serif">"{nightResult.message}"</p>
        </div>
      )}

      <div className="space-y-1.5">
        {players.map((p) => (
          <div key={p.uid} className={cn(
            "bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex items-center justify-between transition-opacity",
            p.isDead && "opacity-40"
          )}>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-700 font-mono">{p.seatIndex + 1}</span>
               <span className="text-xs font-black text-slate-300 uppercase tracking-tight">{p.name}</span>
            </div>
            <div className="flex gap-2">
              {isST && !isVoting && !p.isDead && (
                <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                   {players.filter(n => !n.isDead).map(nominator => (
                      <button 
                        key={nominator.uid}
                        onClick={() => handleNominate(p.uid, nominator.uid)}
                        className="text-[9px] bg-slate-800 hover:bg-rose-600 text-slate-500 font-black px-1.5 py-0.5 rounded transition-all uppercase"
                      >
                        {nominator.name.substring(0, 1)}
                      </button>
                   ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isST && !isVoting && (
        <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-4 font-black shadow-xl border-transparent uppercase tracking-[0.2em]">
          {roomState.executionTargetUid ? 'Execute & Go to Night' : 'Skip Execution'}
        </Button>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
