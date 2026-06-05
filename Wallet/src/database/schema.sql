-- MySQL Database Schema for SmartBank Wallet Integration

-- 1. USERS TABLE (Integrated Schema)
-- If table doesn't exist, create it. Otherwise migrate.js will append missing fields.
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE NULL,
    password_hash VARCHAR(191) NOT NULL,
    pin_hash VARCHAR(191) NULL,
    kyc_tier VARCHAR(50) NOT NULL DEFAULT 'BASIC', -- BASIC, VERIFIED
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    role VARCHAR(50) NOT NULL DEFAULT 'RETAIL_CUSTOMER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. IDEMPOTENCY KEYS TABLE (Wallet specific)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    `key` VARCHAR(255) PRIMARY KEY,
    client_id CHAR(36) NOT NULL,
    response_code INT NOT NULL,
    response_body TEXT NOT NULL,
    hash_payload VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idem_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. WALLET ACCOUNTS CACHE (Read-only replica for high performance)
CREATE TABLE IF NOT EXISTS wallet_accounts_cache (
    wallet_id VARCHAR(100) PRIMARY KEY,
    user_id CHAR(36) NULL,
    available_balance BIGINT NOT NULL DEFAULT 0,
    hold_balance BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(20) DEFAULT 'CBDC_IDR',
    daily_limit_count INT DEFAULT 10,
    daily_transaction_count INT DEFAULT 0,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
