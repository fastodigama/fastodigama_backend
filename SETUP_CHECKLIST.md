# 🚀 TikTok Integration - Quick Setup Checklist

Follow these steps to get TikTok login working with your comments system.

---

## ✅ Backend Setup (You're here)

### 1. Get TikTok Credentials

- [ ] Go to https://developers.tiktok.com/
- [ ] Create/Login to your TikTok Developer account
- [ ] Navigate to your Sandbox App
- [ ] Copy **Client Key** (App ID)
- [ ] Copy **Client Secret**
- [ ] Set **Redirect URI** to: `http://localhost:8888/api/reader/auth/tiktok/callback`

### 2. Configure Backend

- [x] ✅ Install axios package (DONE)
- [x] ✅ Create OAuth controller (DONE)
- [x] ✅ Update routes (DONE)
- [x] ✅ Update CORS settings (DONE)
- [x] ✅ Update session config (DONE)
- [ ] Create `.env` file with your credentials

**Create `.env` file now:**

```bash
# Copy the example file
cp .env.example .env
```

**Then edit `.env` and add your TikTok credentials:**

```env
PORT=8888
SESSIONSECRET=change-this-to-random-string
MONGODB_URI=your-mongodb-connection-string

# Add these from TikTok Developer Portal:
TIKTOK_CLIENT_KEY=your-client-key-here
TIKTOK_CLIENT_SECRET=your-client-secret-here
TIKTOK_REDIRECT_URI=http://localhost:8888/api/reader/auth/tiktok/callback
FRONTEND_URL=http://localhost:3000
```

### 3. Test Backend

- [ ] Start server: `npm run dev`
- [ ] Visit: http://localhost:8888/api/reader/auth/tiktok
- [ ] Should return JSON with `authUrl`

---

## 📱 Frontend Setup (Next Step)

### 1. Follow Frontend Guide

- [ ] Read: `FRONTEND_TIKTOK_GUIDE.md`
- [ ] Or read: `TIKTOK_OAUTH_SETUP.md` (comprehensive version)

### 2. Quick Frontend Setup

```bash
cd your-frontend-folder
npm install axios
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

### 3. Copy Components

Copy these from `FRONTEND_TIKTOK_GUIDE.md`:

- [ ] `components/TikTokLoginButton.jsx`
- [ ] `lib/UserContext.jsx`
- [ ] `components/UserStatus.jsx`
- [ ] `components/CommentsSection.jsx`
- [ ] `app/auth/tiktok/success/page.jsx`
- [ ] `app/auth/tiktok/error/page.jsx`

---

## 🧪 Testing Flow

### 1. Start Both Servers

Terminal 1 (Backend):
```bash
cd fastodigama_backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd your-frontend
npm run dev
```

### 2. Test Login

- [ ] Open http://localhost:3000
- [ ] Click "Login with TikTok"
- [ ] Authorize on TikTok
- [ ] Should redirect back & show your name

### 3. Test Comments

- [ ] Post a comment as logged-in user
- [ ] Logout
- [ ] Post anonymous comment
- [ ] Like a comment
- [ ] Reply to a comment

---

## 📚 Documentation Files

We created these guides for you:

1. **TIKTOK_OAUTH_SETUP.md** - Complete comprehensive guide
2. **FRONTEND_TIKTOK_GUIDE.md** - Quick frontend integration
3. **COMMENTS_SETUP_GUIDE.md** - Original comments API guide
4. **.env.example** - Environment variables template

---

## 🔍 Current Status

### ✅ Backend Complete
- OAuth routes created
- Session management ready
- CORS configured for frontend
- Comment system integrated with TikTok users

### ⏳ Next Steps
1. Get TikTok sandbox credentials
2. Create `.env` file with credentials
3. Set up frontend (follow FRONTEND_TIKTOK_GUIDE.md)
4. Test the full flow

---

## ❓ Need Help?

### Common Issues

**"Cannot find module 'axios'"**
- Run: `npm install axios`

**"Missing environment variables"**
- Create `.env` file from `.env.example`
- Add your TikTok credentials

**"CORS error"**
- Make sure `FRONTEND_URL` in `.env` matches your frontend URL
- Check frontend uses `credentials: 'include'` in fetch

**"Session not persisting"**
- Verify session secret in `.env`
- Check cookies enabled in browser
- Make sure both servers running

### Backend Routes

Test these endpoints:

```bash
# Get auth URL
curl http://localhost:8888/api/reader/auth/tiktok

# Get current user (after login)
curl http://localhost:8888/api/reader/me \
  --cookie "cookie-from-browser"

# Logout
curl http://localhost:8888/api/reader/logout \
  --cookie "cookie-from-browser"
```

---

## 🎯 What's Next?

After testing in sandbox:

1. Request production access from TikTok
2. Update redirect URIs for production domain
3. Remove anonymous comment support
4. Add comment moderation
5. Deploy to production

---

**Ready to start?** Begin with step 1: Get your TikTok credentials! 🚀
