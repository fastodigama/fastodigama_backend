// ==============================
// API: Update current user's firstname and lastname
// ==============================
const apiUpdateUserProfile = async (req, res) => {
  if (!req.session.loggedIn || !req.session.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const { firstName, lastName, nickname } = req.body;
  if (!firstName || !lastName || !nickname) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const user = await userModel.getUserByEmail(req.session.user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    await userModel.updateUserById(user._id, user.user, firstName, lastName, nickname);
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("USER PROFILE UPDATE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
import userModel from "./model.js";
import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import axios from "axios";
import { s3 } from "../config/r2.js";
import {
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

function buildFrontendRedirectUrl(status, message) {
  const fallbackUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "/";
  const redirectUrl = new URL(fallbackUrl);
  redirectUrl.searchParams.set("auth", status);
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }
  return redirectUrl.toString();
}

function establishUserSession(req, userEmail, role) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        return reject(err);
      }

      req.session.loggedIn = true;
      req.session.user = userEmail;
      req.session.role = role;
      req.session.save((saveErr) => {
        if (saveErr) {
          return reject(saveErr);
        }
        resolve();
      });
    });
  });
}

function getGoogleOAuthConfig() {
  return {
    clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
}

function getAllowedFrontendOrigin() {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_BASE_URL ||
    process.env.GOOGLE_AUTH_SUCCESS_REDIRECT ||
    "/";

  try {
    return new URL(frontendUrl).origin;
  } catch {
    return null;
  }
}

function getSafeGoogleReturnTo(returnTo) {
  const fallbackUrl =
    process.env.GOOGLE_AUTH_SUCCESS_REDIRECT ||
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_BASE_URL ||
    "/";

  if (!returnTo) {
    return fallbackUrl;
  }

  try {
    const parsedUrl = new URL(String(returnTo));
    const allowedOrigin = getAllowedFrontendOrigin();

    if (!allowedOrigin || parsedUrl.origin !== allowedOrigin) {
      return fallbackUrl;
    }

    return parsedUrl.toString();
  } catch {
    return fallbackUrl;
  }
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function normalizeProfilePictureForResponse(profilePicture) {
  if (!profilePicture) {
    return null;
  }

  const normalized = String(profilePicture).trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsedUrl = new URL(normalized);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl.toString();
      }
    } catch {
      return null;
    }
  }

  return `${process.env.PROFILE_IMAGE_BASE}/${normalized}`;
}

async function importGoogleProfilePictureToR2(user, googlePhotoUrl) {
  if (!user || !googlePhotoUrl) {
    return null;
  }

  const response = await axios.get(googlePhotoUrl, {
    responseType: "arraybuffer",
    timeout: 10000,
    maxRedirects: 5,
  });

  const fileName = `profile-${user._id}-${Date.now()}-${crypto.randomUUID()}.webp`;
  const buffer = await sharp(Buffer.from(response.data))
    .resize(400, 400, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_PROFILE_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/webp",
    })
  );

  return fileName;
}

