import { useState, useEffect } from 'react';
import { auth, loginAnonymously } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // If no user is logged in, automatically log in anonymously
        loginAnonymously()
          .then((newUser) => {
            setUser(newUser);
            setLoading(false);
          })
          .catch((err) => {
            setError(err);
            setLoading(false);
          });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { user, loading, error };
}
