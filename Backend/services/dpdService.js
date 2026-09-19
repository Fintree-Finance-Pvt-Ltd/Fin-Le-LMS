const db = require("../config/db");

/*
|--------------------------------------------------------------------------
| DPD RECALCULATION
|--------------------------------------------------------------------------
|
| manual_rps_fintree_personal_loan.dpd is written once when the schedule
| row is created and never updated again anywhere else in the codebase —
| nothing recomputes it as a loan ages past its due date. That leaves the
| DPD-bucket / portfolio-at-risk reporting silently wrong (every loan
| reads as "Current" forever, no matter how overdue it actually is).
|
| This does one straightforward thing: for every schedule row not fully
| paid, dpd = days between today and due_date (0 if not yet due, or if
| paid). Safe to run repeatedly — it's a pure recompute, not an
| accumulator.
|--------------------------------------------------------------------------
*/
async function recalculateDpd() {
  const [result] = await db.query(
    `
    UPDATE manual_rps_fintree_personal_loan
    SET dpd = CASE
      WHEN status = 'Paid' THEN 0
      WHEN due_date < CURDATE() THEN DATEDIFF(CURDATE(), due_date)
      ELSE 0
    END
    `,
  );

  return {
    checkedAt: new Date().toISOString(),
    rowsMatched: result.affectedRows,
    rowsChanged: result.changedRows,
  };
}

module.exports = {
  recalculateDpd,
};
