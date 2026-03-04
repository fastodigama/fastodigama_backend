# Fastodigama Backend

A Node.js/Express backend for a journaling website with article management, categories, and a comment system.

---

## 🌟 Features

- **Admin Panel**: Manage articles, categories, and menu links
- **Article Management**: Create, edit, and publish articles with markdown support
- **Comment System**: Comments with nested replies
- **Reader Authentication**: OAuth login for visitors
- **Image Uploads**: Cloudflare R2 integration for media storage
- **Session Management**: Secure session-based authentication

---

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB
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
│   ├── Comment/        # Comments
│   ├── Reader/         # Visitor authentication
│   ├── User/           # Admin user management
│   ├── menuLinks/      # Navigation menu
│   └── config/         # R2 storage config
├── views/              # Pug templates for admin panel
├── public/             # Static assets
├── index.js            # Main server file
└── dbConnection.js     # MongoDB connection
```

---


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
GET    /api/comments/:commentId           - Get single comment
PUT    /api/comments/:commentId/like      - Like a comment
PUT    /api/comments/:commentId           - Update comment (author only)
DELETE /api/comments/:commentId           - Delete comment (author or admin)
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

### Reader (Visitors)
- Unique ID
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
- **COMMENTS_SETUP_GUIDE.md** - Comments API documentation
- **FRONTEND_IMPLEMENTATION_GUIDE.md** - General frontend guide

---

## 🚢 Production Deployment

### Before going live:

1. **Update environment variables:**
   - Set production MongoDB URI
   - Set production frontend URL
   - Use strong session secret

2. **Security updates:**
   - Set `NODE_ENV=production`
   - Enable HTTPS
   - Update CORS to specific domain
   - Set `secure: true` for cookies

3. **Remove test features:**
   - Remove anonymous comment support
   - Make `author` field required in Comment model


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

1. ✅ Configure `.env` file
2. ✅ Read [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)
3. ⬜ Build frontend
4. ⬜ Test comments system
5. ⬜ Deploy to production

Happy coding! 🚀
