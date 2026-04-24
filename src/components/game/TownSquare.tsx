import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';
import { getRoleName } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

export function TownSquare() {
  const { user } = useAuth();
  const { roomId, roomState, role, showSpyIntel } = useGameStore();
  const { secretState } = useSecretData(roomId, role === 'st' || showSpyIntel);

  if (!roomState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  
  // Spy logic: can see full info like ST IF intel is toggled on
  const isSpy = role === 'player' && user && secretState?.players[user.uid]?.character === 'spy';
  const showFullInfo = role === 'st' || (isSpy && showSpyIntel);


  const radius = 145; 
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${180 + radius * Math.cos(angle)}px`,
      top: `${180 + radius * Math.sin(angle)}px`,
    };
  };

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 p-8 flex flex-col items-center">
      <div className="mb-12 flex items-center justify-between w-full max-w-sm">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] font-serif">Town Square</h3>
        <div className="flex gap-3 items-center">
           <span className="text-xs text-sky-500 font-mono bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20 uppercase font-black">
             DAY {roomState.dayNumber}
           </span>
        </div>
      </div>

      <div className="relative w-[360px] h-[360px] bg-slate-900/10 rounded-full border border-slate-800/30 flex items-center justify-center">
        {/* Subtle decorative center */}
        <div className="w-24 h-28 bg-slate-950 rounded-[40%] blur-3xl opacity-50 absolute pointer-events-none"></div>
        
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
                "relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-700 shadow-2xl",
                isDead ? "border-slate-800 bg-slate-950 grayscale opacity-50" : "border-slate-700 bg-slate-900",
                showFullInfo && secret?.alignment === 'evil' && !isDead && "border-rose-600 shadow-[0_0_25px_rgba(225,29,72,0.5)] ring-2 ring-rose-500/20",
                showFullInfo && secret?.alignment === 'good' && !isDead && "border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.4)] ring-2 ring-sky-500/10"
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

                {/* Death X Overlay */}
                {isDead && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-[120%] h-[2.5px] bg-rose-700 rotate-45 shadow-sm"></div>
                    <div className="w-[120%] h-[2.5px] bg-rose-700 -rotate-45 shadow-sm"></div>
                  </div>
                )}

                {/* Ghost Vote Orb */}
                {isDead && hasGhostVote && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg animate-pulse">
                    <span className="text-xs text-slate-950 font-black italic">!</span>
                  </div>
                )}
              </div>

              {/* Info Label Below Circle */}
              <div className="mt-3 flex flex-col items-center gap-1 max-w-[100px]">
                <span className={cn(
                  "text-xs font-black uppercase tracking-widest truncate w-full text-center px-1.5 py-0.5 rounded transition-colors",
                  isDead ? "text-slate-700" : "text-slate-200 bg-slate-900/40 border border-slate-800 shadow-sm"
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
                     
                     {/* ST Status Flags */}
                     <div className="flex gap-1 mt-1 flex-wrap justify-center">
                        {isPoisoned && (
                           <span className="text-[8px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded shadow-sm uppercase">Psn</span>
                        )}
                        {isDrunk && (
                           <span className="text-[8px] font-black bg-amber-600 text-slate-950 px-1.5 py-0.5 rounded shadow-sm uppercase">Drk</span>
                        )}
                        {isUsed && (
                           <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shadow-sm uppercase">Used</span>
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
