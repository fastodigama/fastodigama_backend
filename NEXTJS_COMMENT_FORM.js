/**
 * ANONYMOUS COMMENT FORM (Client Component)
 * 
 * Simple form to post comments without login
 * Separate from the display component
 * 
 * Usage:
 * import CommentForm from '@/components/CommentForm';
 * <CommentForm articleId={params.id} />
 */

'use client';

import { useState } from 'react';

export default function CommentForm({ articleId, onCommentPosted }) {
    const [content, setContent] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

    async function handleSubmit(e) {
        e.preventDefault();

        if (!content.trim()) {
            setMessage('Please write a comment');
            return;
        }

        setSubmitting(true);
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId,
                    content: content.trim(),
                    authorName: authorName.trim() || 'Anonymous',
                    parentId: null
                })
            });

            const data = await response.json();

            if (data.success) {
                setContent('');
                setAuthorName('');
                setMessage('✓ Comment submitted! It will appear after admin approval.');
                
                // Callback to refresh comments if provided
                if (onCommentPosted) {
                    onCommentPosted();
                }
            } else {
                setMessage('❌ Error: ' + (data.error || 'Failed to post comment'));
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            setMessage('❌ Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>Leave a Comment</h3>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* NAME FIELD */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                        Your Name (Optional)
                    </label>
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Leave blank for Anonymous"
                        style={styles.input}
                        disabled={submitting}
                    />
                </div>

                {/* COMMENT FIELD */}
                <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                        Comment <span style={styles.required}>*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Share your thoughts..."
                        style={styles.textarea}
                        disabled={submitting}
                    />
                </div>

                {/* MESSAGE */}
                {message && (
                    <div style={styles.message}>
                        {message}
                    </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    style={{
                        ...styles.submitButton,
                        opacity: submitting || !content.trim() ? 0.6 : 1,
                        cursor: submitting || !content.trim() ? 'not-allowed' : 'pointer'
                    }}
                    disabled={submitting || !content.trim()}
                >
                    {submitting ? 'Posting...' : 'Post Comment'}
                </button>
            </form>
        </div>
    );
}

// ===== STYLES =====
const styles = {
    container: {
        maxWidth: '600px',
        margin: '30px 0',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif'
    },
    title: {
        fontSize: '18px',
        marginBottom: '15px',
        marginTop: 0
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    label: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#333'
    },
    required: {
        color: 'red'
    },
    input: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        width: '100%'
    },
    textarea: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        minHeight: '100px',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        width: '100%',
        resize: 'vertical'
    },
    message: {
        padding: '10px',
        borderRadius: '6px',
        fontSize: '13px',
        backgroundColor: '#f0f0f0',
        color: '#333',
        border: '1px solid #ddd'
    },
    submitButton: {
        padding: '10px 20px',
        backgroundColor: '#00f7ef',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'all 0.2s'
    }
};
