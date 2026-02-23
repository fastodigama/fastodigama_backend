/**
 * NEXT.JS EXAMPLE: Comments Component
 * 
 * This shows how to use fetch() in Next.js to:
 * 1. Get comments from the Express API
 * 2. Display visitor names and avatars
 * 3. Post new comments
 * 
 * Place this file in your Next.js project:
 * app/components/CommentsSection.js
 */

'use client'; // This is needed for Next.js App Router

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function CommentsSection({ articleId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentReader, setCurrentReader] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Change this to your Express backend URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

    // ===== LOAD COMMENTS =====
    useEffect(() => {
        fetchComments();
        checkLogin();
    }, [articleId]);

    // Get all approved comments for this article
    async function fetchComments() {
        try {
            const response = await fetch(
                `${API_URL}/api/comments/article/${articleId}`
            );
            const data = await response.json();
            
            if (data.success) {
                setComments(data.comments);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    }

    // Check if reader is logged in
    async function checkLogin() {
        try {
            const response = await fetch(`${API_URL}/api/reader/me`, {
                credentials: 'include' // Include cookies for session
            });
            
            if (response.ok) {
                const data = await response.json();
                setCurrentReader(data);
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error('Error checking login:', error);
        }
    }

    // ===== SUBMIT NEW COMMENT =====
    async function handleSubmitComment(e) {
        e.preventDefault();

        if (!newComment.trim()) return;
        if (!isLoggedIn) {
            alert('Please login with TikTok to comment');
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include session cookie
                body: JSON.stringify({
                    articleId,
                    content: newComment,
                    parentId: null // Top-level comment (not a reply)
                })
            });

            const data = await response.json();

            if (data.success) {
                setNewComment('');
                // Refresh comments
                fetchComments();
                alert('Comment submitted! It will appear after admin approval.');
            } else {
                alert('Error: ' + (data.error || 'Failed to post comment'));
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    }

    // ===== LIKE A COMMENT =====
    async function handleLikeComment(commentId) {
        try {
            const response = await fetch(
                `${API_URL}/api/comments/${commentId}/like`,
                {
                    method: 'PUT',
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                fetchComments(); // Refresh to show updated like count
            }
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    // ===== HANDLE TIKTOK LOGIN =====
    async function handleTikTokLogin() {
        // In a real app, you'd redirect to TikTok OAuth
        // For demo, we'll use a mock login
        
        // Example: After TikTok OAuth redirect, call:
        try {
            const response = await fetch(`${API_URL}/api/reader/tiktok-callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    tiktokId: 'user123',
                    displayName: 'Demo_User',
                    avatarUrl: 'https://via.placeholder.com/40',
                    bio: 'A TikTok visitor'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentReader(data.reader);
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    }

    // ===== RENDER =====
    return (
        <div className="comments-section" style={styles.container}>
            <h2 style={styles.title}>Comments ({comments.length})</h2>

            {/* LOGIN SECTION */}
            <div style={styles.loginBox}>
                {!isLoggedIn ? (
                    <div>
                        <p>Login with TikTok to comment:</p>
                        <button onClick={handleTikTokLogin} style={styles.button}>
                            🎵 Login with TikTok
                        </button>
                    </div>
                ) : (
                    <div style={styles.userInfo}>
                        {currentReader?.avatarUrl && (
                            <Image
                                src={currentReader.avatarUrl}
                                alt={currentReader.displayName}
                                width={40}
                                height={40}
                                style={styles.avatar}
                            />
                        )}
                        <span>Welcome, {currentReader?.displayName}!</span>
                    </div>
                )}
            </div>

            {/* COMMENT FORM */}
            {isLoggedIn && (
                <form onSubmit={handleSubmitComment} style={styles.form}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        style={styles.textarea}
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        style={styles.submitButton}
                        disabled={submitting || !newComment.trim()}
                    >
                        {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </form>
            )}

            {/* LOADING STATE */}
            {loading && <p>Loading comments...</p>}

            {/* COMMENTS LIST */}
            <div style={styles.commentsList}>
                {comments.length === 0 && !loading ? (
                    <p style={styles.noComments}>No comments yet. Be the first!</p>
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
                                        @{comment.author?.displayName}
                                    </strong>
                                    <p style={styles.timestamp}>
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* COMMENT CONTENT */}
                            <p style={styles.commentContent}>{comment.content}</p>

                            {/* COMMENT ACTIONS */}
                            <div style={styles.commentActions}>
                                <button
                                    onClick={() => handleLikeComment(comment._id)}
                                    style={styles.likeButton}
                                >
                                    ❤️ {comment.likes || 0}
                                </button>
                            </div>

                            {/* REPLIES */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div style={styles.replies}>
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
                                                <strong>@{reply.author?.displayName}</strong>
                                            </div>
                                            <p style={styles.replyContent}>{reply.content}</p>
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

// ===== SIMPLE STYLES =====
const styles = {
    container: {
        maxWidth: '600px',
        margin: '20px 0',
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
        textAlign: 'center'
    },
    button: {
        backgroundColor: '#000',
        color: '#fff',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    avatar: {
        borderRadius: '50%'
    },
    form: {
        marginBottom: '20px'
    },
    textarea: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        minHeight: '80px',
        fontFamily: 'Arial, sans-serif'
    },
    submitButton: {
        marginTop: '10px',
        padding: '10px 20px',
        backgroundColor: '#00f7ef',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    commentsList: {
        marginTop: '20px'
    },
    noComments: {
        textAlign: 'center',
        color: '#666'
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
        fontSize: '14px'
    },
    timestamp: {
        fontSize: '12px',
        color: '#999',
        margin: '0'
    },
    commentContent: {
        margin: '10px 0',
        lineHeight: '1.5'
    },
    commentActions: {
        marginTop: '10px'
    },
    likeButton: {
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '5px 10px'
    },
    replies: {
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #eee'
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
        fontSize: '13px'
    },
    replyAvatar: {
        borderRadius: '50%'
    },
    replyContent: {
        margin: '8px 0 0 0',
        fontSize: '13px'
    }
};
