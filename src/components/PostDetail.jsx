import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Heart, Share, ExternalLink, Bookmark, BookmarkCheck, Trash2, User, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { commentsService } from '../services/comments';

// Get liked items from localStorage
function getLikedItems() {
  try {
    return JSON.parse(localStorage.getItem('likedNews') || '{}');
  } catch {
    return {};
  }
}

// Save liked items to localStorage
function setLikedItems(items) {
  localStorage.setItem('likedNews', JSON.stringify(items));
}

// Source logo colors for fallback avatars
const SOURCE_COLORS = {
  'Reuters': '#ff8000',
  'BBC': '#bb1919',
  'Al Jazeera': '#fa9000',
  'Financial Times': '#fff1e5',
  'Bloomberg': '#2800d7',
  'CNBC': '#005594',
  'CNN': '#cc0000',
  'The Guardian': '#052962',
  'AP News': '#ff322e',
  'MarketWatch': '#00ac4e',
  'Yahoo Finance': '#6001d2',
  'default': '#1d9bf0'
};

function getSourceLogo(link) {
  try {
    if (link) {
      const url = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    }
  } catch (e) {}
  return null;
}

function getSourceInitials(source) {
  if (!source) return '?';
  return source.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getSourceColor(source) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    const nativeDate = new Date(dateStr);
    if (isValid(nativeDate)) {
      return formatDistanceToNow(nativeDate, { addSuffix: true });
    }
  } catch (e) {}
  return '';
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isValid(date)) {
      return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (e) {}
  return '';
}

