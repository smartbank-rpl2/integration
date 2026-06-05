CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `role` ENUM('WALLET_USER','MERCHANT','CENTRAL_BANK_ADMIN','AUDITOR','SYSTEM_SERVICE') NOT NULL DEFAULT 'WALLET_USER',
  `kyc_tier` ENUM('BASIC','VERIFIED') NOT NULL DEFAULT 'BASIC',
  `status` ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `wallet_accounts` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL,
  `account_code` VARCHAR(64) NULL,
  `account_type` ENUM('CENTRAL_RESERVE','ISSUANCE_ACCOUNT','USER_WALLET','MERCHANT_WALLET','FEE_BANK','FEE_GATEWAY','FEE_MARKETPLACE','FEE_POS','FEE_SUPPLIER','FEE_LOGISTICS','TAX_SINK','LOAN_POOL_ACCOUNT','BURN_OR_SINK_ACCOUNT','CLEARING_ACCOUNT') NOT NULL,
  `currency` VARCHAR(16) NOT NULL DEFAULT 'CBDC_IDR',
  `available_balance` BIGINT NOT NULL DEFAULT 0,
  `hold_balance` BIGINT NOT NULL DEFAULT 0,
  `status` ENUM('ACTIVE','FROZEN','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `wallet_accounts_account_code_key` (`account_code`),
  INDEX `wallet_accounts_user_id_idx` (`user_id`),
  INDEX `wallet_accounts_account_code_idx` (`account_code`),
  CONSTRAINT `wallet_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `monetary_policy_events` (
  `id` CHAR(36) NOT NULL,
  `event_type` ENUM('INITIAL_SUPPLY','INITIAL_DISTRIBUTION','LOAN_POOL_FUNDING','STIMULUS','ISSUANCE','BURN','RESERVE_ADJUSTMENT') NOT NULL,
  `amount` BIGINT NOT NULL,
  `reason` VARCHAR(512) NOT NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `transactions` (
  `id` CHAR(36) NOT NULL,
  `transaction_type` ENUM('LOAN_POOL_FUNDING','INITIAL_DISTRIBUTION','TRANSFER','PAYMENT','LOAN_DISBURSEMENT','LOAN_REPAYMENT','REVERSAL') NOT NULL,
  `status` ENUM('CREATED','VALIDATED','AUTHORIZED','SETTLED','FAILED','REVERSED') NOT NULL,
  `source_app` VARCHAR(64) NOT NULL,
  `payer_wallet_id` CHAR(36) NULL,
  `payee_wallet_id` CHAR(36) NULL,
  `gross_amount` BIGINT NOT NULL,
  `total_debit` BIGINT NOT NULL,
  `fee_total` BIGINT NOT NULL DEFAULT 0,
  `tax_total` BIGINT NOT NULL DEFAULT 0,
  `idempotency_key` VARCHAR(191) NULL,
  `original_transaction_id` CHAR(36) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `settled_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `transactions_idempotency_key_idx` (`idempotency_key`),
  INDEX `transactions_payer_wallet_id_idx` (`payer_wallet_id`),
  INDEX `transactions_payee_wallet_id_idx` (`payee_wallet_id`),
  INDEX `transactions_created_at_idx` (`created_at`),
  CONSTRAINT `transactions_payer_wallet_id_fkey` FOREIGN KEY (`payer_wallet_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_payee_wallet_id_fkey` FOREIGN KEY (`payee_wallet_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_original_transaction_id_fkey` FOREIGN KEY (`original_transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `ledger_entries` (
  `id` CHAR(36) NOT NULL,
  `transaction_id` CHAR(36) NOT NULL,
  `entry_no` INTEGER NOT NULL,
  `account_id` CHAR(36) NOT NULL,
  `direction` ENUM('DEBIT','CREDIT') NOT NULL,
  `amount` BIGINT NOT NULL,
  `currency` VARCHAR(16) NOT NULL DEFAULT 'CBDC_IDR',
  `balance_after` BIGINT NULL,
  `description` VARCHAR(512) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ledger_entries_transaction_id_entry_no_key` (`transaction_id`, `entry_no`),
  INDEX `ledger_entries_transaction_id_idx` (`transaction_id`),
  INDEX `ledger_entries_account_id_idx` (`account_id`),
  INDEX `ledger_entries_created_at_idx` (`created_at`),
  CONSTRAINT `ledger_entries_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `payment_requests` (
  `id` CHAR(36) NOT NULL,
  `source_app` VARCHAR(64) NOT NULL,
  `payer_wallet_id` CHAR(36) NOT NULL,
  `payee_wallet_id` CHAR(36) NOT NULL,
  `gross_amount` BIGINT NOT NULL,
  `amount_due` BIGINT NOT NULL,
  `status` ENUM('PENDING','EXPIRED','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `description` VARCHAR(512) NOT NULL,
  `metadata` JSON NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `paid_transaction_id` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `payment_requests_paid_transaction_id_key` (`paid_transaction_id`),
  INDEX `payment_requests_payer_wallet_id_idx` (`payer_wallet_id`),
  INDEX `payment_requests_payee_wallet_id_idx` (`payee_wallet_id`),
  INDEX `payment_requests_status_idx` (`status`),
  CONSTRAINT `payment_requests_payer_wallet_id_fkey` FOREIGN KEY (`payer_wallet_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_requests_payee_wallet_id_fkey` FOREIGN KEY (`payee_wallet_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payment_requests_paid_transaction_id_fkey` FOREIGN KEY (`paid_transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `fee_rules` (
  `id` CHAR(36) NOT NULL,
  `source_app` VARCHAR(64) NOT NULL,
  `fee_type` ENUM('BANK','GATEWAY','MARKETPLACE','POS','SUPPLIER','LOGISTICS','TAX') NOT NULL,
  `bps` INTEGER NULL,
  `flat_amount` BIGINT NULL,
  `destination_account_id` CHAR(36) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  INDEX `fee_rules_source_app_active_idx` (`source_app`, `active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `loans` (
  `id` CHAR(36) NOT NULL,
  `borrower_wallet_id` CHAR(36) NOT NULL,
  `principal` BIGINT NOT NULL,
  `interest_amount` BIGINT NOT NULL,
  `total_due` BIGINT NOT NULL,
  `paid_amount` BIGINT NOT NULL DEFAULT 0,
  `status` ENUM('DISBURSED','PARTIAL_PAID','PAID','DEFAULTED','REJECTED') NOT NULL DEFAULT 'DISBURSED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `disbursed_at` DATETIME(3) NULL,
  `due_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `loans_borrower_wallet_id_idx` (`borrower_wallet_id`),
  CONSTRAINT `loans_borrower_wallet_id_fkey` FOREIGN KEY (`borrower_wallet_id`) REFERENCES `wallet_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL,
  `actor_user_id` CHAR(36) NULL,
  `service_name` VARCHAR(64) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `target_type` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(191) NOT NULL,
  `request_id` VARCHAR(191) NOT NULL,
  `reason_code` VARCHAR(128) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_target_type_target_id_idx` (`target_type`, `target_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `idempotency_keys` (
  `id` CHAR(36) NOT NULL,
  `idempotency_key` VARCHAR(191) NOT NULL,
  `route` VARCHAR(191) NOT NULL,
  `actor_id` VARCHAR(191) NULL,
  `request_hash` VARCHAR(128) NOT NULL,
  `response_body` JSON NULL,
  `status` ENUM('PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'PROCESSING',
  `locked_until` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idempotency_keys_idempotency_key_route_actor_id_key` (`idempotency_key`, `route`, `actor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
