# TikTok OAuth Integration Guide

## 🎯 Overview

This guide walks you through integrating TikTok Login for your comments system using the TikTok Sandbox environment.

---

## 📋 Prerequisites

✅ TikTok Developer Account created  
✅ TikTok Sandbox App created  
✅ Backend comment system ready  

---

## 🔑 Step 1: Get TikTok Credentials

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Navigate to your Sandbox App
3. Copy these values:
   - **Client Key** (App ID)
   - **Client Secret**
   - **Redirect URI** (set this to `http://localhost:3000/auth/tiktok/callback` for development)

---

## ⚙️ Step 2: Configure Backend

### Add Environment Variables

Create `.env` file in backend root:

```env
# Server
PORT=8888
SESSIONSECRET=your-session-secret-here

# MongoDB
MONGODB_URI=your-mongodb-connection-string

# TikTok OAuth
TIKTOK_CLIENT_KEY=your-client-key-here
TIKTOK_CLIENT_SECRET=your-client-secret-here
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Install Required Package

```bash
npm install axios
```

### Update CORS Configuration

The CORS needs to allow credentials and specify your frontend domain. This is already in your `index.js` but should be updated:

```javascript
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true // Allow cookies
  })
);
```

Also update session configuration to allow cross-origin cookies:

```javascript
app.use(
  sessions({
    secret: process.env.SESSIONSECRET,
    name: "MyUniqueSEssID",
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
  })
);
```

---

## 🔗 Step 3: Backend OAuth Flow

The OAuth flow is handled in the Reader component:

### Flow Diagram

```
User clicks "Login with TikTok"
         ↓
Frontend redirects to TikTok
         ↓
User authorizes app
         ↓
TikTok redirects to frontend callback
         ↓
Frontend exchanges code for access token
         ↓
Frontend sends user info to backend
         ↓
Backend creates/updates Reader
         ↓
