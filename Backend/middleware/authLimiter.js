const rateLimit = require("express-rate-limit");


const authLimiter = rateLimit({

  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 20, // only login attempts

  message: {
    status: 429,
    message: "Too many login attempts. Please try again later.",
  },

  standardHeaders: true,

  legacyHeaders: false,

});


module.exports = authLimiter;