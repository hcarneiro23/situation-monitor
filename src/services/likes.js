import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore';

const COLLECTION_NAME = 'likes';

export const likesService = {
  // Toggle like for a post
  async toggleLike(postId, userId) {
    const likeId = `${postId}_${userId}`;
    const likeRef = doc(db, COLLECTION_NAME, likeId);

    // Check if already liked
    const q = query(
      collection(db, COLLECTION_NAME),
      where('postId', '==', postId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Add like
      await setDoc(likeRef, {
        postId,
        userId,
        createdAt: new Date().toISOString()
      });
      return true; // liked
    } else {
      // Remove like
      await deleteDoc(likeRef);
      return false; // unliked
    }
  },

  // Subscribe to likes for a post
  subscribeToLikes(postId, callback) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      const likes = snapshot.docs.map(doc => doc.data());
      callback({
        count: likes.length,
        userIds: likes.map(l => l.userId)
      });
    });
  },

  // Subscribe to all likes (for feed view)
  subscribeToAllLikes(callback) {
    return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const likesMap = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!likesMap[data.postId]) {
          likesMap[data.postId] = { count: 0, userIds: [] };
        }
        likesMap[data.postId].count++;
        likesMap[data.postId].userIds.push(data.userId);
      });
      callback(likesMap);
    });
  }
};
