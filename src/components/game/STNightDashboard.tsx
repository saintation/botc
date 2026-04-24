import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import { resolveNightActions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';

export function STNightDashboard() {
  const { roomId, roomState } = useGameStore();
  const { secretState, updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);
  const [loading, setLoading] = useState(false);

  if (!roomState || !secretState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const totalPlayers = players.length;
  
  // In Zero-Time Night, EVERYONE including dead players must submit "Confirm" to hide timing.
  const submittedCount = Object.keys(secretState.nightActions || {}).length;
  const allSubmitted = submittedCount >= totalPlayers;

  const handleResolveAndWakeUp = async () => {
    if (!roomId) return;
    setLoading(true);

    try {
      const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
      
      newPublicState.status = 'day';

      await updateSecretState(newSecretState);
      await updatePublicState(newPublicState);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-amber-500/20 shadow-xl text-left w-full max-w-lg backdrop-blur-sm animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2 relative z-10 border-b border-amber-500/10 pb-4">
        <span>📖</span> 스토리텔러 밤 대시보드
      </h2>

      <div className="mb-8 relative z-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-slate-300 font-medium">플레이어 입력 현황</h3>
          <span className="text-sm font-mono bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-sky-400">
            {submittedCount} / {totalPlayers}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
          {players.map(p => {
            const hasSubmitted = !!secretState.nightActions?.[p.uid];
            return (
              <div key={p.uid} className={`p-3 rounded-xl text-sm flex items-center justify-between transition-all border ${hasSubmitted ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950/80 text-slate-500 border-slate-800/50'}`}>
                <span className="truncate font-medium">{p.name}</span>
                <span className="text-lg">{hasSubmitted ? '✓' : '⋯'}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-900/20 rounded-xl border border-amber-500/20 mb-6 relative z-10 shadow-inner">
        <h3 className="text-amber-300 font-bold mb-2 flex items-center gap-2">
          <span>⚙️</span> 자동 판정 시스템
        </h3>
        <p className="text-sm text-amber-200/70 mb-4 leading-relaxed">
          모든 플레이어의 입력이 완료되면 룰 엔진이 결과를 계산합니다.
        </p>
        <Button 
          onClick={handleResolveAndWakeUp}
          disabled={!allSubmitted || loading}
          isLoading={loading}
          variant="primary"
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none border-transparent"
        >
          {allSubmitted ? '결과 일괄 전송 및 아침으로' : '모든 플레이어 입력 대기 중...'}
        </Button>
      </div>
      
      {/* For MVP ST manual override if AFK */}
      {!allSubmitted && (
         <Button 
          onClick={handleResolveAndWakeUp}
          disabled={loading}
          variant="danger"
          size="sm"
          className="w-full opacity-60 hover:opacity-100 transition-opacity mt-2"
         >
           (위험) 강제로 밤 종료하고 현재 입력만으로 판정
         </Button>
      )}
    </div>
  );
}
