# Comments System - Frontend Build Guide

## ✅ Backend API Ready

Build the comments component. All endpoints are ready to use. 

### What You Need to Know:
- Users can post comments with anonymous names OR with TikTok login
- Comments support nested replies
- Each comment shows visitor name and avatar
- Comments can be liked

---

## � API Endpoints (Ready to Use)

```
POST   /api/comments                    - Create a comment
GET    /api/comments/article/:articleId - Get all comments for an article
PUT    /api/comments/:commentId/like    - Like a comment
```

---

## 💻 Build the Comments Component

Create file: `app/components/CommentsSection.js`

**Your component should:**
- ✅ Fetch comments from `/api/comments/article/:articleId`
- ✅ Allow users to enter a name (anonymous) or login with TikTok
- ✅ Post new comments to `/api/comments`
- ✅ Show comment author name and avatar
- ✅ Allow replies via `parentId` field
- ✅ Allow liking via `/api/comments/:commentId/like`
- ✅ Style to match your existing design

**How to send comments:**

Anonymous comment:
```javascript
POST /api/comments
{
  "articleId": "123456789abcdef",
  "anonymousName": "John Doe",
  "content": "Great article!",
  "parentId": null
}
```

Logged-in comment:
```javascript
POST /api/comments
{
  "articleId": "123456789abcdef",
  "author": "tiktok-user-id",
  "content": "Great article!",
  "parentId": null
}
```

Reply to a comment:
```javascript
POST /api/comments
{
  "articleId": "123456789abcdef",
  "anonymousName": "Jane Doe",
  "content": "I agree!",
  "parentId": "comment-id-to-reply-to"
}
```

**How to get comments:**
```javascript
GET /api/comments/article/123456789abcdef
```

Returns array of comments with nested replies, author info, and like count.

**How to like:**
```javascript
PUT /api/comments/comment-id-here/like
```

---

## ⚙️ Setup

1. Create `app/components/CommentsSection.js`
2. Add to `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8888`
3. Use in article page: `<CommentsSection articleId={article._id} />`
4. Style with CSS

---

## � Anonymous Comments (Testing Only)

### When to Use
- **During development/testing** to allow any visitor to comment without login
- **Before TikTok launch** to test the full commenting system
- **Will be completely removed** at launch by deleting all anonymous comments and removing the `anonymousName` field

### How It Works
- Frontend checks if user is logged in
- If logged in: uses `author` field with Reader ID
- If not logged in: accepts `anonymousName` field with visitor's name
- Both types can reply to each other via `parentId`

### Before Launch - Cleanup

Delete all test data:
```bash
# In MongoDB shell
db.comments.deleteMany({ author: null })
db.comments.updateMany({}, { $unset: { anonymousName: "" } })
```

Then make `author` field required in Comment model.

---

## �🛠️ Advanced Features

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
- [x] Next.js component with anonymous + auth support
- [x] Anonymous comments support (testing only)
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
