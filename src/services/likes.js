import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { notificationsService } from './notifications';

const COLLECTION_NAME = 'likes';
const COMMENT_LIKES_COLLECTION = 'commentLikes';

// Extract keywords from text for recommendation
function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when', 'who', 'new', 'now', 'way', 'may', 'say', 'she', 'two', 'how', 'its', 'let', 'put', 'too', 'use', 'this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'there', 'what', 'about', 'would', 'could', 'should', 'after', 'before']);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  // Get unique words
  return [...new Set(words)].slice(0, 10);
}

export const likesService = {
  // Toggle like for a post (with optional post metadata for recommendations)
  async toggleLike(postId, userId, postData = null) {
    if (!postId || !userId) {
      console.error('[Likes] Missing postId or userId:', { postId, userId });
      return null;
    }

    const likeId = `${postId}_${userId}`;
    const likeRef = doc(db, COLLECTION_NAME, likeId);

    try {
      // Check if already liked by getting the document directly
      const docSnap = await getDoc(likeRef);

      if (!docSnap.exists()) {
        // Add like with post metadata for recommendations
        const likeData = {
          postId,
          userId,
          createdAt: new Date().toISOString()
        };

        // Store post metadata for recommendation engine
        if (postData) {
          likeData.source = postData.source || null;
          likeData.category = postData.category || null;
          likeData.feedRegion = postData.feedRegion || null;
          likeData.keywords = extractKeywords(`${postData.title} ${postData.summary || ''}`);
        }

        await setDoc(likeRef, likeData);
        console.log('[Likes] Added like:', likeId);
        return true; // liked
      } else {
        // Remove like
        await deleteDoc(likeRef);
        console.log('[Likes] Removed like:', likeId);
        return false; // unliked
      }
    } catch (error) {
      console.error('[Likes] Error toggling like:', error);
      throw error;
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
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snapshot) => {
        const likesMap = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!likesMap[data.postId]) {
            likesMap[data.postId] = { count: 0, userIds: [] };
          }
          likesMap[data.postId].count++;
          likesMap[data.postId].userIds.push(data.userId);
        });
        console.log('[Likes] Loaded', snapshot.docs.length, 'total likes');
        callback(likesMap);
      },
      (error) => {
        console.error('[Likes] Error subscribing to all likes:', error);
      }
    );
  },

  // Subscribe to user's likes (for recommendations)
  subscribeToUserLikes(userId, callback) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const userLikes = snapshot.docs.map(doc => doc.data());

      // Build recommendation profile from liked posts
      const profile = {
        likedPostIds: userLikes.map(l => l.postId),
        likedSources: {},
        likedCategories: {},
        likedKeywords: {},
        totalLikes: userLikes.length
      };

      userLikes.forEach(like => {
        // Count source preferences
        if (like.source) {
          profile.likedSources[like.source] = (profile.likedSources[like.source] || 0) + 1;
        }
        // Count category preferences
        if (like.category) {
          profile.likedCategories[like.category] = (profile.likedCategories[like.category] || 0) + 1;
        }
        // Count keyword preferences
        if (like.keywords && Array.isArray(like.keywords)) {
          like.keywords.forEach(kw => {
            profile.likedKeywords[kw] = (profile.likedKeywords[kw] || 0) + 1;
          });
        }
      });

      callback(profile);
    });
  },

  // Toggle like for a comment
  async toggleCommentLike(commentId, userId, commentData = {}) {
    if (!commentId || !userId) {
      console.error('[Likes] Missing commentId or userId:', { commentId, userId });
      return null;
    }

    const likeId = `${commentId}_${userId}`;
    const likeRef = doc(db, COMMENT_LIKES_COLLECTION, likeId);

    try {
      const docSnap = await getDoc(likeRef);

      if (!docSnap.exists()) {
        // Add like
        await setDoc(likeRef, {
          commentId,
          userId,
          createdAt: new Date().toISOString()
        });

        // Send notification to comment author
        if (commentData.authorId && commentData.authorId !== userId) {
          await notificationsService.createNotification({
            userId: commentData.authorId,
            type: 'comment_like',
            title: 'New like on your reply',
            message: `${commentData.likerName || 'Someone'} liked your reply`,
            postId: commentData.postId,
            fromUserId: userId,
            fromUserName: commentData.likerName,
            fromUserPhoto: commentData.likerPhoto
          });
        }

        return true; // liked
      } else {
        // Remove like
        await deleteDoc(likeRef);
        return false; // unliked
      }
    } catch (error) {
      console.error('[Likes] Error toggling comment like:', error);
      throw error;
    }
  },

  // Subscribe to likes for a specific comment
  subscribeToCommentLikes(commentId, callback) {
    const q = query(
      collection(db, COMMENT_LIKES_COLLECTION),
      where('commentId', '==', commentId)
    );

    return onSnapshot(q, (snapshot) => {
      const likes = snapshot.docs.map(doc => doc.data());
      callback({
        count: likes.length,
        userIds: likes.map(l => l.userId)
      });
    });
  },

  // Subscribe to all comment likes for a post's comments
  subscribeToAllCommentLikes(commentIds, callback) {
    if (!commentIds || commentIds.length === 0) {
      callback({});
      return () => {};
    }

    return onSnapshot(
      collection(db, COMMENT_LIKES_COLLECTION),
      (snapshot) => {
        const likesMap = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (commentIds.includes(data.commentId)) {
            if (!likesMap[data.commentId]) {
              likesMap[data.commentId] = { count: 0, userIds: [] };
            }
            likesMap[data.commentId].count++;
            likesMap[data.commentId].userIds.push(data.userId);
          }
        });
        callback(likesMap);
      }
    );
  }
};
