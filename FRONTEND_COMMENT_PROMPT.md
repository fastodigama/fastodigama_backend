# Frontend Comment System - Implementation Prompt

You can give this prompt to your Next.js frontend developer:

---

## 📋 Task: Implement Anonymous Comments System

Your backend API is ready. Build the frontend comment functionality using these two components.

### ✅ Requirements

- [ ] Create server-side comments display component (no JavaScript)
- [ ] Create client-side form component for posting comments
- [ ] Comments render on article pages
- [ ] Form validation before submit
- [ ] Success/error messaging
- [ ] No TikTok login required (anonymous comments)

---

## 🔌 Backend API Endpoints Available

Your Express backend provides these endpoints:

```
GET  /api/comments/article/{articleId}
     Returns: { success: true, comments: [...] }
     Each comment has: _id, content, authorName, likes, createdAt, replies[]

POST /api/comments
     Body: { articleId, content, authorName, parentId }
     Returns: { success: true, comment: {...} }
```

**Base URL:** `process.env.NEXT_PUBLIC_API_URL` (default: http://localhost:8888)

---

## 📁 Create These Files in Your Next.js Project

### 1️⃣ Server Component: `app/components/CommentsSection.js`

**Purpose:** Display all comments (server-rendered, no JavaScript)

**Features:**
- Fetch comments from `/api/comments/article/{articleId}`
- Display comment author name (or "Anonymous")
- Show timestamp in format: "Feb 23, 2026, 10:30 AM"
- Show like count (❤️ 5)
- Nested replies indented below parent comment
- "Replies (3)" label if comment has replies
- Revalidate comments every 60 seconds with `next: { revalidate: 60 }`

**Expected Data Structure:**
```javascript
{
  _id: "abc123",
  content: "Great article!",
  authorName: "John",
  likes: 5,
  createdAt: "2026-02-23T10:30:00.000Z",
  replies: [
    {
      _id: "reply123",
      content: "Thanks!",
      authorName: "Author",
      likes: 2,
      createdAt: "2026-02-23T11:00:00.000Z"
    }
  ]
}
```

**Design Tips:**
- Use `Image` from next/image for avatars (if provided)
- Max-width: 600px
- Left border accent color: #00f7ef
- Clean, readable layout
- Handle empty state: "No comments yet. Be the first to comment!"

---

### 2️⃣ Client Component: `app/components/CommentForm.js`

**Purpose:** Form to submit new comments

**Features:**
- Add `'use client'` directive at top
- Two form fields:
  1. **Name** (optional input) - if empty, submits as "Anonymous"
  2. **Comment** (required textarea) - min 2 characters
- Submit button disabled until form has content
- Show loading state while submitting: "Posting..."
- Success message: "✓ Comment submitted! It will appear after admin approval."
- Error messages if validation fails or API returns error
- Clear form after successful submission
- Call optional `onCommentPosted` callback (for refreshing comments if needed)

**API Call:**
```javascript
POST /api/comments
{
  "articleId": "article-123",
  "content": "Your comment here",
  "authorName": "John" // or "" for Anonymous
}
```

**Validation:**
- Content must be at least 2 characters
- Show error: "Please write a comment"
- No special character restrictions

**Design Tips:**
- Similar styling to CommentsSection
- Clear labels
- Proper form spacing with bottom margin: 15px
- Button color: #00f7ef with hover effect
- Success/error message in fixed color box

---

## 🎯 Usage in Article Page

```javascript
// app/articles/[id]/page.js
import CommentsSection from '@/components/CommentsSection';
import CommentForm from '@/components/CommentForm';

export default async function ArticlePage({ params }) {
  return (
    <article>
      <h1>{article.title}</h1>
      <p>{article.content}</p>
      
      {/* Show existing comments (server-side) */}
      <CommentsSection articleId={params.id} />
      
      {/* Form to post new comments (client-side) */}
      <CommentForm articleId={params.id} />
    </article>
  );
}
```

---

## 🔧 Environment Setup

Add to `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

---

## ✅ Testing Checklist

- [ ] Comments display on article page
- [ ] Visitor names show correctly
- [ ] Anonymous comments show as "Anonymous"
- [ ] Form validates (won't submit empty comment)
- [ ] Success message appears after submission
- [ ] Page/comments refresh after successful post
- [ ] Timestamps format correctly
- [ ] Nested replies display indented
- [ ] No JavaScript errors in console

---

## 🧪 Manual Testing

1. **Get an article ID:**
   ```bash
   curl http://localhost:8888/api/articles
   ```

2. **Test the API directly:**
   ```bash
   curl -X POST http://localhost:8888/api/comments \
     -H "Content-Type: application/json" \
     -d '{
       "articleId": "YOUR_ARTICLE_ID",
       "content": "Test comment",
       "authorName": "Test User"
     }'
   ```

3. **Verify comments appear on your page**

---

## 📝 Notes

- Comments need admin approval before showing (they post with `approved: false`)
- No login/authentication required
- Avatar support (from Reader model if TikTok login added later)
- Use inline styles OR CSS modules (your choice)
- Make it responsive (mobile-friendly)
- Comments readonly - no edit/delete on frontend yet (admin panel later)

---

## 🎨 Design Reference

### Colors
- Accent: `#00f7ef` (TikTok cyan)
- Background: `#f9f9f9`
- Text: `#333`
- Secondary: `#999`

### Layout
- Container max-width: 600px
- Padding: 20px
- Border radius: 6px
- Gap/Margin: 15px between elements

---

**Ready to implement? Let's go! 🚀**
