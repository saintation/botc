import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameData } from '../../hooks/useFirebaseSync';
import { database } from '../../lib/firebase';
import { ref, update, get } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function PlayerLobby() {
  const { user } = useAuth();
  const { roomId, setRoomId } = useGameStore();
  const { roomState } = useGameStore();
  useGameData(roomId); // Sync data if roomId exists

  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputCode || !inputName) return;
    
    setLoading(true);
    setError('');

    try {
      // Check if room exists
      const roomRef = ref(database, `public/rooms/${inputCode}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        setError('존재하지 않는 방 코드입니다.');
        return;
      }

      const currentStatus = snapshot.val().status;
      if (currentStatus !== 'lobby') {
         setError('이미 게임이 진행 중이거나 종료된 방입니다.');
         return;
      }

      // Join room
      await update(ref(database, `public/rooms/${inputCode}/players/${user.uid}`), {
        uid: user.uid,
        name: inputName,
        isDead: false,
        hasGhostVote: false,
        seatIndex: -1, // Not seated yet
      });

      setRoomId(inputCode);
    } catch (err: unknown) {
      console.error(err);
      setError('방 입장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!roomId) {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full max-w-sm">
        <h2 className="text-xl font-bold text-slate-300 text-center mb-4">플레이어 입장</h2>
        
        <div>
          <label className="block text-slate-400 text-sm mb-1">방 코드</label>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.trim())}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-3 outline-none focus:border-sky-400 transition-colors tracking-widest text-center text-lg"
            placeholder="6자리 숫자"
            maxLength={6}
            required
          />
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1">닉네임</label>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-3 outline-none focus:border-sky-400 transition-colors"
            placeholder="당신의 이름"
            maxLength={10}
            required
          />
        </div>

        {error && <p className="text-rose-500 text-sm text-center">{error}</p>}

        <Button
          type="submit"
          disabled={loading || !user || !inputCode || !inputName}
          isLoading={loading}
          variant="primary"
          size="lg"
          className="w-full mt-2"
        >
          입장하기
        </Button>
      </form>
    );
  }

  // Already joined, waiting for ST
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center">
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 w-full shadow-lg">
        <h2 className="text-xl font-bold text-slate-300 mb-2">로비 대기 중</h2>
        <p className="text-slate-400 text-sm mb-6">
          스토리텔러가 마도서를 세팅하고 있습니다.<br/>
          잠시만 기다려주세요.
        </p>
        
        <div className="inline-block border border-sky-400/50 text-sky-400 rounded-full px-4 py-1.5 text-sm bg-sky-400/10 font-mono">
          방 코드: {roomId}
        </div>
      </div>
      
      {roomState?.status === 'setup' && (
        <div className="text-amber-400 animate-pulse font-medium bg-amber-400/10 px-4 py-2 rounded-full border border-amber-400/20">
          스토리텔러가 역할 배정을 시작했습니다!
        </div>
      )}
    </div>
  );
}
