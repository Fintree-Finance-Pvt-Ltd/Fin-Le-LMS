const express = require("express");
const { register, login, getMe, logout, } = require("../controllers/authController");

const requireAuth = require("../middleware/authMiddleware")

const router = express.Router();

router.post("/register", register);

router.get("/me", requireAuth, getMe);

router.post("/logout", requireAuth, logout);

router.post("/login", login);

module.exports = router;