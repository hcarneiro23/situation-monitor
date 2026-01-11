import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'notifications';

export const notificationsService = {
  // Create a notification
  async createNotification({ userId, type, title, message, postId, fromUserId, fromUserName, fromUserPhoto }) {
    if (!userId || userId === fromUserId) return null; // Don't notify yourself

    try {
      // Build notification object, excluding undefined fields (Firestore doesn't allow undefined)
      const notification = {
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: serverTimestamp()
      };

      // Only add optional fields if they have values
      if (postId !== undefined) notification.postId = postId;
      if (fromUserId !== undefined) notification.fromUserId = fromUserId;
      if (fromUserName !== undefined) notification.fromUserName = fromUserName;
      if (fromUserPhoto !== undefined) notification.fromUserPhoto = fromUserPhoto;

      const docRef = await addDoc(collection(db, COLLECTION_NAME), notification);
      return docRef.id;
    } catch (error) {
      console.error('[Notifications] Error creating notification:', error);
      return null;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notifRef = doc(db, COLLECTION_NAME, notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  },

  // Subscribe to notifications for a user
  subscribeToNotifications(userId, callback) {
    if (!userId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        // Sort by createdAt descending (newest first)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(notifications);
      },
      (error) => {
        console.error('[Notifications] Error subscribing:', error);
        callback([]);
      }
    );
  }
};
