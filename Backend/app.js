require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

const db = require("./config/db");
const apiAuditMiddleware = require("./middleware/apiAuditMiddleware");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const creditRoutes = require("./routes/creditRoutes");
const userRoutes = require("./routes/userRoutes");
const loanRoutes = require("./routes/loanRoutes");
const disbursalRoutes = require("./routes/disbursalRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const extraChargesRoutes = require("./routes/extraChargesRoutes");
const documentRoutes = require("./routes/documentRoutes");
const reportsRoutes = require("./routes/reports");

const plPartnerRoutes = require("./modules/Partners/routes/plPartnerRoutes");
const easebuzzWebhookRoutes = require("./modules/Partners/routes/easebuzzWebhookRoutes");
const plBreRoutes = require("./modules/PersonalLoanBRE/routes/plBreRoutes");

const {
  syncPermissions,
} = require("./services/permissionSyncService");

const {
  recalculateDpd,
} = require("./services/dpdService");


const app = express();

/*
 * Both UAT and production sit behind an HTTPS-terminating reverse proxy, so
 * Express needs to trust its X-Forwarded-Proto header for secure cookies
 * (below) to be recognized as "secure" correctly.
 */
app.set("trust proxy", 1);

const isProduction =
  process.env.DEPLOYMENT_ENV === "production" ||
  process.env.DEPLOYMENT_ENV === "uat";


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  helmet({
    /*
     * The frontend (a separate origin) loads files from /uploads directly
     * (e.g. <img>/document previews) — helmet's default same-origin policy
     * would block that.
     */
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);


/*
 * General rate limit as a baseline defense against flooding/abuse across
 * the whole API (partner API included).
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/*
 * Tighter limit on auth to slow down credential brute-forcing.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many attempts, please try again later.",
  },
});


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

      secure: isProduction,

      sameSite: "lax",

      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// TEMP AUTH DEBUG
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/auth")) {
    console.log("\n===== AUTH DEBUG =====");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("SESSION ID:", req.sessionID);
    console.log("SESSION:", req.session);
    console.log("COOKIE HEADER:", req.headers.cookie);
    console.log("======================\n");
  }

  next();
});

// app.use(apiAuditMiddleware);

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
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

app.use("/api/auth", authRateLimiter, authRoutes);

app.use("/api/admin",adminRoutes);

app.use("/api/operations",operationsRoutes);

app.use("/api/credit",creditRoutes);

app.use("/api/user",userRoutes);



// ======================================================
// PARTNER / LENDER API ROUTES
// ======================================================

app.use("/api/partner/v1", apiAuditMiddleware, plPartnerRoutes);

app.use("/api/webhooks/easebuzz",easebuzzWebhookRoutes); // EASEBUZZ WEBHOOK ROUTES

app.use("/api/personal-loan/bre",plBreRoutes);  // PERSONAL LOAN BRE ROUTES

app.use("/api/loans",loanRoutes);

app.use("/api/disbursal", disbursalRoutes);

app.use("/api/schedule", scheduleRoutes);

app.use( "/api/extra-charges", extraChargesRoutes);

app.use( "/api/documents", documentRoutes);

app.use( "/api/reports", reportsRoutes);

// ======================================================
// START SERVER
// ======================================================

const PORT =
  process.env.PORT || 5000;


const startServer = async () => {
  try {

    // 1. Check database
    await db.query("SELECT 1");


    console.log(
      "MySQL database connected successfully"
    );


    // 2. Sync permissions
    await syncPermissions();


    // 3. Recalculate DPD once at boot, then daily at 00:05 —
    // manual_rps_fintree_personal_loan.dpd was otherwise never updated
    // after the schedule row was created.
    try {
      const dpdResult = await recalculateDpd();

      console.log(
        "DPD recalculated at startup:",
        dpdResult
      );
    } catch (dpdError) {

      console.error(
        "Startup DPD recalculation failed (non-fatal):",
        dpdError
      );
    }

    cron.schedule("5 0 * * *", async () => {
      try {
        const result = await recalculateDpd();

        console.log(
          "DPD recalculated (daily job):",
          result
        );
      } catch (error) {

        console.error(
          "Daily DPD recalculation failed:",
          error
        );
      }
    });


    // 4. Start server
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