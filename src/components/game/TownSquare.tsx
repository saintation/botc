import { useGameStore } from '../../store/gameStore';
import { useSecretData } from '../../hooks/useFirebaseSync';
import { cn } from '../../lib/utils/cn';

export function TownSquare() {
  const { roomId, roomState, role } = useGameStore();
  const { secretState } = useSecretData(roomId, role === 'st');

  if (!roomState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const isSpy = role === 'player' && secretState?.players[roomState.players[Object.keys(roomState.players).find(k => roomState.players[k].uid === Object.keys(roomState.players)[0])!].uid]?.character === 'spy';
  const showFullInfo = role === 'st' || isSpy;

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Town Square</h3>
        <div className="flex gap-2 items-center">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[10px] text-slate-400 font-mono uppercase">{roomState.status} - Day {roomState.dayNumber}</span>
        </div>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
        {players.map((p) => {
          const secret = secretState?.players[p.uid];
          return (
            <div key={p.uid} className="flex flex-col items-center gap-1.5 min-w-[60px]">
              <div className={cn(
                "relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                p.isDead ? "border-slate-800 grayscale bg-slate-950" : "border-slate-700 bg-slate-900 shadow-sm",
                showFullInfo && secret?.alignment === 'evil' && "border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
              )}>
                {/* Character Icon / Marker */}
                {showFullInfo ? (
                  <span className={cn("text-[9px] font-bold", secret?.alignment === 'good' ? "text-sky-400" : "text-rose-500")}>
                    {secret?.character?.substring(0, 2).toUpperCase() || '?'}
                  </span>
                ) : (
                  <span className="text-slate-600 text-[10px] font-bold">{p.seatIndex + 1}</span>
                )}
                
                {/* Death Marker */}
                {p.isDead && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[2px] bg-rose-900/80 rotate-45"></div>
                    <div className="w-full h-[2px] bg-rose-900/80 -rotate-45"></div>
                  </div>
                )}

                {/* Ghost Vote Marker */}
                {p.isDead && p.hasGhostVote && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-sm">
                    <span className="text-[8px] text-slate-950 font-black">!</span>
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate w-full text-center px-1",
                p.isDead ? "text-slate-600" : "text-slate-300"
              )}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
