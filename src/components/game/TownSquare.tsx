import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';

export function TownSquare() {
  const { roomId, roomState, role } = useGameStore();
  const { secretState } = useSecretData(roomId, role === 'st');

  if (!roomState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  
  // Spy logic: can see full info like ST
  const isSpy = role === 'player' && secretState?.players[Object.keys(roomState.players).find(k => roomState.players[k].uid === Object.keys(roomState.players)[0])!]?.character === 'spy';
  const showFullInfo = role === 'st' || isSpy;

  const radius = 130; 
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${160 + radius * Math.cos(angle)}px`,
      top: `${160 + radius * Math.sin(angle)}px`,
    };
  };

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 p-6 flex flex-col items-center">
      <div className="mb-6 flex items-center justify-between w-full max-w-sm">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] font-serif">The Town Square</h3>
        <div className="flex gap-3 items-center">
           <span className="text-[10px] text-sky-500 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-tighter">
             Day {roomState.dayNumber}
           </span>
        </div>
      </div>

      <div className="relative w-[320px] h-[320px] bg-slate-900/20 rounded-full border border-slate-800/30 flex items-center justify-center shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.8)_0%,transparent_70%)]"></div>
        
        {players.map((p, i) => {
          const pos = getPosition(i, players.length);
          const secret = secretState?.players[p.uid];
          const isDead = p.isDead;
          const hasGhostVote = p.hasGhostVote;
          const isPoisoned = secret?.isPoisoned;
          const isDrunk = secret?.isDrunk;

          return (
            <div 
              key={p.uid} 
              style={pos} 
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
            >
              <div className={cn(
                "relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-2xl",
                isDead ? "border-slate-800 bg-slate-950 grayscale" : "border-slate-700 bg-slate-900",
                showFullInfo && secret?.alignment === 'evil' && !isDead && "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]",
                showFullInfo && secret?.alignment === 'good' && !isDead && "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              )}>
                {/* Character Label for ST/Spy */}
                {showFullInfo ? (
                   <span className={cn(
                     "text-[10px] font-black uppercase tracking-tighter",
                     secret?.alignment === 'evil' ? "text-rose-500" : "text-sky-400"
                   )}>
                     {secret?.character?.substring(0, 2) || '?'}
                   </span>
                ) : (
                   <span className="text-slate-600 text-xs font-black font-mono">{i + 1}</span>
                )}

                {/* Status Badges for ST */}
                {showFullInfo && (
                  <div className="absolute -top-1 -left-1 flex flex-col gap-0.5 pointer-events-none">
                     {isPoisoned && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full border border-slate-900 shadow-sm" title="Poisoned"></div>}
                     {isDrunk && <div className="w-2.5 h-2.5 bg-amber-600 rounded-full border border-slate-900 shadow-sm" title="Drunk"></div>}
                  </div>
                )}

                {/* Death X Marker */}
                {isDead && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-[120%] h-[2px] bg-rose-600 rotate-45"></div>
                    <div className="w-[120%] h-[2px] bg-rose-600 -rotate-45"></div>
                  </div>
                )}

                {/* Ghost Vote - Large Amber Circle */}
                {isDead && hasGhostVote && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg animate-pulse-slow">
                    <span className="text-[10px] text-slate-950 font-black">!</span>
                  </div>
                )}
              </div>

              {/* Player Name */}
              <div className={cn(
                "mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all duration-300",
                isDead ? "text-slate-600 bg-slate-900/20" : "text-slate-300 bg-slate-900/80 border border-slate-800 shadow-sm"
              )}>
                {p.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
