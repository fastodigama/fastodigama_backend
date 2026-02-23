/**
 * SERVER-SIDE COMMENTS COMPONENT (No 'use client')
 * 
 * This component:
 * - Fetches comments on the server
 * - Renders as static HTML
 * - No JavaScript required
 * - Best for displaying comments only
 * 
 * Usage in your article page:
 * app/articles/[id]/page.js
 */

import Image from 'next/image';

async function fetchComments(articleId) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';
    const response = await fetch(`${API_URL}/api/comments/article/${articleId}`, {
      // Revalidate comments every 60 seconds
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error('Failed to fetch comments');
      return [];
    }

    const data = await response.json();
    return data.success ? data.comments : [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export default async function CommentsSection({ articleId }) {
  const comments = await fetchComments(articleId);

  return (
    <div className="comments-section" style={styles.container}>
      <h2 style={styles.title}>Comments ({comments.length})</h2>

      {/* LOGIN NOTICE */}
      <div style={styles.loginBox}>
        <p>Comments are anonymous. Your name will appear as posted.</p>
      </div>

      {/* COMMENTS LIST */}
      <div style={styles.commentsList}>
        {comments.length === 0 ? (
          <p style={styles.noComments}>No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} style={styles.comment}>
              {/* COMMENT HEADER */}
              <div style={styles.commentHeader}>
                {comment.author?.avatarUrl && (
                  <Image
                    src={comment.author.avatarUrl}
                    alt={comment.author.displayName}
                    width={40}
                    height={40}
                    style={styles.commentAvatar}
                  />
                )}
                <div>
                  <strong style={styles.authorName}>
                    {comment.author?.displayName || comment.authorName || 'Anonymous'}
                  </strong>
                  <p style={styles.timestamp}>
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* COMMENT CONTENT */}
              <p style={styles.commentContent}>{comment.content}</p>

              {/* LIKE COUNT */}
              <div style={styles.commentActions}>
                <span style={styles.likeCount}>❤️ {comment.likes || 0}</span>
              </div>

              {/* REPLIES */}
              {comment.replies && comment.replies.length > 0 && (
                <div style={styles.replies}>
                  <p style={styles.repliesLabel}>Replies ({comment.replies.length})</p>
                  {comment.replies.map((reply) => (
                    <div key={reply._id} style={styles.reply}>
                      <div style={styles.replyHeader}>
                        {reply.author?.avatarUrl && (
                          <Image
                            src={reply.author.avatarUrl}
                            alt={reply.author.displayName}
                            width={32}
                            height={32}
                            style={styles.replyAvatar}
                          />
                        )}
                        <strong style={styles.replyAuthor}>
                          {reply.author?.displayName || reply.authorName || 'Anonymous'}
                        </strong>
                      </div>
                      <p style={styles.replyContent}>{reply.content}</p>
                      <p style={styles.replyTime}>
                        {new Date(reply.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px 0',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    fontFamily: 'Arial, sans-serif'
  },
  title: {
    fontSize: '24px',
    marginBottom: '15px'
  },
  loginBox: {
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    marginBottom: '15px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px'
  },
  commentsList: {
    marginTop: '20px'
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    padding: '20px'
  },
  comment: {
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    marginBottom: '15px',
    borderLeft: '4px solid #00f7ef'
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  commentAvatar: {
    borderRadius: '50%'
  },
  authorName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
    margin: '0'
  },
  commentContent: {
    margin: '10px 0',
    lineHeight: '1.5',
    fontSize: '14px'
  },
  commentActions: {
    marginTop: '10px'
  },
  likeCount: {
    fontSize: '13px',
    color: '#666'
  },
  replies: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eee'
  },
  repliesLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0'
  },
  reply: {
    marginLeft: '20px',
    padding: '10px',
    backgroundColor: '#fafafa',
    borderRadius: '4px',
    marginBottom: '10px'
  },
  replyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    marginBottom: '5px'
  },
  replyAvatar: {
    borderRadius: '50%'
  },
  replyAuthor: {
    fontWeight: 'bold'
  },
  replyContent: {
    margin: '5px 0',
    fontSize: '13px',
    lineHeight: '1.4'
  },
  replyTime: {
    fontSize: '11px',
    color: '#999',
    margin: '5px 0 0 0'
  }
};
