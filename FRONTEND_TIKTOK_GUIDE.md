# Frontend TikTok OAuth Integration - Quick Start

This is a simplified guide for integrating TikTok login in your Next.js frontend.

---

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Environment Variables

Create `.env.local` in your Next.js root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

### 3. Create TikTok Login Button

Create `components/TikTokLoginButton.jsx`:

```jsx
'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TikTokLoginButton() {
  const handleLogin = async () => {
    try {
      // Get auth URL from backend
      const response = await fetch(`${API_URL}/api/reader/auth/tiktok`, {
        credentials: 'include',
      });
      const { authUrl } = await response.json();
      
      // Save current page to return after login
      sessionStorage.setItem('tiktok_return_to', window.location.pathname);
      
      // Redirect to TikTok
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to start login process');
    }
  };

  return (
    <button onClick={handleLogin} className="tiktok-login-btn">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
      Login with TikTok
    </button>
  );
}
```

### 4. Create Success Page

Create `app/auth/tiktok/success/page.jsx`:

```jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TikTokSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Get the page they were on before login
    const returnTo = sessionStorage.getItem('tiktok_return_to') || '/';
    sessionStorage.removeItem('tiktok_return_to');
    
    // Redirect back
    setTimeout(() => {
      router.push(returnTo);
    }, 1000);
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>✅ Login Successful!</h2>
      <p>Redirecting you back...</p>
    </div>
  );
}
```

### 5. Create Error Page

Create `app/auth/tiktok/error/page.jsx`:

```jsx
'use client';

import { useRouter } from 'next/navigation';

export default function TikTokError() {
  const router = useRouter();

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>❌ Login Failed</h2>
      <p>There was a problem logging in with TikTok.</p>
      <button onClick={() => router.push('/')}>
        Go Home
      </button>
    </div>
  );
}
```

### 6. Create User Context (Optional but Recommended)

Create `lib/UserContext.jsx`:

```jsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reader/me`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Check user error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/reader/logout`, {
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser: checkUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
```

### 7. Add Provider to Layout

Update `app/layout.jsx`:

```jsx
import { UserProvider } from '@/lib/UserContext';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

### 8. Create User Status Component

Create `components/UserStatus.jsx`:

```jsx
'use client';

import { useUser } from '@/lib/UserContext';
import TikTokLoginButton from './TikTokLoginButton';

export default function UserStatus() {
  const { user, loading, logout } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <TikTokLoginButton />;
  }

  return (
    <div className="user-status">
      {user.avatarUrl && (
        <img 
          src={user.avatarUrl} 
          alt={user.displayName}
          className="user-avatar"
        />
      )}
      <span>Welcome, {user.displayName}!</span>
      <button onClick={logout} className="logout-btn">
        Logout
      </button>
    </div>
  );
}
```

### 9. Complete Comments Component

Create `components/CommentsSection.jsx`:

```jsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import UserStatus from './UserStatus';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CommentsSection({ articleId }) {
  const { user, refreshUser } = useUser();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/comments/article/${articleId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    if (!user && !anonymousName.trim()) {
      alert('Please enter your name or login with TikTok');
      return;
    }

    setLoading(true);

    const commentData = {
      articleId,
      content: commentText,
      parentId: replyingTo,
    };

    if (user) {
      commentData.author = user.id;
    } else {
      commentData.anonymousName = anonymousName;
    }

    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        setCommentText('');
        setReplyingTo(null);
        await fetchComments();
      } else {
        alert('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId) => {
    try {
      await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: 'PUT',
      });
      await fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const renderComment = (comment) => (
    <div key={comment._id} className="comment">
      <div className="comment-header">
        {comment.author?.avatarUrl && (
          <img 
            src={comment.author.avatarUrl} 
            alt={comment.author.displayName}
            className="comment-avatar"
          />
        )}
        <strong className="comment-author">
          {comment.author?.displayName || comment.anonymousName}
        </strong>
        <span className="comment-date">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <p className="comment-content">{comment.content}</p>
      
      <div className="comment-actions">
        <button onClick={() => handleLike(comment._id)} className="like-btn">
          👍 {comment.likes || 0}
        </button>
        <button onClick={() => setReplyingTo(comment._id)} className="reply-btn">
          💬 Reply
        </button>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(renderComment)}
        </div>
      )}
    </div>
  );

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h2>Comments ({comments.length})</h2>
        <UserStatus />
      </div>

      <form onSubmit={handleSubmit} className="comment-form">
        {!user && (
          <input
            type="text"
            placeholder="Your name (or login with TikTok above)"
            value={anonymousName}
            onChange={(e) => setAnonymousName(e.target.value)}
            className="name-input"
          />
        )}
        
        <textarea
          placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="comment-textarea"
          rows="4"
          required
        />
        
        <div className="form-actions">
          {replyingTo && (
            <button 
              type="button" 
              onClick={() => setReplyingTo(null)}
              className="cancel-btn"
            >
              Cancel Reply
            </button>
          )}
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Posting...' : (replyingTo ? 'Post Reply' : 'Post Comment')}
          </button>
        </div>
      </form>

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(renderComment)
        )}
      </div>
    </div>
  );
}
```

### 10. Add CSS Styling

Create `app/globals.css` or add to existing:

```css
/* TikTok Login Button */
.tiktok-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.tiktok-login-btn:hover {
  background: #333;
}

/* User Status */
.user-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #e0e0e0;
}

/* Comments Section */
.comments-section {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.comment-form {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.name-input,
.comment-textarea {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
}

.comment-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.submit-btn,
.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn {
  background: #000;
  color: #fff;
}

.submit-btn:hover:not(:disabled) {
  background: #333;
}

.submit-btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

/* Comments List */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-comments {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.comment {
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-author {
  font-weight: 600;
  color: #333;
}

.comment-date {
  margin-left: auto;
  font-size: 0.875rem;
  color: #999;
}

.comment-content {
  margin: 0.75rem 0;
  line-height: 1.6;
  color: #333;
}

.comment-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
}

.like-btn,
.reply-btn {
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.like-btn:hover,
.reply-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.comment-replies {
  margin-left: 2.5rem;
  margin-top: 1rem;
  padding-left: 1rem;
  border-left: 2px solid #e0e0e0;
}

/* Responsive */
@media (max-width: 768px) {
  .comments-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .comment-replies {
    margin-left: 1rem;
  }
}
```

---

## 📝 Usage in Your Pages

### Article Page Example

```jsx
import CommentsSection from '@/components/CommentsSection';

export default function ArticlePage({ params }) {
  const articleId = params.id;

  return (
    <div>
      <article>
        {/* Your article content */}
      </article>
      
      <CommentsSection articleId={articleId} />
    </div>
  );
}
```

---

## ✅ Testing Checklist

1. **Start Backend:**
   ```bash
   cd fastodigama_backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd your-frontend
   npm run dev
   ```

3. **Test Flow:**
   - [ ] Visit an article page
   - [ ] Click "Login with TikTok"
   - [ ] Complete TikTok authorization
   - [ ] See your name/avatar after login
   - [ ] Post a comment as logged-in user
   - [ ] Logout and post anonymous comment
   - [ ] Like comments
   - [ ] Reply to comments

---

## 🔒 Before Production

1. Update CORS to only allow your domain
2. Set `secure: true` in cookie config
3. Use HTTPS
4. Remove anonymous comment support
5. Add rate limiting
6. Add comment moderation

---

That's it! Your TikTok OAuth integration is complete. 🎉
