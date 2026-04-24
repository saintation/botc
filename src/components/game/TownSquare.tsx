import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';
import { getRoleName } from '../../constants/roles';

export function TownSquare() {
  const { roomId, roomState, role } = useGameStore();
  const { secretState } = useSecretData(roomId, role === 'st');

  if (!roomState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  
  // Spy logic: can see full info like ST
  const isSpy = role === 'player' && secretState?.players[Object.keys(roomState.players).find(k => roomState.players[k].uid === Object.keys(roomState.players)[0])!]?.character === 'spy';
  const showFullInfo = role === 'st' || isSpy;

  const radius = 135; 
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${170 + radius * Math.cos(angle)}px`,
      top: `${170 + radius * Math.sin(angle)}px`,
    };
  };

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 p-8 flex flex-col items-center">
      <div className="mb-10 flex items-center justify-between w-full max-w-sm">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] font-serif">Town Square</h3>
        <div className="flex gap-3 items-center">
           <span className="text-[9px] text-sky-500 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase font-black">
             D{roomState.dayNumber}
           </span>
        </div>
      </div>

      <div className="relative w-[340px] h-[340px] bg-slate-900/10 rounded-full border border-slate-800/30 flex items-center justify-center">
        {/* Subtle decorative center */}
        <div className="w-20 h-24 bg-slate-950 rounded-[40%] blur-3xl opacity-50 absolute pointer-events-none"></div>
        
        {players.map((p, i) => {
          const pos = getPosition(i, players.length);
          const secret = secretState?.players[p.uid];
          const isDead = p.isDead;
          const hasGhostVote = p.hasGhostVote;
          const isPoisoned = secret?.isPoisoned;
          const isDrunk = secret?.isDrunk;
          const isUsed = secret?.isUsed;

          return (
            <div 
              key={p.uid} 
              style={pos} 
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
            >
              <div className={cn(
                "relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700 shadow-2xl",
                isDead ? "border-slate-800 bg-slate-950 grayscale opacity-60" : "border-slate-700 bg-slate-900",
                showFullInfo && secret?.alignment === 'evil' && !isDead && "border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.4)] ring-1 ring-rose-500/30",
                showFullInfo && secret?.alignment === 'good' && !isDead && "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] ring-1 ring-sky-500/20"
              )}>
                {/* Seating Order / Character Tag */}
                {showFullInfo ? (
                   <div className={cn(
                     "text-[12px] font-black tracking-tighter",
                     secret?.alignment === 'evil' ? "text-rose-500" : "text-sky-400"
                   )}>
                     {secret?.character?.substring(0, 1).toUpperCase() || '?'}
                   </div>
                ) : (
                   <span className="text-slate-600 text-[11px] font-black font-mono">{i + 1}</span>
                )}

                {/* Death X Overlay */}
                {isDead && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <div className="w-[110%] h-[1.5px] bg-rose-600 rotate-45"></div>
                    <div className="w-[110%] h-[1.5px] bg-rose-600 -rotate-45"></div>
                  </div>
                )}

                {/* Ghost Vote Orb */}
                {isDead && hasGhostVote && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg animate-pulse">
                    <span className="text-[10px] text-slate-950 font-black italic">!</span>
                  </div>
                )}
              </div>

              {/* Info Label Below Circle */}
              <div className="mt-3 flex flex-col items-center gap-0.5 max-w-[80px]">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-tighter truncate w-full text-center px-1 rounded transition-colors",
                  isDead ? "text-slate-700" : "text-slate-300"
                )}>
                  {p.name}
                </span>

                {showFullInfo && (
                   <div className="flex flex-col items-center">
                     <span className={cn(
                       "text-[8px] font-bold uppercase tracking-widest leading-none mb-0.5",
                       secret?.alignment === 'evil' ? "text-rose-600/80" : "text-sky-600/80"
                     )}>
                       {getRoleName(secret?.character)}
                     </span>
                     
                     {/* ST Status Flags */}
                     <div className="flex gap-1 mt-1">
                        {isPoisoned && (
                           <span className="text-[7px] font-black bg-purple-900/50 text-purple-400 border border-purple-500/30 px-1 rounded-[2px] uppercase">Psn</span>
                        )}
                        {isDrunk && (
                           <span className="text-[7px] font-black bg-amber-900/50 text-amber-400 border border-amber-500/30 px-1 rounded-[2px] uppercase">Drk</span>
                        )}
                        {isUsed && (
                           <span className="text-[7px] font-black bg-slate-800 text-slate-500 border border-slate-700 px-1 rounded-[2px] uppercase">Used</span>
                        )}
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
