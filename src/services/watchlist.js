import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'watchlists';

export const watchlistService = {
  // Get watchlist from Firestore
  async getWatchlist(userId) {
    if (!userId) return [];

    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data().items || [];
      }
      return [];
    } catch (error) {
      console.error('[Watchlist] Error getting watchlist:', error);
      return [];
    }
  },

  // Save watchlist to Firestore
  async saveWatchlist(userId, watchlist) {
    if (!userId) return false;

    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(docRef, {
        items: watchlist,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('[Watchlist] Error saving watchlist:', error);
      return false;
    }
  }
};
