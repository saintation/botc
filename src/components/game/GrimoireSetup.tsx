import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSecretData, useGameData } from '../../hooks/useFirebaseSync';
import type { RoleType, Alignment } from '../../types/character';
import type { SecretPlayer } from '../../types/game';
import { Button } from '../ui/Button';

const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment; type: string }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good', type: 'townsfolk' },
  { id: 'librarian', name: '사서', align: 'good', type: 'townsfolk' },
  { id: 'investigator', name: '조사자', align: 'good', type: 'townsfolk' },
  { id: 'chef', name: '요리사', align: 'good', type: 'townsfolk' },
  { id: 'empath', name: '공감자', align: 'good', type: 'townsfolk' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good', type: 'townsfolk' },
  { id: 'undertaker', name: '장의사', align: 'good', type: 'townsfolk' },
  { id: 'monk', name: '수도승', align: 'good', type: 'townsfolk' },
  { id: 'ravenkeeper', name: '까마귀사육사', align: 'good', type: 'townsfolk' },
  { id: 'virgin', name: '처녀', align: 'good', type: 'townsfolk' },
  { id: 'slayer', name: '학살자', align: 'good', type: 'townsfolk' },
  { id: 'soldier', name: '군인', align: 'good', type: 'townsfolk' },
  { id: 'mayor', name: '시장', align: 'good', type: 'townsfolk' },
  { id: 'butler', name: '집사', align: 'good', type: 'outsider' },
  { id: 'drunk', name: '취객', align: 'good', type: 'outsider' },
  { id: 'recluse', name: '은둔자', align: 'good', type: 'outsider' },
  { id: 'saint', name: '성자', align: 'good', type: 'outsider' },
  { id: 'poisoner', name: '독술사', align: 'evil', type: 'minion' },
  { id: 'spy', name: '스파이', align: 'evil', type: 'minion' },
  { id: 'scarlet_woman', name: '홍등가 여인', align: 'evil', type: 'minion' },
  { id: 'baron', name: '남작', align: 'evil', type: 'minion' },
  { id: 'imp', name: '임프', align: 'evil', type: 'demon' },
];

