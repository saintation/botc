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
  const { nightResult } = usePlayerSecretData(roomId, user?.uid || null);

  if (!roomState || !user || !roomId) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const isVoting = roomState.status === 'voting';
  const currentNominationKey = roomState.nominations ? Object.keys(roomState.nominations)[0] : null;
  const currentNomination = currentNominationKey && roomState.nominations ? roomState.nominations[currentNominationKey] : null;

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
    if (isST) return;
    alert(`${roomState.players[targetUid].name}님에게 학살자 능력을 사용하시겠습니까? (ST에게 알림이 전송됩니다)`);
  };

  const handleVote = async (vote: boolean) => {
    if (isST || !currentNominationKey) return;
    const myPlayer = roomState.players[user.uid];
    if (myPlayer.isDead && !myPlayer.hasGhostVote) return;

    const updates: Record<string, boolean | string | number | null> = {};
    updates[`public/rooms/${roomId}/nominations/${currentNominationKey}/voters/${user.uid}`] = vote;
    await update(ref(database), updates);
  };

  const endVoting = async (execute: boolean) => {
    if (!isST || !currentNominationKey) return;
    
    if (execute) {
      const updates: Record<string, boolean | string | null> = {};
      updates[`public/rooms/${roomId}/players/${currentNominationKey}/isDead`] = true;
      updates[`public/rooms/${roomId}/players/${currentNominationKey}/hasGhostVote`] = true;
      updates[`public/rooms/${roomId}/status`] = 'night';
      updates[`public/rooms/${roomId}/nominations`] = null;
      await update(ref(database), updates);
    } else {
      await updatePublicState({ status: 'day', nominations: null });
    }
  };

  const endDay = async () => {
    if (!isST) return;
    await updatePublicState({ 
      status: 'night', 
      nominations: null,
      dayNumber: roomState.dayNumber + 1 
    });
  };

  const voters = currentNomination?.voters || {};
  const yesCount = Object.values(voters).filter(v => v === true).length;
  const noCount = Object.values(voters).filter(v => v === false).length;
  const aliveCount = players.filter(p => !p.isDead).length;
  const majorityNeeded = Math.ceil(aliveCount / 2);

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg animate-fade-in">
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800/80 backdrop-blur flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
            <span className="text-amber-400">☀️</span>
            {roomState.dayNumber}일차 낮
          </h2>
          <p className="text-sm text-slate-400 mt-1">생존자: {aliveCount}명</p>
        </div>
        {isST && !isVoting && (
          <Button onClick={endDay} variant="secondary" size="sm">
            처형 없이 밤으로
          </Button>
        )}
      </div>

      {!isST && nightResult && (
        <div className="bg-sky-500/10 p-5 rounded-xl border border-sky-500/30 text-center animate-fade-in shadow-[0_0_20px_rgba(14,165,233,0.1)]">
          <h3 className="text-sky-400 font-bold mb-2 flex items-center justify-center gap-2">
            <span>ℹ️</span> 지난 밤 얻은 정보
          </h3>
          <p className="text-xl text-slate-100 font-medium tracking-wide">"{nightResult.message}"</p>
        </div>
      )}

      {isVoting && currentNomination && (
        <div className="bg-rose-950/40 p-6 rounded-xl border border-rose-500/30 text-center relative overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.1)]">
          <div className="absolute inset-0 bg-rose-500/5 animate-pulse-slow pointer-events-none"></div>
          <h3 className="text-rose-400 font-bold mb-2 relative z-10 text-lg">투표 진행 중</h3>
          <p className="text-slate-300 mb-6 relative z-10 text-lg">
            <span className="font-bold text-white text-xl border-b-2 border-rose-500/50 pb-1">{roomState.players[currentNomination.targetUid]?.name}</span> 님이 지목되었습니다.
          </p>
          
          <div className="flex justify-center gap-8 mb-8 relative z-10">
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
            <div className="flex gap-3 flex-col mt-4 relative z-10">
              <Button onClick={() => endVoting(true)} variant="danger">투표 종료 (처형 및 밤으로)</Button>
              <Button onClick={() => endVoting(false)} variant="secondary">투표 종료 (처형 안함)</Button>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 backdrop-blur">
        <h3 className="text-slate-300 font-bold mb-4 border-b border-slate-800/80 pb-3 flex items-center gap-2">
          <span>🏛️</span> 마을 광장
        </h3>
        <ul className="space-y-2.5">
          {players.map((p) => (
            <li key={p.uid} className={`p-3 sm:p-4 rounded-xl flex items-center justify-between transition-all border ${p.isDead ? 'opacity-60 bg-slate-950 border-slate-800/50' : 'bg-slate-950/80 border-slate-700/50 shadow-sm'}`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">{p.seatIndex + 1}</span>
                <span className={`font-medium text-base ${p.isDead ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{p.name}</span>
                {p.isDead && p.hasGhostVote && <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">👻 유령 투표권</span>}
              </div>
              
              {isST && !isVoting && !p.isDead && (
                <Button onClick={() => handleNominate(p.uid)} variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">지목하기</Button>
              )}

              {!isST && !isVoting && !p.isDead && p.uid !== user.uid && (
                <button onClick={() => handleSlayerAbility(p.uid)} className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors underline decoration-dotted">학살자 사용</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
