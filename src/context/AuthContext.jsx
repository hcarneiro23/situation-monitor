import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useStore } from '../store/useStore';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadUserPreferences = useStore(state => state.loadUserPreferences);
  const clearUserPreferences = useStore(state => state.clearUserPreferences);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Load user-specific preferences from Firestore
      if (user) {
        await loadUserPreferences(user.uid);
      } else {
        clearUserPreferences();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserPreferences, clearUserPreferences]);

  const signIn = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const signUp = async (email, password) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      clearUserPreferences();
      await firebaseSignOut(auth);
    } catch (err) {
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const updateProfile = async ({ displayName, photoURL }) => {
    setError(null);
    try {
      if (!auth.currentUser) throw new Error('No user logged in');
      await firebaseUpdateProfile(auth.currentUser, { displayName, photoURL });
      // Force refresh user state
      setUser({ ...auth.currentUser });
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    default:
      return 'An error occurred. Please try again.';
  }
}
