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
import { s3 } from "../config/r2.js";
import {
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

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

  // Always return profilePicture as CDN URL if present, even if only filename is stored
  let profilePicture = user.profilePicture || null;
  if (profilePicture && !profilePicture.startsWith('http')) {
    profilePicture = `${process.env.PROFILE_IMAGE_BASE}/${profilePicture}`;
  }
  res.json({
    success: true,
    email: user.user,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    role: user.role,
    profilePicture,
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
  let authStatus =
    await userModel.authenticateUser(
      req.body.u,
      req.body.pw
    );

  if (authStatus) {
    const user =
      await userModel.getUserByEmail(
        req.body.u
      );

    if (user?.role !== "admin") {
      return res.render("user/login", {
        err: "Admin access required",
        currentPath: req.path,
      });
    }

    req.session.loggedIn = true;
    req.session.user = req.body.u;
    req.session.role = user.role;

    const redirectUrl =
      req.session.redirectUrl || "/user";

    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
  } else {
    res.render("user/login", {
      err: "user not found",
      currentPath: req.path,
    });
  }
};

const apiLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    let authStatus =
      await userModel.authenticateUser(
        email,
        password
      );

    if (!authStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const user =
      await userModel.getUserByEmail(email);

    if (user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.session.loggedIn = true;
    req.session.user = email;
    req.session.role = user.role;

    res.json({
      success: true,
      email: user.user,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      role: user.role,
      profilePicture:
        user.profilePicture || null,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
    });
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

  if (result) res.redirect("/login");
  else
    res.render("user/register", {
      err: "User exists",
    });
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
  apiLogout,
  apiGetUser,
  uploadProfilePicture,
  streamProfileImage,
  apiUpdateUserProfile,
};