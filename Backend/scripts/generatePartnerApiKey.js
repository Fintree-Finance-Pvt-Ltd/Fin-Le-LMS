require("dotenv").config();

const crypto = require("crypto");
const db = require("../config/db");

async function createPartnerApiKey() {
  try {
    const partnerCode = "PERSONAL_LOAN_PLP";
    const partnerName = "Personal Loan Platform";

    const apiKey =
      `plp_${crypto.randomBytes(32).toString("hex")}`;

    const apiKeyHash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const apiKeyPrefix =
      apiKey.substring(0, 12);

    const [result] = await db.query(
      `
      INSERT INTO partner_api_keys
      (
        partner_code,
        partner_name,
        api_key_hash,
        api_key_prefix,
        status,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 'ACTIVE', NULL, NOW(), NOW())
      `,
      [
        partnerCode,
        partnerName,
        apiKeyHash,
        apiKeyPrefix,
      ],
    );

    console.log("");
    console.log("=====================================");
    console.log("Partner API Key Created Successfully");
    console.log("=====================================");
    console.log("DB ID:", result.insertId);
    console.log("Partner:", partnerCode);
    console.log("Prefix:", apiKeyPrefix);
    console.log("");
    console.log("API KEY:");
    console.log(apiKey);
    console.log("");
    console.log("Copy this key now.");
    console.log("=====================================");

    await db.end();

  } catch (error) {
    console.error(
      "API key generation failed:",
      error,
    );

    process.exit(1);
  }
}

createPartnerApiKey();
