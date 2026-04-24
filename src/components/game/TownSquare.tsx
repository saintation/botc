import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';
import { getRoleName } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../lib/firebase';
import { ref, update } from 'firebase/database';

export function TownSquare() {
  const { user } = useAuth();
  const { roomId, roomState, role, showSpyIntel } = useGameStore();
  const { secretState } = useSecretData(roomId, role === 'st' || showSpyIntel);

  // ST Selection State
  const [selectedNominator, setSelectedNominator] = useState<string | null>(null);

  if (!roomState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const isSpy = role === 'player' && user && secretState?.players[user.uid]?.character === 'spy';
  const showFullInfo = role === 'st' || (isSpy && showSpyIntel);

  const isVoting = roomState.status === 'voting';
  const usedNominators = roomState.usedNominators || [];
  const usedTargets = roomState.usedTargets || [];

  const handlePlayerClick = async (clickedUid: string) => {
    if (role !== 'st' || isVoting || roomState.status === 'end') return;

    const clickedPlayer = roomState.players[clickedUid];
    if (clickedPlayer.isDead && !selectedNominator) return; // Dead can't nominate

    if (!selectedNominator) {
      // Step 1: Select Nominator
      if (usedNominators.includes(clickedUid)) {
        alert("이 플레이어는 이미 오늘 지목을 했습니다.");
        return;
      }
      setSelectedNominator(clickedUid);
    } else {
      // Step 2: Select Target
      if (selectedNominator === clickedUid) {
        setSelectedNominator(null); // Deselect
        return;
      }
      if (usedTargets.includes(clickedUid)) {
        alert("이 플레이어는 이미 오늘 지목을 당했습니다.");
        return;
      }
      if (clickedPlayer.isDead) {
         alert("사망자는 지목할 수 없습니다.");
         return;
      }

      const nominatorName = roomState.players[selectedNominator].name;
      const targetName = clickedPlayer.name;

      if (window.confirm(`${nominatorName}님이 ${targetName}님을 지목하시겠습니까?`)) {
        const newNomination = { 
          targetUid: clickedUid, 
          nominatorUid: selectedNominator, 
          yesVotes: 0, 
          noVotes: 0, 
          voters: {} 
        };
        
        const updates: Record<string, any> = {};
        updates[`public/rooms/${roomId}/status`] = 'voting';
        updates[`public/rooms/${roomId}/nominations`] = { [clickedUid]: newNomination };
        updates[`public/rooms/${roomId}/usedNominators`] = [...usedNominators, selectedNominator];
        updates[`public/rooms/${roomId}/usedTargets`] = [...usedTargets, clickedUid];
        
        await update(ref(database), updates);
        setSelectedNominator(null);
      } else {
        setSelectedNominator(null);
      }
    }
  };

  const radius = 145; 
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${180 + radius * Math.cos(angle)}px`,
      top: `${180 + radius * Math.sin(angle)}px`,
    };
  };

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 p-8 flex flex-col items-center select-none">
      <div className="mb-12 flex items-center justify-between w-full max-w-sm px-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] font-serif">Town Square</h3>
        <div className="flex gap-3 items-center">
           <span className="text-xs text-sky-500 font-mono bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20 uppercase font-black tracking-widest">
             DAY {roomState.dayNumber}
           </span>
        </div>
      </div>

      <div className="relative w-[360px] h-[360px] bg-slate-900/10 rounded-full border border-slate-800/30 flex items-center justify-center">
        {/* Instruction overlay for ST */}
        {role === 'st' && !isVoting && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 animate-fade-in">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">
               {selectedNominator ? "지목할 대상을 클릭하세요" : "지목자를 클릭하세요"}
             </p>
             <div className="flex justify-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", selectedNominator ? "bg-sky-500" : "bg-sky-500 animate-pulse")}></div>
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", selectedNominator ? "bg-rose-500 animate-pulse" : "bg-slate-800")}></div>
             </div>
          </div>
        )}

        <div className="w-24 h-28 bg-slate-950 rounded-[40%] blur-3xl opacity-50 absolute pointer-events-none"></div>
        
        {players.map((p, i) => {
          const pos = getPosition(i, players.length);
          const secret = secretState?.players[p.uid];
          const isDead = p.isDead;
          const hasGhostVote = p.hasGhostVote;
          const isPoisoned = secret?.isPoisoned;
          const isDrunk = secret?.isDrunk;
          const isUsed = secret?.isUsed;

          const isSelectingNominator = selectedNominator === p.uid;
          const isBeingTargeted = selectedNominator && !isSelectingNominator; // Hint for ST

          return (
            <div 
              key={p.uid} 
              style={pos} 
              onClick={() => handlePlayerClick(p.uid)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300",
                role === 'st' && !isVoting && "cursor-pointer hover:scale-110 active:scale-95"
              )}
            >
              <div className={cn(
                "relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-700 shadow-2xl",
                isDead ? "border-slate-800 bg-slate-950 grayscale opacity-50" : "border-slate-700 bg-slate-900",
                showFullInfo && secret?.alignment === 'evil' && !isDead && "border-rose-600 shadow-[0_0_25px_rgba(225,29,72,0.5)] ring-2 ring-rose-500/20",
                showFullInfo && secret?.alignment === 'good' && !isDead && "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)] ring-2 ring-sky-500/10",
                isSelectingNominator && "border-sky-400 ring-4 ring-sky-400/30 scale-110 shadow-[0_0_30px_rgba(56,189,248,0.6)] z-20",
                isBeingTargeted && "hover:border-rose-500 hover:ring-4 hover:ring-rose-500/30"
              )}>
                {/* Seating Order / Character Tag */}
                {showFullInfo ? (
                   <div className={cn(
                     "text-sm font-black tracking-tighter",
                     secret?.alignment === 'evil' ? "text-rose-500" : "text-sky-400"
                   )}>
                     {secret?.character?.substring(0, 1).toUpperCase() || '?'}
                   </div>
                ) : (
                   <span className="text-slate-600 text-sm font-black font-mono">{i + 1}</span>
                )}

                {isDead && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-[120%] h-[2.5px] bg-rose-700 rotate-45 shadow-sm"></div>
                    <div className="w-[120%] h-[2.5px] bg-rose-700 -rotate-45 shadow-sm"></div>
                  </div>
                )}

                {isDead && hasGhostVote && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-full border-[3px] border-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-bounce z-30">
                    <span className="text-sm text-slate-950 font-black italic">!</span>
                  </div>
                )}
              </div>

              {/* Info Label Below Circle */}
              <div className="mt-3 flex flex-col items-center gap-1 max-w-[100px]">
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-widest truncate w-full text-center px-2 py-0.5 rounded transition-all",
                  isDead ? "text-slate-700" : "text-slate-200 bg-slate-900/40 border border-slate-800 shadow-sm",
                  isSelectingNominator && "text-sky-400 bg-sky-950 border-sky-500/50"
                )}>
                  {p.name}
                </span>

                {showFullInfo && (
                   <div className="flex flex-col items-center">
                     <span className={cn(
                       "text-[9px] font-bold uppercase tracking-wider leading-none mb-1",
                       secret?.alignment === 'evil' ? "text-rose-500/90" : "text-sky-400/90"
                     )}>
                       {getRoleName(secret?.character)}
                     </span>
                     
                     <div className="flex gap-1 mt-1 flex-wrap justify-center">
                        {isPoisoned && <span className="text-[8px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm uppercase">Psn</span>}
                        {isDrunk && <span className="text-[8px] font-black bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded shadow-sm uppercase">Drk</span>}
                        {isUsed && <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shadow-sm uppercase">Used</span>}
                     </div>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