Backend creates session
```

### Backend Routes (Already Created)

```
POST /api/reader/tiktok-callback  - Create/update reader session
GET  /api/reader/me               - Get current reader info
GET  /api/reader/logout           - Logout reader
```

---

## 💻 Step 4: Frontend Integration

### Installation

Add to your Next.js/React app:

```bash
npm install axios
```

### Create TikTok Auth Service

Create `lib/tiktokAuth.js`:

```javascript
const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
const TIKTOK_REDIRECT_URI = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Generate TikTok authorization URL
export function getTikTokAuthUrl() {
  const csrfState = Math.random().toString(36).substring(2);
  localStorage.setItem('tiktok_csrf_state', csrfState);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: TIKTOK_REDIRECT_URI,
    state: csrfState,
  });

  return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function handleTikTokCallback(code, state) {
  // Verify CSRF state
  const savedState = localStorage.getItem('tiktok_csrf_state');
  if (state !== savedState) {
    throw new Error('CSRF state mismatch');
  }
  localStorage.removeItem('tiktok_csrf_state');

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user info
    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,bio_description', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    
    if (!userData.data || !userData.data.user) {
      throw new Error('Failed to get user info');
    }

    const user = userData.data.user;

    // Send to backend to create session
    const backendResponse = await fetch(`${API_URL}/api/reader/tiktok-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({
        tiktokId: user.open_id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio_description,
      }),
    });

    const backendData = await backendResponse.json();
    
    if (!backendData.success) {
      throw new Error('Backend session creation failed');
    }

    return backendData.reader;
  } catch (error) {
    console.error('TikTok auth error:', error);
    throw error;
  }
}

// Get current logged-in user
export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/api/reader/me`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Logout
export async function logout() {
  try {
    await fetch(`${API_URL}/api/reader/logout`, {
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}
```

### Create Login Button Component

Create `components/TikTokLoginButton.js`:

```javascript
'use client';

import { getTikTokAuthUrl } from '@/lib/tiktokAuth';

export default function TikTokLoginButton() {
  const handleLogin = () => {
    const authUrl = getTikTokAuthUrl();
    window.location.href = authUrl;
  };

  return (
    <button 
      onClick={handleLogin}
      className="tiktok-login-btn"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
      Login with TikTok
    </button>
  );
}
```

### Create Callback Page

Create `app/auth/tiktok/callback/page.js`:

```javascript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleTikTokCallback } from '@/lib/tiktokAuth';

export default function TikTokCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('TikTok auth error:', error);
      router.push('/?error=auth_failed');
      return;
    }

    if (code && state) {
      handleTikTokCallback(code, state)
        .then(() => {
          // Redirect to the article they were viewing or home
          const returnTo = sessionStorage.getItem('tiktok_return_to') || '/';
          sessionStorage.removeItem('tiktok_return_to');
          router.push(returnTo);
        })
        .catch((error) => {
          console.error('Callback error:', error);
          router.push('/?error=auth_failed');
        });
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Logging in with TikTok...</h2>
      <p>Please wait while we complete your login.</p>
    </div>
  );
}
```

### Environment Variables for Frontend

Create `.env.local` in your Next.js root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8888
NEXT_PUBLIC_TIKTOK_CLIENT_KEY=your-client-key-here
NEXT_PUBLIC_TIKTOK_CLIENT_SECRET=your-client-secret-here
NEXT_PUBLIC_TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
```

⚠️ **Security Note**: Never expose client_secret in production. The token exchange should happen on the backend. For sandbox testing, this is acceptable.

---

## 🎨 Step 5: Update Comments Component

Update your `CommentsSection.js` to use TikTok login:

```javascript
'use client';

import { useState, useEffect } from 'react';
import TikTokLoginButton from './TikTokLoginButton';
import { getCurrentUser, logout } from '@/lib/tiktokAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CommentsSection({ articleId }) {
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  // Load current user on mount
  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  // Load comments
  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/comments/article/${articleId}`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    // If logged out and no anonymous name, require one
    if (!currentUser && !anonymousName.trim()) {
      alert('Please enter your name or login with TikTok');
      return;
    }

    const commentData = {
      articleId,
      content: commentText,
      parentId: replyingTo,
    };

    // Add author or anonymousName
    if (currentUser) {
      commentData.author = currentUser.id;
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
        fetchComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleLike = async (commentId) => {
    try {
      await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: 'PUT',
      });
      fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  const renderComment = (comment) => (
    <div key={comment._id} className="comment">
      <div className="comment-header">
        {comment.author && (
          <img 
            src={comment.author.avatarUrl || '/default-avatar.png'} 
            alt={comment.author.displayName}
            className="avatar"
          />
        )}
        <strong>
          {comment.author ? comment.author.displayName : comment.anonymousName}
        </strong>
        <span className="comment-date">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <p className="comment-content">{comment.content}</p>
      
      <div className="comment-actions">
        <button onClick={() => handleLike(comment._id)}>
          👍 {comment.likes}
        </button>
        <button onClick={() => setReplyingTo(comment._id)}>
          Reply
        </button>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map(renderComment)}
        </div>
      )}
    </div>
  );

  return (
    <div className="comments-section">
      <h2>Comments ({comments.length})</h2>
      
      {/* User Status */}
      <div className="user-status">
        {currentUser ? (
          <div>
            Welcome, {currentUser.displayName}! 
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <TikTokLoginButton />
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="comment-form">
        {!currentUser && (
          <input
            type="text"
            placeholder="Your name (or login with TikTok)"
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
        />
        
        <div className="form-actions">
          {replyingTo && (
            <button type="button" onClick={() => setReplyingTo(null)}>
              Cancel Reply
            </button>
          )}
          <button type="submit">
            {replyingTo ? "Post Reply" : "Post Comment"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="comments-list">
        {comments.map(renderComment)}
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Styling

Add to your CSS file:

```css
.comments-section {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.user-status {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

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

.comment-form {
  margin-bottom: 2rem;
}

.name-input,
.comment-textarea {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
}

.comment {
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.comment-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.comment-actions button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
}

.replies {
  margin-left: 2rem;
  margin-top: 1rem;
}
```

---

## 🧪 Testing

1. **Start Backend:**
   ```bash
   cd fastodigama_backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd fastodigama_frontend
   npm run dev
   ```

3. **Test Flow:**
   - Visit an article page
   - Click "Login with TikTok"
   - Authorize the app on TikTok
   - You'll be redirected back
   - Post a comment as logged-in user
   - Try posting anonymous comment (logout first)

---

## 🔒 Production Considerations

### Before Going Live:

1. **Move Token Exchange to Backend**
   - Never expose client_secret in frontend
   - Create backend endpoint to handle token exchange
   - Frontend only sends authorization code to backend

2. **Update Environment Variables:**
   ```env
   TIKTOK_REDIRECT_URI=https://yourdomain.com/auth/tiktok/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Enable HTTPS:**
   ```javascript
   cookie: {
     secure: true, // HTTPS only
     sameSite: 'strict'
   }
   ```

4. **Remove Anonymous Comments:**
   ```javascript
   // In Comment model, make author required:
   author: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Reader",
     required: true // Remove anonymous support
   }
   ```

5. **Update TikTok App:**
   - Add production redirect URI in TikTok Developer Portal
   - Request app review for production access

---

## 📚 API Reference

### TikTok API Endpoints

- **Authorization:** `https://www.tiktok.com/v2/auth/authorize`
- **Token Exchange:** `https://open.tiktokapis.com/v2/oauth/token/`
- **User Info:** `https://open.tiktokapis.com/v2/user/info/`

### Scopes

For comments, you only need:
- `user.info.basic` - Get user's display name, avatar, and bio

---

## ❓ Troubleshooting

**"Invalid redirect_uri"**
- Make sure redirect URI in code matches TikTok Developer Portal exactly

**"CSRF state mismatch"**
- Check localStorage is enabled
- Ensure state parameter is passed correctly

**"Session not persisting"**
- Add `credentials: 'include'` to all fetch requests
- Check CORS allows credentials
- Verify cookie settings

**"User info not showing"**
- Verify `.populate('author')` is in Comment model queries
- Check Reader data exists in database

---

## ✅ Next Steps

- [ ] Test login flow in sandbox
- [ ] Implement secure token exchange on backend
- [ ] Add loading states and error handling
- [ ] Style TikTok button to match your design
- [ ] Test comment posting with TikTok account
- [ ] Plan for production deployment

Happy coding! 🚀
