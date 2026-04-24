import { useEffect, useState } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
import { database } from '../lib/firebase';
import { useGameStore } from '../store/gameStore';
import type { PublicRoomState, SecretRoomState, SecretPlayer, NightAction, NightResult } from '../types/game';

// Hook for public game data
export function useGameData(roomId: string | null) {
  const setRoomState = useGameStore((state) => state.setRoomState);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(database, `public/rooms/${roomId}`);
    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        const data = snapshot.val() as PublicRoomState;
        if (data) {
          setRoomState(data);
        }
      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [roomId, setRoomState]);

  // Method to update public room state
  const updatePublicState = async (updates: Partial<PublicRoomState>) => {
    if (!roomId) return;
    const roomRef = ref(database, `public/rooms/${roomId}`);
    await update(roomRef, updates);
  };

  return { error, updatePublicState };
}

// Hook for ST to manage all secret data
export function useSecretData(roomId: string | null, isST: boolean) {
  const [secretState, setSecretState] = useState<SecretRoomState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId || !isST) return;

    const secretRef = ref(database, `secret/rooms/${roomId}`);
    const unsubscribe = onValue(
      secretRef,
      (snapshot) => {
        const data = snapshot.val() as SecretRoomState;
        if (data) {
          setSecretState(data);
        }
      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [roomId, isST]);

  const updateSecretState = async (updates: Partial<SecretRoomState>) => {
    if (!roomId || !isST) return;
    const secretRef = ref(database, `secret/rooms/${roomId}`);
    await update(secretRef, updates);
  };

  return { secretState, error, updateSecretState };
}

// Hook for individual players to access their own secret data and actions
export function usePlayerSecretData(roomId: string | null, uid: string | null) {
  const [playerSecret, setPlayerSecret] = useState<SecretPlayer | null>(null);
  const [nightResult, setNightResult] = useState<NightResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId || !uid) return;

    const playerRef = ref(database, `secret/rooms/${roomId}/players/${uid}`);
    const unsubscribePlayer = onValue(
      playerRef,
      (snapshot) => {
        setPlayerSecret(snapshot.val() as SecretPlayer);
      },
      (err) => setError(err)
    );

    const resultRef = ref(database, `secret/rooms/${roomId}/nightResults/${uid}`);
    const unsubscribeResult = onValue(
      resultRef,
      (snapshot) => {
        const val = snapshot.val();
        setNightResult(val ? (val as NightResult) : null);
      },
      (err) => setError(err)
    );

    return () => {
      unsubscribePlayer();
      unsubscribeResult();
    };
  }, [roomId, uid]);

  const submitNightAction = async (action: NightAction) => {
    if (!roomId || !uid) return;
    const actionRef = ref(database, `secret/rooms/${roomId}/nightActions/${uid}`);
    await set(actionRef, action);
  };

  return { playerSecret, nightResult, error, submitNightAction };
}
