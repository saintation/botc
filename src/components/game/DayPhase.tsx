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

  const handleNominate = async (targetUid: string) => {
    if (!isST) return;
    
    const newNomination = {
      targetUid,
      nominatorUid: 'system',
      yesVotes: 0,
      noVotes: 0,
      voters: {},
    };

    await updatePublicState({
      status: 'voting',
      nominations: { [targetUid]: newNomination },
    });
  };

  const handleSlayerAbility = async (targetUid: string) => {
    if (isST || playerSecret?.character !== 'slayer') return;
    const targetName = roomState.players[targetUid].name;
    if (window.confirm(`${targetName}님에게 학살자 능력을 사용하시겠습니까? (이 행동은 모두에게 공개됩니다)`)) {
       const updates: Record<string, any> = {};
       const eventId = Date.now().toString();
       updates[`public/rooms/${roomId}/events/${eventId}`] = {
          type: 'slayer_shot',
          actorName: roomState.players[user.uid].name,
          targetName: targetName,
          timestamp: Date.now()
       };
       await update(ref(database), updates);
    }
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey) return;
    const myPlayer = roomState.players[user.uid];
    if (myPlayer.isDead && !myPlayer.hasGhostVote) return;

    const updates: Record<string, boolean | string | number | null> = {};
    updates[`public/rooms/${roomId}/nominations/${currentNominationKey}/voters/${user.uid}`] = vote;
    await update(ref(database), updates);
  };

  const endVoting = async () => {
    if (!isST || !currentNominationKey || !currentNomination) return;
    
    const voters = currentNomination.voters || {};
    const yesCount = Object.values(voters).filter(v => v === true).length;
    
    const currentHighest = roomState.highestVotes || 0;
    const updates: Record<string, any> = {};

    if (yesCount >= majorityNeeded && yesCount > currentHighest) {
       // New execution candidate
       updates[`public/rooms/${roomId}/highestVotes`] = yesCount;
       updates[`public/rooms/${roomId}/executionTargetUid`] = currentNomination.targetUid;
    } else if (yesCount >= majorityNeeded && yesCount === currentHighest) {
       // Tie - nobody is executed if it remains a tie
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

  const voters = currentNomination?.voters || {};
  const yesCount = Object.values(voters).filter(v => v === true).length;
  const noCount = Object.values(voters).filter(v => v === false).length;

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
            <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
              <span className="text-amber-400 text-xl font-serif">☀️</span>
              {roomState.dayNumber}일차 낮
            </h2>
            {roomState.executionTargetUid && (
              <div className="text-right">
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-tighter">처형 후보</p>
                <p className="text-xs text-white font-medium">{roomState.players[roomState.executionTargetUid]?.name} ({roomState.highestVotes}표)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isVoting && currentNomination && (
        <div className="bg-slate-950 p-6 rounded-xl border border-sky-500/30 text-center relative overflow-hidden shadow-2xl">
          <h3 className="text-sky-400 font-bold mb-2 text-lg">투표 진행 중</h3>
          <p className="text-slate-300 mb-6 text-lg">
            <span className="font-bold text-white text-xl">{roomState.players[currentNomination.targetUid]?.name}</span> 님이 지목되었습니다.
          </p>
          
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex flex-col items-center bg-slate-900/50 p-4 rounded-xl border border-sky-500/20 w-28">
              <span className="text-3xl font-bold text-sky-400 mb-1">{yesCount}</span>
              <span className="text-xs font-medium text-slate-400">찬성</span>
              <span className="text-[10px] text-slate-500 mt-1">(과반: {majorityNeeded})</span>
            </div>
            <div className="flex flex-col items-center bg-slate-900/50 p-4 rounded-xl border border-rose-500/20 w-28">
              <span className="text-3xl font-bold text-rose-400 mb-1">{noCount}</span>
              <span className="text-xs font-medium text-slate-400">반대</span>
            </div>
          </div>

          {!isST && (
            <div className="flex gap-4 relative z-10">
              <Button onClick={() => handleVote(true)} variant={voters[user.uid] === true ? "primary" : "secondary"} size="lg" className="flex-1">찬성</Button>
              <Button onClick={() => handleVote(false)} variant={voters[user.uid] === false ? "danger" : "secondary"} size="lg" className="flex-1">반대</Button>
            </div>
          )}

          {isST && (
            <Button onClick={endVoting} variant="primary" className="w-full">투표 결과 확정</Button>
          )}
        </div>
      )}

      {!isST && nightResult && (
        <div className="bg-sky-500/5 p-4 rounded-xl border border-sky-500/20 text-center shadow-inner">
          <h3 className="text-sky-500 text-[10px] font-black uppercase tracking-widest mb-1">Last Night Info</h3>
          <p className="text-sm text-slate-300 italic">"{nightResult.message}"</p>
        </div>
      )}

      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.uid} className={`bg-slate-900/40 p-3 rounded-lg border border-slate-800 flex items-center justify-between ${p.isDead ? 'opacity-50' : ''}`}>
            <span className="text-sm font-medium text-slate-300">{p.name}</span>
            <div className="flex gap-2">
              {isST && !isVoting && !p.isDead && (
                <Button onClick={() => handleNominate(p.uid)} variant="outline" size="sm" className="h-7 text-[10px] border-rose-500/30 text-rose-400">지목</Button>
              )}
              {!isST && playerSecret?.character === 'slayer' && !p.isDead && p.uid !== user.uid && (
                <Button onClick={() => handleSlayerAbility(p.uid)} variant="danger" size="sm" className="h-7 text-[10px] font-black tracking-tighter">SLAYER SHOT</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isST && !isVoting && (
        <Button onClick={finalizeDay} variant="danger" size="lg" className="w-full mt-4 font-bold shadow-xl border-transparent">
          {roomState.executionTargetUid ? '처형 집행 및 밤으로' : '처형 없이 밤으로'}
        </Button>
      )}
    </div>
  );
}