function buildPasswordResetUrl(token) {
  const resetBaseUrl =
    process.env.RESET_PASSWORD_URL_BASE ||
    process.env.RESET_PASSWORD_PAGE_URL ||
    `${process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/reset-password`;

  const resetUrl = new URL(resetBaseUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

async function sendPasswordResetEmail(email, resetUrl) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey) {
    console.log("[PASSWORD_RESET] RESEND_API_KEY not set, reset link generated only", JSON.stringify({
      email,
      resetUrl,
    }));
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: "Reset your Fastodigama password",
      html: `
        <p>You requested a password reset for your Fastodigama account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>This link expires in 30 minutes.</p>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  return true;
}

// ==============================
// API: Get current user
// ==============================
const apiGetUser = async (req, res) => {
  if (!req.session.loggedIn || !req.session.user) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  }

  const user = await userModel.getUserByEmail(
    req.session.user
  );

  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: "User not found" });
  }

  const profilePicture = normalizeProfilePictureForResponse(user.profilePicture);
  res.json({
    success: true,
    _id: user._id,
    email: user.user,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    role: user.role,
    profilePicture,
    avatar: profilePicture,
    picture: profilePicture,
  });
};

// ==============================
// Multer setup
// ==============================
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ==============================
// Upload Profile Picture
// ==============================
const uploadProfilePicture = [
  profileUpload.single("profilePicture"),
  async (req, res) => {
    if (!req.session.loggedIn || !req.session.user) {
      return res
        .status(401)
        .json({ success: false });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false });
    }

    try {
      const email = req.session.user;
      const user =
        await userModel.getUserByEmail(email);

      if (!user) {
        return res
          .status(404)
          .json({ success: false });
      }

      const fileName =
        `profile-${user._id}-${Date.now()}.webp`;

      const buffer = await sharp(
        req.file.buffer
      )
        .resize(400, 400, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket:
            process.env.R2_PROFILE_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        })
      );

      // Store only filename in DB, return CDN URL to frontend
      await userModel.updateProfilePicture(
        user._id,
        fileName
      );

      const profileUrl = `${process.env.PROFILE_IMAGE_BASE}/${fileName}`;
      res.json({
        success: true,
        message: "Profile picture uploaded",
        url: profileUrl,
      });

    } catch (err) {
      console.error(
        "PROFILE PIC UPLOAD ERROR:",
        err
      );
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
];

// ==============================
// USER PAGES & AUTH
// ==============================

const getUser = async (req, res) => {
  res.render("user/user", {
    currentPath: req.path,
    title: "My Account",
  });
};

const loginForm = async (req, res) => {
  res.render("user/login", {
    currentPath: req.path,
    title: "Login",
  });
};

const login = async (req, res) => {
  try {
    let authStatus =
      await userModel.authenticateUser(
        req.body.u,
        req.body.pw
      );

    if (authStatus) {
      const redirectUrl =
        req.session.redirectUrl || "/user";

      const user =
        await userModel.getUserByEmail(
          req.body.u
        );

      if (!user) {
        return res.render("user/login", {
          err: "user not found",
          currentPath: req.path,
        });
      }

      await establishUserSession(
        req,
        user.user,
        user.role
      );

      delete req.session.redirectUrl;
      res.redirect(redirectUrl);
    } else {
      res.render("user/login", {
        err: "user not found",
        currentPath: req.path,
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).render("user/login", {
      err: "Server error. Please try again later.",
      currentPath: req.path,
    });
  }
};

const apiLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    let authStatus = await userModel.authenticateUser(email, password);
    if (!authStatus) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    await establishUserSession(req, user.user, user.role);
    res.json({
      success: true,
      email: user.user,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      role: user.role,
      profilePicture: normalizeProfilePictureForResponse(user.profilePicture),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
};

const apiForgotPassword = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    const user = await userModel.getUserByEmail(email);
    if (user && user.password) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await userModel.savePasswordResetToken(
        email,
        tokenHash,
        expiresAt
      );

      const resetUrl = buildPasswordResetUrl(rawToken);
      try {
        const emailSent = await sendPasswordResetEmail(email, resetUrl);
        console.log("[PASSWORD_RESET] Reset link generated", JSON.stringify({
          email,
          resetUrl,
          expiresAt: expiresAt.toISOString(),
          emailSent,
        }));
      } catch (mailErr) {
        console.error("PASSWORD RESET EMAIL ERROR:", mailErr);
        console.log("[PASSWORD_RESET] Reset link generated", JSON.stringify({
          email,
          resetUrl,
          expiresAt: expiresAt.toISOString(),
          emailSent: false,
        }));
      }
    }

    return res.json({
      success: true,
      message: "If an account exists for that email, a reset link has been generated.",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const apiResetPassword = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Token and new password are required",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await userModel.consumePasswordResetToken(
      tokenHash,
      newPassword
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired",
      });
    }

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

const googleAuthStart = async (req, res) => {
  const {
    clientId,
    redirectUri,
  } = getGoogleOAuthConfig();

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      success: false,
      message: "Google OAuth is not configured",
    });
  }

  const state = crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState = state;
  req.session.googleReturnTo = getSafeGoogleReturnTo(
    req.query.returnTo || req.get("referer")
  );
  await saveSession(req);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  res.redirect(authUrl.toString());
};

const googleAuthCallback = async (req, res) => {
  const {
    code,
    state,
    error,
  } = req.query;

  const frontendErrorRedirect = buildFrontendRedirectUrl(
    "error",
    "google_auth_failed"
  );

  if (error) {
    return res.redirect(frontendErrorRedirect);
  }

  if (!code || !state || state !== req.session.googleOAuthState) {
    return res.redirect(frontendErrorRedirect);
  }

  delete req.session.googleOAuthState;

  const {
    clientId,
    clientSecret,
    redirectUri,
  } = getGoogleOAuthConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(frontendErrorRedirect);
  }

  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data?.access_token;
    if (!accessToken) {
      return res.redirect(frontendErrorRedirect);
    }

    const googleUserResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const googleUser = googleUserResponse.data;
    const email = googleUser?.email?.toLowerCase();
    const isVerified = googleUser?.verified_email === true;

    if (!email || !isVerified) {
      return res.redirect(frontendErrorRedirect);
    }

    const existingUser = await userModel.getUserByEmail(email);
    const user = await userModel.findOrCreateGoogleUser({
      email,
      firstName: googleUser.given_name || googleUser.name || "Google",
      lastName: googleUser.family_name || "",
    });
    let importedGoogleProfilePicture = null;

    try {
      importedGoogleProfilePicture = await importGoogleProfilePictureToR2(
        user,
        googleUser.picture || ""
      );
    } catch (pictureErr) {
      console.error("GOOGLE PROFILE IMPORT ERROR:", pictureErr.message);
    }

    const syncedUser = await userModel.syncGoogleProfilePicture(
      user,
      importedGoogleProfilePicture || ""
    );

    const successRedirect = getSafeGoogleReturnTo(req.session.googleReturnTo);
    await establishUserSession(req, syncedUser.user, syncedUser.role);

    res.redirect(successRedirect);
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err?.response?.data || err);
    res.redirect(frontendErrorRedirect);
  }
};

const logout = async (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

const apiLogout = async (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(
      "FastodigamaSession"
    );
    res.json({ success: true });
  });
};

// ==============================
// REGISTER
// ==============================
const registerForm = async (req, res) => {
  res.render("user/register", {
    currentPath: req.path,
  });
};

const register = async (req, res) => {
  const {
    u,
    pw,
    firstName,
    lastName,
    nickName,
  } =
    req.body;

  let result =
    await userModel.addUser(
      u,
      pw,
      firstName,
      lastName,
      nickName
    );

  if (result) {
    res.redirect("/login");
  } else {
    // Return 409 Conflict status for duplicate email
    return res.status(409).json({ 
      success: false, 
      message: "Email already exists. Please use a different email." 
    });
  }
};

// ==============================
// ADMIN USERS
// ==============================
const getAllUsers = async (req, res) => {
  let users =
    await userModel.getAllUsers();

  res.render("user/users-list", {
    title: "Manage Users",
    users,
    currentPath: req.path,
  });
};

const resetPasswordForm = async (
  req,
  res
) => {
  const user =
    await userModel.getUserById(
      req.params.id
    );

  res.render("user/reset-password", {
    title: "Reset Password",
    user,
  });
};

const resetPassword = async (
  req,
  res
) => {
  await userModel.resetPasswordById(
    req.params.id,
    req.body.newPassword
  );

  res.redirect("/admin/users");
};

const editUserForm = async (
  req,
  res
) => {
  const user =
    await userModel.getUserById(
      req.params.id
    );

  res.render("user/user-edit", {
    title: "Edit User",
    user,
  });
};

const editUser = async (req, res) => {
  await userModel.updateUserById(
    req.params.id,
    req.body.newUsername,
    req.body.firstName,
    req.body.lastName,
    req.body.newNickName
  );

  res.redirect("/admin/users");
};

const deleteUser = async (req, res) => {
  await userModel.deleteUserById(
    req.params.id
  );

  res.redirect("/admin/users");
};

// ==============================
// LEGACY STREAM (KEPT SAFE)
// ==============================
const streamProfileImage = async (
  req,
  res
) => {
  const fileName =
    req.params.fileName;

  try {
    const data = await s3.send(
      new GetObjectCommand({
        Bucket:
          process.env
            .R2_PROFILE_BUCKET_NAME,
        Key: fileName,
      })
    );

    res.setHeader(
      "Content-Type",
      data.ContentType ||
        "image/webp"
    );

    data.Body.pipe(res);
  } catch {
    res.status(404).end();
  }
};

// ==============================
// GDPR ENDPOINTS
// ==============================

// API: Export User Data (Right to Portability)
// GET /api/user/export
const apiExportUserData = async (req, res) => {
  if (!req.session.loggedIn || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  try {
    const user = await userModel.getUserByEmail(req.session.user);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Import Comment and Consent models dynamically
    const commentModel = (await import("../Comment/model.js")).default;
    const consentModel = (await import("../Consent/model.js")).default;

    // Get all user's comments
    const comments = await commentModel.getCommentsByUser(user._id);

    // Get all user's consent records
    const consents = await consentModel.getConsentsByUserId(user._id);

    // Build complete user data export
    const userData = {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      profile: {
        _id: user._id,
        email: user.user,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt || null,
      },
      comments: comments.map(c => ({
        _id: c._id,
        articleId: c.articleId,
        content: c.content,
        parentId: c.parentId,
        likes: c.likes?.length || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        approved: c.approved
      })),
      consents: consents.map(c => ({
        consentType: c.consentType,
        granted: c.granted,
        timestamp: c.timestamp,
        ipAddress: c.ipAddress,
        userAgent: c.userAgent
      })),
      activityLogs: {
        lastRepliesSeenAt: user.lastRepliesSeenAt,
        lastLikesSeenAt: user.lastLikesSeenAt
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${user._id}.json"`);
    res.json(userData);

  } catch (err) {
    console.error("USER DATA EXPORT ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// API: Delete User Account (Right to be Forgotten)
// DELETE /api/user/account
const apiDeleteUserAccount = async (req, res) => {
  if (!req.session.loggedIn || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  const { confirmPassword } = req.body;
  if (!confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "Password confirmation required" 
    });
  }

  try {
    const user = await userModel.getUserByEmail(req.session.user);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Verify password before deletion
    const authStatus = await userModel.authenticateUser(
      req.session.user,
      confirmPassword
    );

    if (!authStatus) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }


    // Import Comment, Consent, and Like models
    const commentModel = (await import("../Comment/model.js")).default;
    const consentModel = (await import("../Consent/model.js")).default;
    const likeModel = (await import("../Like/model.js")).default;

    // GDPR-compliant deletion:
    // 1. Delete all consent records
    await consentModel.deleteConsentsByUserId(user._id);

    // 2. Anonymize user's comments (don't delete - they may be part of public discourse)
    //    Set author to null and authorName to "Vetrain Fastodian"
    await commentModel.anonymizeUserComments(user._id);

    // 3. Delete all likes by this user
    await likeModel.deleteManyByUserId(user._id);

    // 3. Delete user profile picture from R2 (if exists)
    if (user.profilePicture && !user.profilePicture.startsWith('http')) {
      try {
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_PROFILE_BUCKET_NAME,
            Key: user.profilePicture,
          })
        );
      } catch (deleteErr) {
        console.error("Profile picture deletion error:", deleteErr);
        // Continue with account deletion even if image deletion fails
      }
    }

    // 4. Delete the user account
    await userModel.deleteUserById(user._id);

    // 5. Destroy session
    req.session.destroy(() => {
      res.clearCookie("FastodigamaSession");
      res.json({ 
        success: true, 
        message: "Account deleted successfully" 
      });
    });

  } catch (err) {
    console.error("USER ACCOUNT DELETION ERROR:", err);
    if (err && err.stack) {
      console.error("STACK TRACE:", err.stack);
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err && err.message ? err.message : String(err)
    });
  }
};

// ==============================
export {
  getUser,
  loginForm,
  login,
  register,
  registerForm,
  logout,
  getAllUsers,
  resetPasswordForm,
  resetPassword,
  editUserForm,
  editUser,
  deleteUser,
  apiLogin,
  apiForgotPassword,
  apiResetPassword,
  googleAuthStart,
  googleAuthCallback,
  apiLogout,
  apiGetUser,
  uploadProfilePicture,
  streamProfileImage,
  apiUpdateUserProfile,
  apiExportUserData,
  apiDeleteUserAccount,
};
