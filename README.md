# Fastodigama Backend

A Node.js/Express backend for a journaling website with article management, categories, and a TikTok-powered comments system.

---

## 🌟 Features

- **Admin Panel**: Manage articles, categories, and menu links
- **Article Management**: Create, edit, and publish articles with markdown support
- **Comment System**: TikTok-authenticated comments with nested replies
- **Reader Authentication**: TikTok OAuth login for visitors
- **Image Uploads**: Cloudflare R2 integration for media storage
- **Session Management**: Secure session-based authentication

---

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB
- TikTok Developer Account (for comments feature)
- Cloudflare R2 Account (optional, for image uploads)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=8888
SESSIONSECRET=your-random-secret-here
MONGODB_URI=mongodb://localhost:27017/fastodigama

# TikTok OAuth (for comments)
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret
TIKTOK_REDIRECT_URI=http://localhost:8888/api/reader/auth/tiktok/callback
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server

```bash
npm run dev
```

Server runs at: http://localhost:8888

---

## 📁 Project Structure

```
fastodigama_backend/
├── components/
│   ├── Article/        # Article CRUD operations
│   ├── Category/       # Category management
│   ├── Comment/        # Comments with TikTok auth
│   ├── Reader/         # TikTok visitor authentication
│   ├── User/           # Admin user management
│   ├── menuLinks/      # Navigation menu
│   └── config/         # R2 storage config
├── views/              # Pug templates for admin panel
├── public/             # Static assets
├── index.js            # Main server file
└── dbConnection.js     # MongoDB connection
```

---

## 🔐 TikTok Integration Setup

We've built a complete TikTok OAuth system for authenticated comments.

### Step 1: Get TikTok Credentials

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create a Sandbox App
3. Copy Client Key & Client Secret
4. Set Redirect URI: `http://localhost:8888/api/reader/auth/tiktok/callback`

### Step 2: Follow Setup Guide

We've created comprehensive guides for you:

- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** ⭐ Start here!
- **[TIKTOK_OAUTH_SETUP.md](TIKTOK_OAUTH_SETUP.md)** - Complete integration guide
- **[FRONTEND_TIKTOK_GUIDE.md](FRONTEND_TIKTOK_GUIDE.md)** - Frontend implementation
- **[COMMENTS_SETUP_GUIDE.md](COMMENTS_SETUP_GUIDE.md)** - Comments API reference

### Quick Test

```bash
# Make sure .env is configured, then:
npm run dev

# Test auth endpoint:
curl http://localhost:8888/api/reader/auth/tiktok
```

---

## 📡 API Endpoints

### Public API

```
GET    /api/articles                      - Get all articles
GET    /api/article/:id                   - Get single article
GET    /api/categories                    - Get all categories
GET    /api/category/:id                  - Get single category
GET    /api/menulinks                     - Get menu links
```

### Comments API

```
POST   /api/comments                      - Create comment
GET    /api/comments/article/:articleId   - Get article comments
PUT    /api/comments/:commentId/like      - Like a comment
```

### Reader Authentication (TikTok)

```
GET    /api/reader/auth/tiktok            - Get TikTok auth URL
GET    /api/reader/auth/tiktok/callback   - OAuth callback (server-side)
POST   /api/reader/tiktok-callback        - OAuth callback (client-side)
GET    /api/reader/me                     - Get current reader info
GET    /api/reader/logout                 - Logout reader
```

### Admin Routes

```
/admin/article         - Article management
/admin/category        - Category management
/admin/menu            - Menu management
/user                  - User profile
/login                 - Admin login
```

---

## 🗃️ Database Models

### Article
- Title, content (markdown), excerpt
- Featured image URL
- Categories (references)
- SEO fields
- Published status

### Category
- Name, description
- Icon/image
- Parent category support

### Comment
- Content
- Author (Reader reference) OR anonymousName (testing only)
- Article reference
- Parent comment (for nested replies)
- Likes count

### Reader (TikTok Visitors)
- TikTok ID (unique)
- Display name
- Avatar URL
- Bio

### User (Admin)
- Username, email
- Password (hashed)
- Admin permissions

---

## 🔒 Security Features

- **Session-based authentication** for admin and readers
- **CSRF protection** with state parameter in OAuth
- **CORS configuration** for frontend integration
- **Helmet.js** for security headers
- **bcrypt** for password hashing
- **HTTP-only cookies** for session management

---

## 🧪 Development

### Run in Development Mode

```bash
npm run dev
```

Uses nodemon for auto-restart on file changes.

### Environment Variables

See [.env.example](.env.example) for all configuration options.

---

## 📚 Documentation

- **SETUP_CHECKLIST.md** - Step-by-step setup guide
- **TIKTOK_OAUTH_SETUP.md** - Complete OAuth implementation
- **FRONTEND_TIKTOK_GUIDE.md** - Frontend integration guide
- **COMMENTS_SETUP_GUIDE.md** - Comments API documentation
- **FRONTEND_IMPLEMENTATION_GUIDE.md** - General frontend guide

---

## 🚢 Production Deployment

### Before going live:

1. **Update environment variables:**
   - Set production MongoDB URI
   - Set production frontend URL
   - Update TikTok redirect URI
   - Use strong session secret

2. **Security updates:**
   - Set `NODE_ENV=production`
   - Enable HTTPS
   - Update CORS to specific domain
   - Set `secure: true` for cookies

3. **Remove test features:**
   - Remove anonymous comment support
   - Make `author` field required in Comment model

4. **TikTok:**
   - Request production access from TikTok
   - Update redirect URIs in TikTok portal

---

## 📦 Dependencies

Main packages:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `pug` - Template engine
- `express-session` - Session management
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `helmet` - Security headers
- `axios` - HTTP client for OAuth
- `multer` - File uploads
- `@aws-sdk/client-s3` - R2/S3 storage

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

ISC

---

## 👨‍💻 Author

FADEL MATAR

---

## 🆘 Support

If you encounter any issues:

1. Check the [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)
2. Review error logs in terminal
3. Verify environment variables
4. Check MongoDB connection
5. Test API endpoints with curl/Postman

---

## 🎯 Next Steps

After setting up the backend:

1. ✅ Get TikTok sandbox credentials
2. ✅ Configure `.env` file
3. ✅ Read [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)
4. ⬜ Build frontend (see FRONTEND_TIKTOK_GUIDE.md)
5. ⬜ Test TikTok login flow
6. ⬜ Test comments system
7. ⬜ Deploy to production

Happy coding! 🚀
