# Comments MVC System - Complete Setup Guide

## 🎯 Overview

This is a **separate comments system** for TikTok visitors. It does NOT touch your Admin User MVC, which remains unchanged.

### What's New:
- **Reader Model** - Stores TikTok visitor profile data
- **Comment Model** - Stores article comments with reply support
- **API Routes** - Express endpoints for frontend to fetch comments

---

## 📁 Folder Structure

```
components/
  ├── Reader/
  │   ├── model.js          (TikTok visitor schema)
  │   ├── controller.js     (Authentication logic)
  │   └── routes.js         (Reader API endpoints)
  │
  ├── Comment/
  │   ├── model.js          (Comments schema with parentId for replies)
  │   ├── controller.js     (Comment CRUD operations)
  │   └── routes.js         (Comment API endpoints)
```

---

## 🔌 API Endpoints

### Reader (Visitor Login)

```
POST   /api/reader/tiktok-callback     - Handle TikTok OAuth login
GET    /api/reader/me                  - Get current logged-in reader
GET    /api/reader/logout              - Logout reader
```

### Comments

```
POST   /api/comments                   - Create new comment
GET    /api/comments/article/:articleId - Get all comments for article (with .populate('author'))
GET    /api/comments/:commentId        - Get single comment with author info
PUT    /api/comments/:commentId/like   - Like a comment
```

---

## 📝 Database Schemas

### Reader Schema

```javascript
{
  tiktokId: String,        // Unique TikTok user ID
  displayName: String,     // TikTok display name
  avatarUrl: String,       // Profile picture URL
  bio: String,             // Bio/description
  createdAt: Date          // Account creation date
}
```

### Comment Schema

```javascript
{
  articleId: ObjectId,     // References Article
  author: ObjectId,        // References Reader (POPULATED for API)
  content: String,         // Comment text
  parentId: ObjectId,      // null = top-level, otherwise = reply to comment
  likes: Number,           // Like count
  createdAt: Date,
  updatedAt: Date,
  approved: Boolean        // Admin approval needed before showing
}
```

---

## 🚀 Getting Started

### 1. Database is Already Set Up
Your models are in:
- `components/Reader/model.js`
- `components/Comment/model.js`

### 2. API Routes Are Added to index.js
```javascript
app.use("/api/reader", readerRouter);
app.use("/api/comments", commentRouter);
```

### 3. Test the API

**Get Comments for Article:**
```bash
curl http://localhost:8888/api/comments/article/{articleId}
```

**Create a Comment:**
```bash
curl -X POST http://localhost:8888/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "article-id-here",
    "content": "Great article!",
    "parentId": null
  }'
```

---

## 💻 Next.js Frontend Example

A complete example is provided in: `NEXTJS_COMMENTS_EXAMPLE.js`

### Key Features:
- ✅ Fetch comments from your Express API
- ✅ Display visitor names and avatars (populated from database)
- ✅ Post new comments
- ✅ Like comments
- ✅ Handle TikTok login

### Usage in Your Next.js App:

```bash
# Copy the example to your Next.js project
cp NEXTJS_COMMENTS_EXAMPLE.js ~/your-nextjs-project/app/components/CommentsSection.js
```

```javascript
// In your article page (e.g., app/articles/[id]/page.js)
import CommentsSection from '@/components/CommentsSection';

export default function ArticlePage({ params }) {
  return (
    <div>
      <h1>Article Title</h1>
      <p>Article content...</p>
      
      {/* Add comments section */}
      <CommentsSection articleId={params.id} />
    </div>
  );
}
```

### Environment Setup:

Add to your `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8888
```

---

## 🔐 Security Notes

1. **Comments Need Approval**
   - Comments are created with `approved: false`
   - Only approved comments show to public
   - You need to add admin panel routes to approve comments

2. **Session Cookies**
   - Reader login uses Express sessions (same as admin)
   - Frontend must send `credentials: 'include'` with fetch

3. **TikTok OAuth Integration**
   - The example shows a mock login
   - For real TikTok login, implement OAuth flow:
     1. Redirect user to TikTok OAuth URL
     2. TikTok redirects back to `/api/reader/tiktok-callback`
     3. Exchange code for access token
     4. Fetch user data from TikTok API

---

## 🛠️ Advanced Features

### Add a Reply to a Comment

```javascript
// Frontend
const response = await fetch(`${API_URL}/api/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    articleId: "article-123",
    content: "Great point!",
    parentId: "comment-456"  // Reply to this comment
  })
});
```

### Create Nested Comments Component

The example already handles replies! The API returns:
```javascript
{
  _id: "comment-123",
  author: { tiktokId, displayName, avatarUrl },
  content: "Parent comment",
  replies: [
    {
      _id: "comment-456",
      author: { displayName, avatarUrl },
      content: "Reply to parent"
    }
  ]
}
```

---

## ✅ Checklist

- [x] Reader model created
- [x] Comment model created
- [x] API routes added to index.js
- [x] Routes use .populate('author') for visitor info
- [x] Next.js example provided
- [x] Admin User MVC untouched ✨

---

## ❓ Common Issues

**"Cannot GET /api/comments/article/:articleId"**
- Make sure comment routes are imported in index.js
- Check that articleId is a valid MongoDB ObjectId

**Comments not showing author info**
- Verify `.populate('author')` is being called in model.js
- Check that Reader data exists in database

**Session not persisting**
- Ensure `credentials: 'include'` is in fetch requests
- Frontend and backend must be on compatible domain

---

## 📚 Next Steps

1. Implement TikTok OAuth login
2. Create admin comment moderation panel
3. Add email notifications for new comments
4. Implement pagination for large comment lists
5. Add spam/abuse reporting

Happy coding! 🎉
