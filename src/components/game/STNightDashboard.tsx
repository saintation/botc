import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import { resolveNightActions, getNightSuggestions } from '../../lib/rulesEngine';
import { Button } from '../ui/Button';
import type { SecretRoomState } from '../../types/game';

export function STNightDashboard() {
  const { roomId, roomState } = useGameStore();
  const { secretState, updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);
  const [loading, setLoading] = useState(false);
  const [tempSecretState, setTempSecretState] = useState<SecretRoomState | null>(null);

  useEffect(() => {
    if (secretState && !tempSecretState) {
      setTempSecretState(JSON.parse(JSON.stringify(secretState)));
    }
  }, [secretState, tempSecretState]);

  if (!roomState || !secretState || !tempSecretState) return null;

  const players = Object.values(roomState.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const totalPlayers = players.length;
  const submittedCount = Object.keys(secretState.nightActions || {}).length;
  const allSubmitted = submittedCount >= totalPlayers;

  const handleUpdateResult = (uid: string, message: string) => {
    setTempSecretState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nightResults: {
          ...(prev.nightResults || {}),
          [uid]: { message }
        }
      };
    });
  };

  const onGenerateSuggestions = () => {
    if (!roomState || !secretState) return;
    const suggestions = getNightSuggestions(roomState, secretState);
    setTempSecretState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        nightResults: {
          ...(prev.nightResults || {}),
          ...suggestions
        }
      };
    });
  };

  const handleResolveAndWakeUp = async () => {
    if (!roomId || !tempSecretState) return;
    setLoading(true);

    try {
      const { newPublicState, newSecretState } = resolveNightActions(roomState, secretState);
      
      newSecretState.nightResults = {
        ...(newSecretState.nightResults || {}),
        ...(tempSecretState.nightResults || {})
      };

      newPublicState.status = 'day';
      await updateSecretState(newSecretState);
      await updatePublicState(newPublicState);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const infoRoles = players.filter(p => {
    const s = secretState.players[p.uid];
    return s && ['washerwoman', 'librarian', 'investigator', 'fortune_teller', 'butler', 'empath', 'undertaker'].includes(s.character || '');
  });

  return (
    <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-amber-500/20 shadow-xl text-left w-full max-w-lg backdrop-blur-sm animate-fade-in relative overflow-hidden pb-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2 relative z-10 border-b border-amber-500/10 pb-4">
        <span>📖</span> 밤 페이즈 마도서 관리
      </h2>

      <div className="mb-8 relative z-10 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wider">주요 정보 확인 및 수정</h3>
          <Button variant="outline" size="sm" onClick={onGenerateSuggestions} className="text-[10px] h-7 px-2 border-amber-500/30 text-amber-400">
             시스템 제안 생성
          </Button>
        </div>
        <div className="space-y-3">
          {infoRoles.length > 0 ? infoRoles.map(p => {
            const char = secretState.players[p.uid]?.character;
            const currentMsg = tempSecretState.nightResults?.[p.uid]?.message || "";
            return (
              <div key={p.uid} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sky-400 font-bold text-sm">{p.name} <span className="text-slate-500 font-normal ml-1">({char})</span></span>
                </div>
                <textarea 
                  value={currentMsg}
                  onChange={(e) => handleUpdateResult(p.uid, e.target.value)}
                  placeholder="플레이어에게 보낼 정보를 입력하세요..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-amber-500 min-h-[60px]"
                />
              </div>
            );
          }) : (
            <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-xl font-mono">현재 수동 확인이 필요한 직업이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="mb-8 relative z-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-slate-300 font-bold text-sm uppercase tracking-wider">플레이어 입력 현황</h3>
          <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-sky-400">
            {submittedCount} / {totalPlayers}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {players.map(p => {
            const hasSubmitted = !!secretState.nightActions?.[p.uid];
            return (
              <div key={p.uid} className={`p-2 rounded-lg text-xs flex items-center justify-between transition-all border ${hasSubmitted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-950/80 text-slate-600 border-slate-800/50'}`}>
                <span className="truncate">{p.name}</span>
                <span>{hasSubmitted ? '✓' : '⋯'}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/10 mb-6 relative z-10">
        <p className="text-xs text-amber-200/60 mb-4 leading-relaxed">
          상단의 정보 수정을 마친 후, 모든 플레이어가 입력을 완료하면 결과를 일괄 전송하고 아침을 깨울 수 있습니다.
        </p>
        <Button 
          onClick={handleResolveAndWakeUp}
          disabled={!allSubmitted || loading}
          isLoading={loading}
          variant="primary"
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg disabled:bg-slate-800 disabled:text-slate-600"
        >
          {allSubmitted ? '결과 일괄 전송 및 아침으로' : '입력 대기 중...'}
        </Button>
      </div>
      
      {!allSubmitted && (
         <Button 
          onClick={handleResolveAndWakeUp}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="w-full text-rose-500/50 hover:text-rose-500 transition-colors text-[10px]"
         >
           (강제 아침 전환 - 미입력자 무시)
         </Button>
      )}
    </div>
  );
}
