const express = require("express");

const {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// PUBLIC AUTH ROUTES
// ======================================================

// Register
router.post("/register",register);

// Login
router.post("/login",login);


// ======================================================
// FORGOT PASSWORD ROUTES
// PUBLIC - USER IS NOT LOGGED IN
// ======================================================

// Step 1:
// User enters email -> OTP sent to registered email
router.post("/forgot-password",forgotPassword);

// Step 2:
// User enters OTP -> verify OTP
router.post("/verify-otp",verifyOtp);

// Step 3:
// User enters new password -> password updated
router.post("/reset-password",resetPassword);


// ======================================================
// PROTECTED AUTH ROUTES
// ======================================================

// Get current logged-in user
router.get("/me",requireAuth,getMe);

// Logout logged-in user
router.post("/logout",requireAuth,logout);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;