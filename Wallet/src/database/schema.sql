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
    id CHAR(36) PRIMARY KEY,
    idempotency_key VARCHAR(191) NOT NULL,
    route VARCHAR(191) NOT NULL,
    actor_id VARCHAR(191) NULL,
    request_hash VARCHAR(128) NOT NULL,
    response_body JSON NULL,
    status ENUM('PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    locked_until DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY idempotency_keys_idempotency_key_route_actor_id_key (idempotency_key, route, actor_id)
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

-- 4. SUBSCRIPTIONS TABLE (Missing table fixed)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    service_code VARCHAR(100) NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
