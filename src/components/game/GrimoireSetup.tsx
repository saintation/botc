import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import type { RoleType, Alignment } from '../../types/character';
import type { SecretPlayer } from '../../types/game';
import { Button } from '../ui/Button';

// Simple mapping for Trouble Brewing for the UI dropdowns
const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good' },
  { id: 'librarian', name: '사서', align: 'good' },
  { id: 'investigator', name: '조사자', align: 'good' },
  { id: 'chef', name: '요리사', align: 'good' },
  { id: 'empath', name: '공감자', align: 'good' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good' },
  { id: 'undertaker', name: '장의사', align: 'good' },
  { id: 'monk', name: '수도승', align: 'good' },
  { id: 'ravenkeeper', name: '까마귀사육사', align: 'good' },
  { id: 'virgin', name: '처녀', align: 'good' },
  { id: 'slayer', name: '학살자', align: 'good' },
  { id: 'soldier', name: '군인', align: 'good' },
  { id: 'mayor', name: '시장', align: 'good' },
  { id: 'butler', name: '집사', align: 'good' },
  { id: 'drunk', name: '취객', align: 'good' },
  { id: 'recluse', name: '은둔자', align: 'good' },
  { id: 'saint', name: '성자', align: 'good' },
  { id: 'poisoner', name: '독술사', align: 'evil' },
  { id: 'spy', name: '스파이', align: 'evil' },
  { id: 'scarlet_woman', name: '홍등가 여인', align: 'evil' },
  { id: 'baron', name: '남작', align: 'evil' },
  { id: 'imp', name: '임프', align: 'evil' },
];

export function GrimoireSetup() {
  const { roomId, roomState } = useGameStore();
  const { updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);

  const [orderedPlayers, setOrderedPlayers] = useState<{ uid: string; name: string }[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Record<string, RoleType>>({});
  const [loading, setLoading] = useState(false);

  // Initialize orderedPlayers when roomState loads, but only once
  useEffect(() => {
    if (roomState?.players && orderedPlayers.length === 0) {
      const initialPlayers = Object.values(roomState.players).map((p) => ({ uid: p.uid, name: p.name }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderedPlayers(initialPlayers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState?.players]);

  const movePlayer = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= orderedPlayers.length) return;
    
    const newArr = [...orderedPlayers];
    const temp = newArr[index];
    newArr[index] = newArr[newIndex];
    newArr[newIndex] = temp;
    
    setOrderedPlayers(newArr);
  };

  const handleRoleChange = (uid: string, roleId: RoleType) => {
    setAssignedRoles(prev => ({ ...prev, [uid]: roleId }));
  };

  const handleStartGame = async () => {
    if (!roomId || !roomState) return;
    setLoading(true);

    try {
      // 1. Build Secret State
      const newSecretPlayers: Record<string, SecretPlayer> = {};
      orderedPlayers.forEach((p) => {
        const roleId = assignedRoles[p.uid];
        const roleDef = TROUBLE_BREWING_ROLES.find(r => r.id === roleId);
        newSecretPlayers[p.uid] = {
          character: roleId || null,
          alignment: roleDef?.align || null,
          isDrunk: false,
          isPoisoned: false,
          bluffs: [], // Simplified for MVP
        };
      });

      await updateSecretState({ players: newSecretPlayers });

      // 2. Build Public State (Seats + Transition to Night)
      const newPublicPlayers = { ...roomState.players };
      orderedPlayers.forEach((p, index) => {
        if (newPublicPlayers[p.uid]) {
          newPublicPlayers[p.uid].seatIndex = index;
        }
      });

      await updatePublicState({
        players: newPublicPlayers,
        status: 'night',
        dayNumber: 1,
      });

    } catch (err) {
      console.error('Failed to start game', err);
    } finally {
      setLoading(false);
    }
  };

  const allAssigned = orderedPlayers.length > 0 && orderedPlayers.every(p => assignedRoles[p.uid]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg animate-fade-in">
      <div className="bg-slate-900/80 p-5 sm:p-6 rounded-xl border border-slate-800 backdrop-blur">
        <h2 className="text-xl font-bold text-sky-400 mb-2 flex items-center gap-2">
          <span>마도서 세팅</span>
        </h2>
        <p className="text-sm text-slate-400 mb-6 border-b border-slate-800/50 pb-4">
          오프라인 원형 테이블과 동일하게 좌석 순서를 맞추고, 각 플레이어의 직업을 배정해주세요.
        </p>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {orderedPlayers.map((p, index) => (
            <div key={p.uid} className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 shadow-sm flex items-center gap-4 transition-all hover:border-slate-700">
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => movePlayer(index, -1)}
                  disabled={index === 0}
                  className="text-slate-600 hover:text-sky-400 disabled:opacity-20 transition-colors p-1"
                  aria-label="위로 이동"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </button>
                <button 
                  onClick={() => movePlayer(index, 1)}
                  disabled={index === orderedPlayers.length - 1}
                  className="text-slate-600 hover:text-sky-400 disabled:opacity-20 transition-colors p-1"
                  aria-label="아래로 이동"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.14645 12.8536C7.34171 13.0488 7.65829 13.0488 7.85355 12.8536L11.8536 8.85355C12.0488 8.65829 12.0488 8.34171 11.8536 8.14645C11.6583 7.95118 11.3417 7.95118 11.1464 8.14645L8 11.2929L8 2.5C8 2.22386 7.77614 2 7.5 2C7.22386 2 7 2.22386 7 2.5L7 11.2929L3.85355 8.14645C3.65829 7.95118 3.34171 7.95118 3.14645 8.14645C2.95118 8.34171 2.95118 8.65829 3.14645 8.85355L7.14645 12.8536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </button>
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                <div className="font-medium text-slate-200 flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">좌석 {index + 1}</span>
                </div>
                <select
                  value={assignedRoles[p.uid] || ''}
                  onChange={(e) => handleRoleChange(p.uid, e.target.value as RoleType)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all cursor-pointer"
                >
                  <option value="" disabled>직업을 선택하세요</option>
                  {TROUBLE_BREWING_ROLES.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.align === 'good' ? '선' : '악'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleStartGame}
        disabled={loading || !allAssigned}
        isLoading={loading}
        variant="danger"
        size="lg"
        className="w-full bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)] border-transparent"
      >
        밤으로 진입하기 (게임 시작)
      </Button>
      </div>
      );
      }
