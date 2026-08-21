require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const creditRoutes = require("./routes/creditRoutes");
const userRoutes = require("./routes/userRoutes");

const plPartnerRoutes = require("./modules/Partners/routes/plPartnerRoutes");

const {
  syncPermissions,
} = require("./services/permissionSyncService");


const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


// IMPORTANT:
// Partner docs API contains contentBase64,
// so increase JSON body size.
app.use(
  express.json({
    limit: "20mb",
  }),
);


app.use(
  session({
    secret: process.env.SESSION_SECRET,

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);


// ======================================================
// ROOT
// ======================================================

app.get("/", (req, res) => {
  res.send(
    "Personal Loan LMS API is running"
  );
});


// ======================================================
// NORMAL LMS ROUTES
// ======================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/operations",
  operationsRoutes
);

app.use(
  "/api/credit",
  creditRoutes
);

app.use(
  "/api/user",
  userRoutes
);


// ======================================================
// PARTNER / LENDER API ROUTES
// ======================================================

app.use(
  "/api/partner/v1",
  plPartnerRoutes,
);


// ======================================================
// START SERVER
// ======================================================

const PORT =
  process.env.PORT || 5000;


const startServer = async () => {
  try {

    // 1. Check database
    await db
      .promise()
      .query("SELECT 1");


    console.log(
      "MySQL database connected successfully"
    );


    // 2. Sync permissions
    await syncPermissions();


    // 3. Start server
    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });

  } catch (error) {

    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
};


startServer();