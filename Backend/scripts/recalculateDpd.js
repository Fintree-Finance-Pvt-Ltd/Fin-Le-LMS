/*
 * Run on demand:
 *   node scripts/recalculateDpd.js
 *
 * Recomputes manual_rps_fintree_personal_loan.dpd for every schedule row.
 * The same logic also runs automatically once a day — see app.js.
 */
const { recalculateDpd } = require("../services/dpdService");

recalculateDpd()
  .then((result) => {
    console.log("DPD recalculated:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("DPD recalculation failed:", error);
    process.exit(1);
  });
