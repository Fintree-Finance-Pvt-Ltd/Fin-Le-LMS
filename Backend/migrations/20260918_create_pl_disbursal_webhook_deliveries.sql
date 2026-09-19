CREATE TABLE IF NOT EXISTS pl_disbursal_webhook_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unique_request_number VARCHAR(128) NOT NULL,
  lan VARCHAR(128) NOT NULL,
  payload JSON NOT NULL,
  delivery_status ENUM('PENDING', 'DELIVERING', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  webhook_response TEXT NULL,
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pl_disbursal_webhook_request (unique_request_number),
  KEY idx_pl_disbursal_webhook_retry (delivery_status, updated_at)
);
