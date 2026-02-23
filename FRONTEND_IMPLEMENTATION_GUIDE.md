# Frontend Comments Implementation Guide

## 🚀 Testing Strategy

### **Testing Location: START LOCAL, THEN RAILWAY**

**Why?**
- ✅ Local: Fast feedback, easy debugging
- ✅ Railway: Catches real deployment issues
- ❌ Skip local testing → slow debugging online

**Recommended Flow:**
```
1. Build frontend components locally (http://localhost:3000)
   └─ Backend also local (http://localhost:8888)

2. Test & debug locally until working ✓

3. Push to Railway
   └─ Deploy both frontend + backend
   
4. Test on Railway URLs
   └─ Frontend: your-app.railway.app
   └─ Backend: your-backend.railway.app
```

---

## 📝 Frontend Implementation Checklist

### **Component 1: CommentsSection.js (Server Component)**

Create file: `app/components/CommentsSection.js`

```javascript
// NO 'use client' directive!
import Image from 'next/image';

async function fetchComments(articleId) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';
    const response = await fetch(
      `${API_URL}/api/comments/article/${articleId}`,
      { next: { revalidate: 60 } }
    );
    
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
    <div style={{ maxWidth: '600px', margin: '40px 0', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <h2>Comments ({comments.length})</h2>
      
      {comments.length === 0 ? (
        <p>No comments yet. Be the first to comment!</p>
      ) : (
        comments.map(comment => (
          <div key={comment._id} style={{ padding: '15px', backgroundColor: '#fff', marginBottom: '15px', borderLeft: '4px solid #00f7ef', borderRadius: '6px' }}>
            <strong>{comment.authorName || 'Anonymous'}</strong>
            <p style={{ fontSize: '12px', color: '#999', margin: '5px 0' }}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </p>
            <p>{comment.content}</p>
            <p style={{ fontSize: '13px', color: '#666' }}>❤️ {comment.likes || 0}</p>
            
            {/* Nested replies */}
            {comment.replies?.length > 0 && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <p style={{ fontWeight: 'bold', fontSize: '13px' }}>Replies ({comment.replies.length})</p>
                {comment.replies.map(reply => (
                  <div key={reply._id} style={{ marginLeft: '20px', padding: '10px', backgroundColor: '#fafafa', marginBottom: '10px', borderRadius: '4px' }}>
                    <strong>{reply.authorName || 'Anonymous'}</strong>
                    <p>{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

---

### **Component 2: CommentForm.js (Client Component)**

Create file: `app/components/CommentForm.js`

```javascript
'use client';  // ← IMPORTANT! This is a client component

import { useState } from 'react';

