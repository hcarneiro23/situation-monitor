import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

const COLLECTION_NAME = 'userPreferences';

export const userPreferencesService = {
  // Get user preferences from Firestore
  async getPreferences(userId) {
    if (!userId) return null;

    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('[UserPrefs] Error getting preferences:', error);
      return null;
    }
  },

  // Save user preferences to Firestore
  async savePreferences(userId, preferences) {
    if (!userId) return false;

    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(docRef, {
        ...preferences,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('[UserPrefs] Saved preferences for user:', userId);
      return true;
    } catch (error) {
      console.error('[UserPrefs] Error saving preferences:', error);
      return false;
    }
  },

  // Subscribe to user preferences changes
  subscribeToPreferences(userId, callback) {
    if (!userId) {
      callback(null);
      return () => {};
    }

    const docRef = doc(db, COLLECTION_NAME, userId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('[UserPrefs] Error subscribing to preferences:', error);
        callback(null);
      }
    );
  },

  // Save specific preference
  async saveCity(userId, city) {
    return this.savePreferences(userId, { userCity: city });
  },

  async saveInterests(userId, interests) {
    return this.savePreferences(userId, { userInterests: interests });
  },

  async saveFollowedSources(userId, sources) {
    return this.savePreferences(userId, { followedSources: sources });
  },

  async saveOnboardingCompleted(userId, completed) {
    return this.savePreferences(userId, { onboardingCompleted: completed });
  }
};
