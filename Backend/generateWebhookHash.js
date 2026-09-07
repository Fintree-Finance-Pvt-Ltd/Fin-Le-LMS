require("dotenv").config();

const crypto = require("node:crypto");

const data = {
  beneficiary_account_number:
    "123456789012",

  beneficiary_account_ifsc:
    "HDFC0001234",

  beneficiary_upi_handle:
    "",

  unique_request_number:
    "DISB_2_1788774504857",

  amount:
    4882,

  unique_transaction_reference:
    "",

  status:
    "failed",
};

function formatAmount(amount) {
  const num = Number(amount);

  if (Number.isInteger(num)) {
    return num.toFixed(1);
  }

  return num.toString();
}

const raw = [
  process.env.EASEBUZZ_KEY,
  data.beneficiary_account_number || "",
  data.beneficiary_account_ifsc || "",
  data.beneficiary_upi_handle || "",
  data.unique_request_number,
  formatAmount(data.amount),
  data.unique_transaction_reference || "",
  data.status,
  process.env.EASEBUZZ_SALT,
].join("|");

const hash = crypto
  .createHash("sha512")
  .update(raw)
  .digest("hex");

console.log("\nAuthorization Hash:\n");
console.log(hash);