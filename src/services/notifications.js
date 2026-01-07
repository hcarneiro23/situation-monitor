import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

const COLLECTION_NAME = 'notifications';

export const notificationsService = {
  // Create a notification
  async createNotification({ userId, type, title, message, postId, fromUserId, fromUserName, fromUserPhoto }) {
    if (!userId || userId === fromUserId) return null; // Don't notify yourself

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      type,
      title,
      message,
      postId,
      fromUserId,
      fromUserName,
      fromUserPhoto,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    const notifRef = doc(db, COLLECTION_NAME, notificationId);
    await updateDoc(notifRef, { read: true });
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await q.get();
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  },

  // Subscribe to notifications for a user
  subscribeToNotifications(userId, callback) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      callback(notifications);
    });
  }
};