// Recursive comment component
function CommentItem({ comment, user, onDelete, formatDate, depth = 0, replyingToId, onStartReply, onCancelReply, onSubmitReply, replyText, setReplyText, submitting }) {
  const isNested = depth > 0;
  const isReplying = replyingToId === comment.id;

  return (
    <div className={`${isNested ? 'ml-8 border-l border-intel-700 pl-4' : ''}`}>
      <div className="py-3 border-b border-intel-700">
        <div className="flex gap-3">
          {/* Comment author avatar */}
          <div className="flex-shrink-0">
            <div className={`${isNested ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-intel-700 flex items-center justify-center`}>
              <User className={`${isNested ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
            </div>
          </div>

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">{comment.author}</span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-500 text-sm">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="text-[15px] text-white mt-1">{comment.text}</p>

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => onStartReply(comment)}
                className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Reply</span>
              </button>
              {user?.uid === comment.authorId && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Inline reply box */}
            {isReplying && (
              <div className="mt-3 pt-3 border-t border-intel-700">
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-gray-500">Replying to</span>
                  <span className="text-blue-400">@{comment.author}</span>
                </div>
                <form onSubmit={(e) => onSubmitReply(e, comment.id)} className="flex gap-3">
                  <div className="flex-shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-intel-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${comment.author}...`}
                      className="w-full bg-intel-800 text-white placeholder-gray-500 text-sm resize-none outline-none rounded-lg p-2 min-h-[60px]"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={onCancelReply}
                        className="px-3 py-1 text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!replyText.trim() || submitting}
                        className="px-3 py-1 bg-blue-500 text-white font-medium text-sm rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              onDelete={onDelete}
              formatDate={formatDate}
              depth={depth + 1}
              replyingToId={replyingToId}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              replyText={replyText}
              setReplyText={setReplyText}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { news, addToWatchlist, removeFromWatchlist, isInWatchlist } = useStore();
  const [imgError, setImgError] = useState(false);
  const [likedItems, setLikedItemsState] = useState(getLikedItems);
  const [replyText, setReplyText] = useState('');
  const [postComments, setPostComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null); // comment id for nested replies

  // Find the post by ID
  const post = news.find(item => item.id === postId);

  // Subscribe to comments from Firestore
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = commentsService.subscribeToComments(postId, (comments) => {
      setPostComments(comments);
    });

    return () => unsubscribe();
  }, [postId]);

  if (!post) {
    return (
      <div className="min-h-screen bg-intel-900 text-gray-100">
        <div className="max-w-[600px] mx-auto border-x border-intel-700 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
            <div className="flex items-center gap-4 px-4 py-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-intel-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold">Post</h2>
            </div>
          </div>
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">Post not found</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-blue-400 hover:underline"
            >
              Go back to feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = getSourceLogo(post.link);
  const isLiked = likedItems[post.id];
  const isBookmarked = isInWatchlist(post.id);

  const handleLike = () => {
    const newLikedItems = { ...likedItems };
    if (newLikedItems[post.id]) {
      delete newLikedItems[post.id];
    } else {
      newLikedItems[post.id] = true;
    }
    setLikedItemsState(newLikedItems);
    setLikedItems(newLikedItems);
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.summary || post.title,
          url: postUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      removeFromWatchlist(post.id);
    } else {
      addToWatchlist({
        id: post.id,
        type: 'news',
        name: post.title.slice(0, 50),
        data: post
      });
    }
  };

  const handleSubmitReply = async (e, parentId = null) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;

    setSubmitting(true);
    try {
      await commentsService.addComment(post.id, {
        text: replyText.trim(),
        author: user?.displayName || user?.email || 'Anonymous',
        authorId: user?.uid || null,
        parentId
      });
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartReply = (comment) => {
    setReplyingToId(comment.id);
    setReplyText('');
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsService.deleteComment(commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="min-h-screen bg-intel-900 text-gray-100">
      <div className="max-w-[600px] mx-auto border-x border-intel-700 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
          <div className="flex items-center gap-4 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-intel-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Post</h2>
          </div>
        </div>

        {/* Post content */}
        <article className="px-4 py-4">
          {/* Author header */}
          <div className="flex items-start gap-3">
            {logoUrl && !imgError ? (
              <img
                src={logoUrl}
                alt=""
                className="w-12 h-12 rounded-full bg-intel-700 object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: getSourceColor(post.source) }}
              >
                {getSourceInitials(post.source)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{post.source}</p>
                  <p className="text-sm text-gray-500">{formatDate(post.pubDate)}</p>
                </div>
                <button
                  onClick={handleBookmark}
                  className="p-2 rounded-full hover:bg-intel-700 transition-colors"
                  title={isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl text-white mt-4 leading-relaxed">{post.title}</h1>

          {/* Summary */}
          {post.summary && (
            <p className="text-[15px] text-gray-300 mt-3 leading-relaxed">{post.summary}</p>
          )}

          {/* Link preview card */}
          {post.link && (
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block border border-intel-600 rounded-2xl overflow-hidden hover:bg-intel-700/30 transition-colors"
            >
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    {(() => {
                      try {
                        return new URL(post.link).hostname.replace('www.', '');
                      } catch (e) {
                        return 'View source';
                      }
                    })()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Read the full article</p>
              </div>
            </a>
          )}

          {/* Timestamp */}
          <p className="text-gray-500 text-sm mt-4 pb-4 border-b border-intel-700">
            {formatFullDate(post.pubDate)}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-around py-2 border-b border-intel-700">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 p-3 rounded-full transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400 hover:bg-pink-400/10'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 p-3 rounded-full text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
            >
              <Share className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
          </div>

          {/* Top-level reply input section */}
          {!replyingToId && (
            <div className="py-3 border-b border-intel-700">
              <form onSubmit={(e) => handleSubmitReply(e, null)} className="flex gap-3">
                {/* User avatar */}
                <div className="flex-shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-intel-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Reply input */}
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Post your reply"
                    className="w-full bg-transparent text-white placeholder-gray-500 text-[15px] resize-none outline-none min-h-[60px]"
                    rows={2}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!replyText.trim() || submitting}
                      className="px-4 py-1.5 bg-blue-500 text-white font-bold text-sm rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Comments section */}
          <div>
            {postComments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No replies yet</p>
                <p className="text-sm mt-1">Be the first to reply</p>
              </div>
            ) : (
              postComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  user={user}
                  onDelete={handleDeleteComment}
                  formatDate={formatDate}
                  depth={0}
                  replyingToId={replyingToId}
                  onStartReply={handleStartReply}
                  onCancelReply={cancelReply}
                  onSubmitReply={handleSubmitReply}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  submitting={submitting}
                />
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

export default PostDetail;
