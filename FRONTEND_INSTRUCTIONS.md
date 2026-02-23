# TikTok OAuth Frontend - Build Instructions

A step-by-step guide on WHAT to build for TikTok login integration (not copy-paste code).

---

## 🎯 Overview

You need to build a frontend that:
1. Lets users click a "Login with TikTok" button
2. Redirects them to TikTok for authorization
3. Handles the return from TikTok
4. Shows user info when logged in
5. Lets users post comments with their TikTok identity

---

## 📦 Installation

### Install Required Package

```bash
npm install axios
```

### Environment Setup

Create `.env.local` with:
- `NEXT_PUBLIC_API_URL` pointing to your backend (http://localhost:8888)

---

## 🏗️ What to Build

### 1. Login Button Component

**Location:** `components/TikTokLoginButton.jsx`

**Purpose:** Initiates the TikTok login flow

**What it should do:**
- When clicked, fetch the TikTok auth URL from your backend (`GET /api/reader/auth/tiktok`)
- Store the current page path in sessionStorage (so you can return user to it after login)
- Redirect the browser to the TikTok auth URL

**Key considerations:**
- Use `credentials: 'include'` in fetch requests to send cookies
- Handle errors gracefully (show alert or message if auth URL fetch fails)

---

### 2. Success Callback Page

**Location:** `app/auth/tiktok/success/page.jsx`

**Purpose:** Landing page after successful TikTok authentication

**What it should do:**
- Show a success message ("Login Successful!")
- Retrieve the stored page path from sessionStorage
- Redirect user back to that page after 1-2 seconds
- Clean up sessionStorage

**Why this exists:** The backend OAuth callback redirects here after creating the session

---

### 3. Error Callback Page

**Location:** `app/auth/tiktok/error/page.jsx`

**Purpose:** Landing page if TikTok authentication fails

**What it should do:**
- Show error message
- Provide a button to go back home
- Maybe log the error for debugging

---

### 4. User Context Provider (Recommended)

**Location:** `lib/UserContext.jsx`

**Purpose:** Global state management for logged-in user

**What it should provide:**
- `user` object (null if not logged in, contains user data if logged in)
- `loading` boolean (true while checking login status)
- `logout()` function
- `refreshUser()` function to re-check login status

**What it should do:**
- On mount, check if user is logged in by calling `GET /api/reader/me`
- Store user data in state if logged in
- Provide logout function that calls `GET /api/reader/logout`

**Setup:**
- Wrap your app in this provider at the layout level
- Make it available via React Context

---

### 5. User Status Component

**Location:** `components/UserStatus.jsx`

**Purpose:** Shows login button OR user info depending on state

**What it should render:**

**If loading:** Show "Loading..."

**If not logged in:** Show the TikTok Login Button

**If logged in:** Show:
- User's avatar image
- Welcome message with display name
- Logout button

**Key points:**
- Use the User Context to get user state
- Call logout function from context when logout clicked

---

### 6. Comments Section Component

**Location:** `components/CommentsSection.jsx`

**Purpose:** Complete commenting system with TikTok integration

**Props:** `articleId` (the article these comments belong to)

**What it needs to manage (state):**
- List of comments
- Current comment text being typed
- Anonymous name (for non-logged-in users during testing)
- Which comment is being replied to (for nested comments)
- Loading state

**What it should do:**

**On load:**
- Fetch comments from `GET /api/comments/article/{articleId}`
- Display them in a list

**Comment form:**
- If user not logged in: Show name input field + comment textarea
- If user logged in: Show only comment textarea (no name needed)
- Show "Post Comment" or "Post Reply" button depending on state
- If replying, show "Cancel Reply" button

**On submit:**
- Validate: check comment has text
- Validate: if not logged in, check name is entered
- Build comment data:
  - `articleId`: from props
  - `content`: from textarea
  - `author`: user ID if logged in
  - `anonymousName`: if not logged in (testing only)
  - `parentId`: if replying to another comment
- POST to `/api/comments`
- On success: clear form, refresh comments list
- On error: show error message

**Display each comment:**
- Show avatar (if author has one)
- Show display name (author.displayName or anonymousName)
- Show comment content
- Show date posted
- Show like button with count
- Show reply button

**Like functionality:**
- When like button clicked, send `PUT /api/comments/{commentId}/like`
- Refresh comments list to show updated count

**Nested replies:**
- Render replies recursively
- Indent them visually
- Each reply can also have the same actions (like, reply)

---

### 7. Styling (CSS)

**Location:** `app/globals.css` or component-level CSS

**What to style:**

**TikTok Login Button:**
- Black background, white text
- TikTok logo SVG icon
- Hover effect (lighter background)
- Rounded corners

**User Status Area:**
- Horizontal flex layout
- Avatar: circular, 40px
- Name and logout button aligned

**Comments Section:**
- Header with title and user status
- Max width container (800px)
- Comment form: light gray background, rounded corners
- Each comment: white card with border, padding
- Nested replies: indented, left border
- Like/Reply buttons: subtle, bordered
- Responsive: stack on mobile

---

## 🔄 User Flow Diagram

```
Visit article → See "Login with TikTok" button
    ↓
Click button → Fetch auth URL from backend
    ↓
Redirect to TikTok → User authorizes app
    ↓
TikTok redirects to backend → Backend creates session
    ↓
Backend redirects to /auth/tiktok/success
    ↓
Success page redirects back to article
    ↓
Article page shows: "Welcome, [User]!" + Comments form ready
```

---

## 🧪 Testing Plan

### Manual Testing Steps:

1. **Test login:**
   - Click login button
   - Should redirect to TikTok
   - Authorize
   - Should come back and show your name

2. **Test session persistence:**
   - Refresh the page
   - Should still show logged in

3. **Test commenting:**
   - Post a comment as logged-in user
   - Should show your avatar and name

4. **Test logout:**
   - Click logout
   - Should show login button again

5. **Test anonymous (during development):**
   - Ensure you can still post without login
   - Should require name input

6. **Test replies:**
   - Click reply on a comment
   - Post should be nested under parent

7. **Test likes:**
   - Click like button
   - Count should increment

---

## 🚨 Important API Integration Points

### All fetch requests to backend MUST include:
```javascript
credentials: 'include'  // This sends cookies for session!
```

### Backend endpoints you'll use:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reader/auth/tiktok` | GET | Get TikTok auth URL |
| `/api/reader/me` | GET | Check if user logged in |
| `/api/reader/logout` | GET | Logout user |
| `/api/comments/article/:id` | GET | Get comments for article |
| `/api/comments` | POST | Create new comment |
| `/api/comments/:id/like` | PUT | Like a comment |

---

## 📝 Implementation Order (Recommended)

Build in this order for easiest testing:

1. ✅ Install axios + create .env.local
2. ✅ Create TikTok Login Button
3. ✅ Create success/error callback pages
4. ✅ Test login flow (should work even without other components)
5. ✅ Create User Context
6. ✅ Create User Status component
7. ✅ Test session persistence
8. ✅ Create basic Comments Section (just display)
9. ✅ Add comment posting
10. ✅ Add replies
11. ✅ Add likes
12. ✅ Add CSS styling
13. ✅ Test everything together

---

## 🔒 Security Reminders

- Always use `credentials: 'include'` in fetch
- Never log user tokens or sensitive data
- Validate user input before sending to backend
- Handle errors gracefully (don't expose backend errors to users)

---

## 📚 Resources

**If you need example code:** Check `FRONTEND_TIKTOK_GUIDE.md`

**For backend API details:** Check `COMMENTS_SETUP_GUIDE.md`

**For OAuth flow details:** Check `TIKTOK_OAUTH_SETUP.md`

---

## ✅ Completion Checklist

- [ ] User can click "Login with TikTok"
- [ ] User is redirected to TikTok
- [ ] User returns and sees their name/avatar
- [ ] User can post comments
- [ ] Comments show with author info
- [ ] User can reply to comments
- [ ] User can like comments
- [ ] User can logout
- [ ] Session persists on refresh
- [ ] Error states are handled gracefully
- [ ] UI looks good and is responsive

---

Now go build! 🚀

If you get stuck on implementation details, refer to FRONTEND_TIKTOK_GUIDE.md for code examples.
