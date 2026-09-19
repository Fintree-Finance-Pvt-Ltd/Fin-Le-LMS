const http = require("http");
const db = require("../config/db");
const app = require("../app");

async function runTests() {
  const server = http.createServer(app);
  const PORT = 5099;

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[TEST] Test server started on port ${PORT}`);

  const testLan = "FTPLTEST99999";
  const testUtr = `UTRTEST_${Date.now()}`;
  const secret = process.env.PLP_DISBURSAL_WEBHOOK_SECRET || "kjhfdkjhdsfijfiueri9uew98982389udewui3e989823ui2387de3huie";

  try {
    // 1. Clean up any existing test records
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("DELETE FROM manual_rps_fintree_personal_loan WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM ev_disbursement_utr WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM pl_disbursal_webhook_deliveries WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM pl_partner_applications WHERE lan = ?", [testLan]);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    const timestamp = Date.now();
    const [appResult] = await db.query(
      `INSERT INTO pl_partner_applications
       (
         client_id, partner_application_id, partner_application_number, external_application_reference, lan, requested_amount,
         requested_tenure, tenure_type, interest_rate, status, customer_full_name,
         selected_offer_amount, selected_offer_tenure, bre_gross_approved_amount
       )
       VALUES (1, ?, ?, ?, ?, 10000.00, 30, 'DAYS', 24.00, 'DISBURSE_INITIATED', 'Test Customer', 10000.00, 30, 10000.00)`,
      [`TEST_APP_${timestamp}`, `NUM_${timestamp}`, `EXT_REF_${timestamp}`, testLan],
    );
    console.log(`[TEST] Inserted test application ID: ${appResult.insertId} for LAN: ${testLan}`);

    // Helper for HTTP POST
    const makePostRequest = (path, headers, body) => {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: PORT,
            path,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                resolve({ status: res.statusCode, body: JSON.parse(data) });
              } catch (e) {
                resolve({ status: res.statusCode, body: data });
              }
            });
          },
        );
        req.on("error", reject);
        req.write(JSON.stringify(body));
        req.end();
      });
    };

    // Test Case 1: Rejection on missing/invalid secret
    console.log("\n--- Test Case 1: Rejection on invalid secret ---");
    const res1 = await makePostRequest(
      "/api/webhooks/lenders/FFPL2026/disbursal",
      { "x-pl-webhook-secret": "WRONG_SECRET" },
      { lan: testLan, utr: testUtr, disbursement_date: "2026-09-19", amount: 10000, status: "SUCCESS" },
    );
    console.log("Status:", res1.status, "Body:", res1.body);
    if (res1.status !== 401 || res1.body.code !== "INVALID_WEBHOOK_SECRET") {
      throw new Error(`Test Case 1 Failed! Expected 401 INVALID_WEBHOOK_SECRET, got ${res1.status}`);
    }
    console.log("✓ Test Case 1 Passed!");

    // Test Case 2: Rejection on invalid LAN format
    console.log("\n--- Test Case 2: Rejection on invalid LAN format ---");
    const res2 = await makePostRequest(
      "/api/webhooks/lenders/FFPL2026/disbursal",
      { "x-disbursal-webhook-secret": secret },
      { lan: "INVALID_LAN_123", utr: testUtr, disbursement_date: "2026-09-19", amount: 10000, status: "SUCCESS" },
    );
    console.log("Status:", res2.status, "Body:", res2.body);
    if (res2.status !== 422 || res2.body.code !== "INVALID_LAN") {
      throw new Error(`Test Case 2 Failed! Expected 422 INVALID_LAN, got ${res2.status}`);
    }
    console.log("✓ Test Case 2 Passed!");

    // Test Case 3: Handling non-existent LAN
    console.log("\n--- Test Case 3: Rejection on non-existent LAN ---");
    const res3 = await makePostRequest(
      "/api/webhooks/lenders/FFPL2026/disbursal",
      { "x-disbursal-webhook-secret": secret },
      { lan: "FTPL999999999", utr: testUtr, disbursement_date: "2026-09-19", amount: 10000, status: "SUCCESS" },
    );
    console.log("Status:", res3.status, "Body:", res3.body);
    if (res3.status !== 404 || res3.body.code !== "APPLICATION_NOT_FOUND") {
      throw new Error(`Test Case 3 Failed! Expected 404 APPLICATION_NOT_FOUND, got ${res3.status}`);
    }
    console.log("✓ Test Case 3 Passed!");

    // Test Case 4: Valid Webhook Execution
    console.log("\n--- Test Case 4: Valid Disbursal Webhook Execution ---");
    const res4 = await makePostRequest(
      "/api/webhooks/lenders/FFPL2026/disbursal",
      { "x-disbursal-webhook-secret": secret },
      {
        lan: testLan,
        utr: testUtr,
        disbursement_date: "2026-09-19",
        amount: 10000,
        status: "SUCCESS",
        eventId: `EVT_${Date.now()}`,
      },
    );
    console.log("Status:", res4.status, "Body:", res4.body);
    if (res4.status !== 200 || !res4.body.success) {
      throw new Error(`Test Case 4 Failed! Expected 200 success, got ${res4.status}`);
    }
    console.log("✓ Test Case 4 Passed!");

    // Verify DB state
    console.log("\n--- Verifying Database Updates ---");

    // 1. Application Status
    const [apps] = await db.query("SELECT status FROM pl_partner_applications WHERE lan = ?", [testLan]);
    console.log("Application Status:", apps[0]?.status);
    if (apps[0]?.status !== "DISBURSED") {
      throw new Error(`DB Check Failed! Application status expected DISBURSED, got ${apps[0]?.status}`);
    }
    console.log("✓ Application status updated to DISBURSED!");

    // 2. ev_disbursement_utr
    const [utrs] = await db.query("SELECT Disbursement_UTR, Disbursement_Date, lan FROM ev_disbursement_utr WHERE lan = ?", [testLan]);
    console.log("Disbursement UTR Record:", utrs[0]);
    if (!utrs.length || utrs[0].Disbursement_UTR !== testUtr) {
      throw new Error(`DB Check Failed! ev_disbursement_utr record missing or incorrect.`);
    }
    console.log("✓ UTR record created in ev_disbursement_utr!");

    // 3. manual_rps_fintree_personal_loan
    const [rps] = await db.query("SELECT lan, due_date, status, emi, interest, principal FROM manual_rps_fintree_personal_loan WHERE lan = ?", [testLan]);
    console.log("RPS Schedule Record:", rps[0]);
    if (!rps.length) {
      throw new Error(`DB Check Failed! manual_rps_fintree_personal_loan record missing.`);
    }
    console.log("✓ Bullet RPS schedule generated in manual_rps_fintree_personal_loan!");

    // 4. pl_disbursal_webhook_deliveries outbox
    const [outbox] = await db.query("SELECT unique_request_number, delivery_status, payload FROM pl_disbursal_webhook_deliveries WHERE lan = ?", [testLan]);
    console.log("Outbox Delivery Record:", outbox[0]);
    if (!outbox.length) {
      throw new Error(`DB Check Failed! Outbox delivery record missing from pl_disbursal_webhook_deliveries.`);
    }
    console.log("✓ Outbox record logged in pl_disbursal_webhook_deliveries!");

    // Test Case 5: Idempotency (Repeat Webhook)
    console.log("\n--- Test Case 5: Idempotent Repeat Disbursal Webhook ---");
    const res5 = await makePostRequest(
      "/api/webhooks/lenders/FFPL2026/disbursal",
      { "x-disbursal-webhook-secret": secret },
      {
        lan: testLan,
        utr: testUtr,
        disbursement_date: "2026-09-19",
        amount: 10000,
        status: "SUCCESS",
      },
    );
    console.log("Status:", res5.status, "Body:", res5.body);
    if (res5.status !== 200 || !res5.body.success) {
      throw new Error(`Test Case 5 Failed! Repeat webhook failed with status ${res5.status}`);
    }
    console.log("✓ Test Case 5 Passed! (Idempotency verified)");

    // Clean up test data
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("DELETE FROM manual_rps_fintree_personal_loan WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM ev_disbursement_utr WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM pl_disbursal_webhook_deliveries WHERE lan = ?", [testLan]);
    await db.query("DELETE FROM pl_partner_applications WHERE lan = ?", [testLan]);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("\n[TEST] Cleaned up test database records.");

    console.log("\n🎉 ALL DISBURSAL WEBHOOK TESTS PASSED SUCCESSFULLY! 🎉\n");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