// Standard proportions for Trouble Brewing
const GET_PROPORTIONS = (count: number) => {
  if (count < 7) {
    if (count === 5) return { townsfolk: 3, outsider: 0, minion: 1, demon: 1 };
    if (count === 6) return { townsfolk: 3, outsider: 1, minion: 1, demon: 1 };
  }
  if (count >= 7 && count <= 9) {
    const outs = count - 7;
    return { townsfolk: 5, outsider: outs, minion: 1, demon: 1 };
  }
  if (count >= 10 && count <= 12) {
    const outs = count - 10;
    return { townsfolk: 7, outsider: outs, minion: 2, demon: 1 };
  }
  if (count >= 13 && count <= 15) {
    const outs = count - 13;
    return { townsfolk: 9, outsider: outs, minion: 3, demon: 1 };
  }
  return { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
};

export function GrimoireSetup() {
  const { roomId, roomState } = useGameStore();
  const { updateSecretState } = useSecretData(roomId, true);
  const { updatePublicState } = useGameData(roomId);

  const [orderedPlayers, setOrderedPlayers] = useState<{ uid: string; name: string }[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Record<string, RoleType>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomState?.players && orderedPlayers.length === 0) {
      const initialPlayers = Object.values(roomState.players).map((p) => ({ uid: p.uid, name: p.name }));
      setOrderedPlayers(initialPlayers);
    }
  }, [roomState?.players, orderedPlayers.length]);

  const handleRandomSeats = () => {
    setOrderedPlayers([...orderedPlayers].sort(() => Math.random() - 0.5));
  };

  const handleRandomRoles = () => {
    if (orderedPlayers.length === 0) return;
    const proportions = GET_PROPORTIONS(orderedPlayers.length);
    const pool: RoleType[] = [];

    // Simple randomizer logic
    const townsfolkPool = TROUBLE_BREWING_ROLES.filter(r => r.type === 'townsfolk').sort(() => Math.random() - 0.5);
    const outsiderPool = TROUBLE_BREWING_ROLES.filter(r => r.type === 'outsider').sort(() => Math.random() - 0.5);
    const minionPool = TROUBLE_BREWING_ROLES.filter(r => r.type === 'minion').sort(() => Math.random() - 0.5);
    const demonPool = TROUBLE_BREWING_ROLES.filter(r => r.type === 'demon').sort(() => Math.random() - 0.5);

    pool.push(...townsfolkPool.slice(0, proportions.townsfolk).map(r => r.id));
    pool.push(...outsiderPool.slice(0, proportions.outsider).map(r => r.id));
    pool.push(...minionPool.slice(0, proportions.minion).map(r => r.id));
    pool.push(...demonPool.slice(0, proportions.demon).map(r => r.id));

    const shuffledPool = pool.sort(() => Math.random() - 0.5);
    const newAssigned: Record<string, RoleType> = {};
    orderedPlayers.forEach((p, i) => {
      newAssigned[p.uid] = shuffledPool[i];
    });
    setAssignedRoles(newAssigned);
  };

  const handleStartGame = async () => {
    if (!roomId || !roomState) return;
    setLoading(true);

    try {
      const newSecretPlayers: Record<string, SecretPlayer> = {};
      orderedPlayers.forEach((p) => {
        const roleId = assignedRoles[p.uid];
        const roleDef = TROUBLE_BREWING_ROLES.find(r => r.id === roleId);
        newSecretPlayers[p.uid] = {
          character: roleId || null,
          alignment: roleDef?.align || null,
          isDrunk: false,
          isPoisoned: false,
          bluffs: [],
        };
      });

      await updateSecretState({ players: newSecretPlayers });

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const proportions = GET_PROPORTIONS(orderedPlayers.length);
  const allAssigned = orderedPlayers.length > 0 && orderedPlayers.every(p => assignedRoles[p.uid]);

  // Circular Layout Calculation
  const radius = 120; // Radius in pixels
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${150 + radius * Math.cos(angle)}px`,
      top: `${150 + radius * Math.sin(angle)}px`,
    };
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl animate-fade-in pb-10">
      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 backdrop-blur shadow-xl">
        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-sky-400">마도서 설계</h2>
            <p className="text-xs text-slate-500 mt-1">인원: {orderedPlayers.length}명</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter mb-1 font-bold">추천 비율</p>
            <div className="flex gap-2 text-xs font-mono">
              <span className="text-sky-400">주{proportions.townsfolk}</span>
              <span className="text-amber-400">외{proportions.outsider}</span>
              <span className="text-rose-400">하{proportions.minion}</span>
              <span className="text-rose-600">악{proportions.demon}</span>
            </div>
          </div>
        </div>

        {/* Circular Seating View */}
        <div className="relative w-[300px] h-[300px] mx-auto mb-10 bg-slate-950/50 rounded-full border border-slate-800/30">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">The Circle</div>
          </div>
          {orderedPlayers.map((p, i) => {
            const pos = getPosition(i, orderedPlayers.length);
            const role = assignedRoles[p.uid];
            const roleDef = TROUBLE_BREWING_ROLES.find(r => r.id === role);
            return (
              <div 
                key={p.uid} 
                style={pos}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
              >
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all shadow-lg overflow-hidden cursor-help
                  ${roleDef?.align === 'good' ? 'border-sky-500 bg-sky-950/80 text-sky-400' : 
                    roleDef?.align === 'evil' ? 'border-rose-500 bg-rose-950/80 text-rose-400' : 
                    'border-slate-700 bg-slate-900 text-slate-500'}`}
                  title={`${p.name}: ${roleDef?.name || '미지정'}`}
                >
                  {roleDef ? roleDef.name.substring(0, 2) : i + 1}
                </div>
                <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400 font-medium group-hover:text-white transition-colors">
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant="secondary" size="sm" onClick={handleRandomSeats} className="flex-1 text-xs">
            좌석 랜덤
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRandomRoles} className="flex-1 text-xs">
            직업 랜덤
          </Button>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {orderedPlayers.map((p, index) => (
            <div key={p.uid} className="bg-slate-950 p-3 rounded-lg border border-slate-800/60 flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-600 w-4">{index + 1}</span>
              <span className="text-sm font-medium text-slate-300 flex-1 truncate">{p.name}</span>
              <select
                value={assignedRoles[p.uid] || ''}
                onChange={(e) => setAssignedRoles(prev => ({ ...prev, [p.uid]: e.target.value as RoleType }))}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-1.5 outline-none focus:border-sky-500 w-32"
              >
                <option value="" disabled>직업 선택</option>
                {TROUBLE_BREWING_ROLES.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleStartGame}
        disabled={loading || !allAssigned}
        isLoading={loading}
        variant="primary"
        size="lg"
        className="w-full shadow-2xl"
      >
        마도서 인장 및 첫날 밤 시작
      </Button>
    </div>
  );
}