export default function CommentForm({ articleId }) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

  async function handleSubmit(e) {
    e.preventDefault();

    if (!content.trim()) {
      setMessage('❌ Please write a comment');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setMessage('✓ Comment submitted! Waiting for admin approval.');
      } else {
        setMessage('❌ Error: ' + (data.error || 'Failed to post'));
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Failed to post comment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '30px 0', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <h3>Leave a Comment</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name (optional)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
          disabled={loading}
        />

        <textarea
          placeholder="Write your comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '6px', minHeight: '100px', boxSizing: 'border-box' }}
          disabled={loading}
        />

        {message && <p style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px', borderRadius: '6px' }}>{message}</p>}

        <button
          type="submit"
          disabled={loading || !content.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#00f7ef',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loading || !content.trim() ? 0.6 : 1
          }}
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
```

---

### **Component 3: Use Both in Article Page**

```javascript
// app/articles/[id]/page.js
import CommentsSection from '@/components/CommentsSection';
import CommentForm from '@/components/CommentForm';

export default async function ArticlePage({ params }) {
  return (
    <article>
      <h1>Your Article Title</h1>
      <p>Article content here...</p>

      {/* Display comments (server-side) */}
      <CommentsSection articleId={params.id} />

      {/* Form to post comments (client-side) */}
      <CommentForm articleId={params.id} />
    </article>
  );
}
```

---

### **Setup .env.local**

In your Next.js project root, create or update `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

When deploying to Railway, change to:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

---

## ✅ Testing Timeline

### **Phase 1: Local Testing (Today)**

Start both servers:

```bash
# Terminal 1: Express backend
cd fastodigama_backend
npm run dev
# Runs on http://localhost:8888

# Terminal 2: Next.js frontend
cd your-nextjs-project
npm run dev
# Runs on http://localhost:3000
```

Then test:

1. ✅ Navigate to an article page
2. ✅ See "CommentsSection" component loading
3. ✅ See "No comments yet" message
4. ✅ Fill out comment form
5. ✅ Click "Post Comment"
6. ✅ See success message
7. ✅ Check MongoDB - comment should have `approved: false`
8. ✅ Manually approve comment in MongoDB:
   ```bash
   db.comments.updateOne(
     { _id: ObjectId("YOUR_COMMENT_ID") },
     { $set: { approved: true } }
   )
   ```
9. ✅ Refresh page - comment appears!

### **Phase 2: Railway Testing (When Ready)**

```
1. Push both repos (frontend + backend) to GitHub
2. Deploy to Railway
3. Update NEXT_PUBLIC_API_URL to Railway backend URL
4. Redeploy frontend
5. Test on railway.app domains
```

---

## 🎯 Key Implementation Points

- ✅ **CommentsSection** = Server component (no `'use client'`)
  - Runs on server, returns static HTML
  - Revalidates every 60 seconds
  - No JavaScript in browser

- ✅ **CommentForm** = Client component (`'use client'` at top)
  - Handles form interactions
  - Makes fetch requests
  - Shows loading/success/error messages

- ✅ **Environment Variables**
  - Use `NEXT_PUBLIC_API_URL` for frontend
  - Must start with `NEXT_PUBLIC_` to be accessible in browser
  - Local: `http://localhost:8888`
  - Railway: `https://your-backend.railway.app`

- ✅ **Approval System**
  - Comments post with `approved: false`
  - Only `approved: true` comments show in GET response
  - Admin must manually approve (set `approved: true` in MongoDB)
  - Future: Build admin UI panel for approval

- ✅ **User Experience**
  - Visitor can post anonymously (name is optional)
  - Shows success message while waiting for approval
  - Displays visitor name or "Anonymous"
  - Shows nested replies indented

---

## 🚨 Common Issues & Solutions

**Issue: "Cannot reach API"**
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running on `localhost:8888`
- Check CORS settings in backend

**Issue: "Comments don't appear"**
- Comments have `approved: false` by default
- Manually approve in MongoDB
- Refresh page (60 second revalidation)

**Issue: "Form doesn't submit"**
- Check browser console for errors
- Verify `articleId` is correct MongoDB ID
- Check backend is running

**Issue: "Works locally but not on Railway"**
- Update `NEXT_PUBLIC_API_URL` to Railway backend URL
- Check Railway deployment logs
- Verify environment variables are set on Railway

---

## 📊 Database

Comments are stored in MongoDB with this structure:

```javascript
{
  _id: ObjectId,
  articleId: ObjectId,        // Links to Article
  content: String,             // Comment text
  authorName: String,          // "Anonymous" or visitor's name
  author: ObjectId,            // null for anonymous (for future TikTok login)
  parentId: ObjectId,          // null for top-level, or parent comment ID for replies
  likes: Number,               // Like count
  approved: Boolean,           // false = needs approval, true = visible
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎉 Success Checklist

- [ ] Created `CommentsSection.js` (server component)
- [ ] Created `CommentForm.js` (client component)
- [ ] Added both to article page
- [ ] Set `NEXT_PUBLIC_API_URL` in `.env.local`
- [ ] Both servers running locally
- [ ] Can see article page
- [ ] Can submit comment form
- [ ] Comment appears in MongoDB with `approved: false`
- [ ] Can manually approve comment
- [ ] Refresh page, approved comment shows
- [ ] All tests pass ✓

---

**Happy coding! Let me know if you hit any issues.** 🚀
