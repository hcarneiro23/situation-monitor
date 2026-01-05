import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'comments';

export const commentsService = {
  // Add a new comment
  async addComment(postId, { text, author, authorId }) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      postId,
      text,
      author,
      authorId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Delete a comment
  async deleteComment(commentId) {
    await deleteDoc(doc(db, COLLECTION_NAME, commentId));
  },

  // Subscribe to comments for a post (real-time updates)
  subscribeToComments(postId, callback) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to ISO string
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      // Sort client-side instead (newest first)
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(comments);
    });
  }
};
