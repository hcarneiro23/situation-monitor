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
  // Add a new comment (parentId for replies)
  async addComment(postId, { text, author, authorId, authorPhotoURL = null, parentId = null }) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      postId,
      text,
      author,
      authorId,
      authorPhotoURL,
      parentId,
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
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));

      // Build nested structure
      const commentMap = {};
      const rootComments = [];

      // First pass: create map
      comments.forEach(comment => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });

      // Second pass: build tree
      comments.forEach(comment => {
        if (comment.parentId && commentMap[comment.parentId]) {
          commentMap[comment.parentId].replies.push(commentMap[comment.id]);
        } else if (!comment.parentId) {
          rootComments.push(commentMap[comment.id]);
        }
      });

      // Sort root comments and replies (newest first for roots, oldest first for replies)
      rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      Object.values(commentMap).forEach(comment => {
        comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });

      callback(rootComments);
    });
  }
};
