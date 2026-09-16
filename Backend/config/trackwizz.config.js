require("dotenv").config();

module.exports = {
  url: process.env.TW_URL,

  apiToken: process.env.TW_API_TOKEN,

  cluster: process.env.TW_CLUSTER,

  domain: process.env.TW_DOMAIN,

  sourceSystemName: process.env.TW_SOURCE_SYSTEM_NAME,

  timeoutMs: Number(
    process.env.TW_TIMEOUT_MS || 30000
  ),
};