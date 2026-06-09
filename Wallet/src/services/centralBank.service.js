import crypto from 'crypto';
import { config } from '../config/config.js';
import { CustomError } from '../utils/errors.js';

// Stateful Mock CentralBank Database (For Simulation Mode)
import { db } from '../config/database.js';

// Stateful Mock CentralBank Database (For Simulation Mode Fallback)
const cbState = {
  wallets: {
    "wal_system_reserve": {
      wallet_id: "wal_system_reserve",
      user_id: "system",
      available_balance: 980000000,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: 99999,
      last_transaction_at: null
    },
    "wal_seller_123": {
      wallet_id: "wal_seller_123",
      user_id: "merchant_dummy",
      name: "Toko Sembako UMKM",
      available_balance: 100000,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: 100,
      last_transaction_at: null
    }
  },
  transactions: [],
  loans: {},
  paymentRequests: {
    "payreq_dummy_1": {
      id: "payreq_dummy_1",
      source_app: "MARKETPLACE",
      payer_wallet_id: null,
      payee_wallet_id: "wal_seller_123",
      payee_name: "Toko Sembako UMKM",
      gross_amount: 5000,
      amount_due: 5175,
      status: "PENDING",
      description: "Pembelian Beras Super 1kg",
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    }
  }
};

export const centralBankService = {
  
  // 1. CREATE ACCOUNT / REGISTER USER
  createAccount: async (name, email, password) => {
    if (!config.centralBank.mock) {
      const idempotencyKey = `cb_reg_${email.replace(/[@.]/g, '_')}`;
      const response = await fetch(`${config.centralBank.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Request-Id': `reg_${crypto.randomUUID()}`
        },
        body: JSON.stringify({ name, email, password })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'BAD_REQUEST', 
          errBody.error?.message || 'Registrasi gagal di Central Bank Core',
          response.status
        );
      }
      const envelope = await response.json();
      const data = envelope.data;
      return {
        user_id: data.user_id,
        wallet_id: data.wallet_id,
        initial_balance: data.initial_distribution?.initial_balance || 50000
      };
    }

    // Simulation Engine Mock:
    const walletId = `wal_${crypto.randomBytes(6).toString('hex')}`;
    const initialBalance = 50000;
    const userId = `usr_${crypto.randomUUID()}`;

    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < initialBalance) {
      throw new CustomError('INSUFFICIENT_BALANCE', 'Cadangan Bank Sentral tidak mencukupi untuk distribusi awal', 400);
    }

    reserve.available_balance -= initialBalance;
    cbState.wallets[walletId] = {
      wallet_id: walletId,
      user_id: userId,
      name: name,
      available_balance: initialBalance,
      hold_balance: 0,
      daily_transaction_count: 0,
      daily_limit_count: config.cbdc.dailyLimitCount,
      last_transaction_at: null
    };

    const txId = `trx_dist_${crypto.randomBytes(8).toString('hex')}`;
    cbState.transactions.push({
      id: txId,
      transaction_type: 'STIMULUS',
      status: 'SETTLED',
      source_app: 'CENTRAL_BANK',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: initialBalance,
      total_debit: initialBalance,
      fee_total: 0,
      tax_total: 0,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    });

    console.log(`🏦 [CB SIMULATION] Wallet ${walletId} berhasil dibuat untuk user ${name} dengan saldo awal 50.000`);
    return { user_id: userId, wallet_id: walletId, initial_balance: initialBalance };
  },

  // 2. GET BALANCE
  getBalance: async (walletId, token) => {
    if (!config.centralBank.mock) {
      const response = await fetch(`${config.centralBank.url}/api/v1/wallets/me/balance`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Service-Name': 'WalletApp' 
        }
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'UNAUTHORIZED',
          errBody.error?.message || 'Gagal mengambil saldo dari Central Bank',
          response.status
        );
      }
      const envelope = await response.json();
      const data = envelope.data;
      
      // Sync read-model cache async
      await db.query(
        "UPDATE wallet_accounts_cache SET available_balance = $1 WHERE wallet_id = $2",
        [data.available_balance, data.wallet_id]
      ).catch(e => console.warn('Cache sync warning:', e.message));

      return {
        wallet_id: data.wallet_id,
        currency: data.currency || 'CBDC_IDR',
        available_balance: parseInt(data.available_balance, 10),
        hold_balance: parseInt(data.hold_balance, 10)
      };
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) {
      throw new CustomError('NOT_FOUND', 'Wallet akun tidak ditemukan di CentralBank Core', 404);
    }

    return {
      wallet_id: wallet.wallet_id,
      currency: 'CBDC_IDR',
      available_balance: wallet.available_balance,
      hold_balance: wallet.hold_balance,
      daily_transaction_count: wallet.daily_transaction_count,
      daily_limit_count: wallet.daily_limit_count,
      last_transaction_at: wallet.last_transaction_at
    };
  },

  // 3. GET TRANSACTIONS
  getTransactions: async (walletId, token) => {
    if (!config.centralBank.mock) {
      const response = await fetch(`${config.centralBank.url}/api/v1/wallets/me/transactions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Service-Name': 'WalletApp' 
        }
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'UNAUTHORIZED',
          errBody.error?.message || 'Gagal mengambil mutasi dari Central Bank',
          response.status
        );
      }
      const envelope = await response.json();
      const txs = envelope.data;

      // Query database user names in parallel to resolve other party name
      const usersResult = await db.query(
        `SELECT wa.id as wallet_id, u.name 
         FROM wallet_accounts wa
         JOIN users u ON wa.user_id = u.id`
      );
      const users = usersResult.rows;
      const nameMap = {};
      if (Array.isArray(users)) {
        for (const u of users) {
          nameMap[u.wallet_id] = u.name;
        }
      }

      return txs.map(t => {
        const otherWalletId = t.direction === 'OUT' ? t.payee_wallet_id : t.payer_wallet_id;
        const rawName = nameMap[otherWalletId] || (t.direction === 'OUT' ? 'Penerima' : 'Pengirim');
        return {
          id: t.transaction_id,
          transaction_type: t.transaction_type,
          status: t.status,
          gross_amount: parseInt(t.gross_amount, 10),
          total_debit: parseInt(t.total_debit, 10),
          fee_total: parseInt(t.fee_total, 10),
          tax_total: parseInt(t.tax_total, 10),
          created_at: t.created_at,
          settled_at: t.settled_at,
          direction: t.direction,
          other_party: maskName(rawName)
        };
      });
    }

    // Simulation Engine Mock:
    const myTxs = cbState.transactions.filter(
      tx => tx.payer_wallet_id === walletId || tx.payee_wallet_id === walletId
    );
    
    return myTxs.map(tx => {
      let otherParty = 'System';
      if (tx.payer_wallet_id === walletId) {
        const receiver = cbState.wallets[tx.payee_wallet_id];
        otherParty = receiver ? maskName(receiver.name || 'Merchant') : 'Penerima';
      } else {
        const sender = cbState.wallets[tx.payer_wallet_id];
        otherParty = sender ? maskName(sender.name || 'User') : 'Pengirim';
      }

      return {
        id: tx.id,
        transaction_type: tx.transaction_type,
        status: tx.status,
        gross_amount: tx.gross_amount,
        total_debit: tx.total_debit,
        fee_total: tx.fee_total,
        tax_total: tx.tax_total,
        created_at: tx.created_at,
        settled_at: tx.settled_at,
        direction: tx.payer_wallet_id === walletId ? 'OUT' : 'IN',
        other_party: otherParty
      };
    });
  },

  // 4. TRANSFER P2P
  transfer: async (fromWalletId, toWalletId, amount, note = '', idempotencyKey, token) => {
    if (!config.centralBank.mock) {
      const response = await fetch(`${config.centralBank.url}/api/v1/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey || `idem_tx_${crypto.randomUUID()}`,
          'X-Request-Id': `req_tx_${crypto.randomUUID()}`
        },
        body: JSON.stringify({
          to_wallet_id: toWalletId,
          amount: amount.toString(),
          note
        })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'BAD_REQUEST',
          errBody.error?.message || 'Transfer ditolak oleh Central Bank',
          response.status
        );
      }
      const envelope = await response.json();
      const data = envelope.data;
      return {
        id: data.transaction_id,
        transaction_type: 'TRANSFER',
        status: data.status,
        gross_amount: parseInt(data.amount, 10),
        total_debit: parseInt(data.total_debit, 10),
        fee_total: parseInt(data.fee_total, 10),
        tax_total: parseInt(data.tax_total, 10),
        note,
        created_at: new Date().toISOString()
      };
    }

    // Simulation Engine Mock:
    const payer = cbState.wallets[fromWalletId];
    const payee = cbState.wallets[toWalletId];

    if (!payer) throw new CustomError('NOT_FOUND', 'Payer wallet tidak terdaftar di CentralBank', 404);
    if (!payee) throw new CustomError('NOT_FOUND', 'Payee wallet tidak terdaftar di CentralBank', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal transfer harus lebih besar dari 0', 400);

    const now = Date.now();
    if (payer.last_transaction_at) {
      const secondsSinceLast = Math.floor((now - new Date(payer.last_transaction_at).getTime()) / 1000);
      if (secondsSinceLast < config.cbdc.cooldownSeconds) {
        throw new CustomError('COOLDOWN_ACTIVE', `Jeda cooldown aktif. Tunggu ${config.cbdc.cooldownSeconds - secondsSinceLast} detik sebelum transfer kembali.`, 429);
      }
    }

    if (payer.daily_transaction_count >= payer.daily_limit_count) {
      throw new CustomError('DAILY_LIMIT_EXCEEDED', `Batas transaksi harian terlampaui (${payer.daily_limit_count} kali per hari)`, 429);
    }

    const bankFee = Math.floor((amount * 100) / 10000);
    const gatewayFee = Math.floor((amount * 50) / 10000);
    const tax = Math.floor((amount * 200) / 10000);
    const feeTotal = bankFee + gatewayFee;
    const totalDebit = amount + feeTotal + tax;

    if (payer.available_balance < totalDebit) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo CBDC tidak mencukupi. Dibutuhkan: ${totalDebit}`, 400);
    }

    payer.available_balance -= totalDebit;
    payee.available_balance += amount;
    cbState.wallets["wal_system_reserve"].available_balance += (feeTotal + tax);

    payer.last_transaction_at = new Date().toISOString();
    payer.daily_transaction_count += 1;

    const tx = {
      id: `trx_p2p_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'TRANSFER',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: fromWalletId,
      payee_wallet_id: toWalletId,
      gross_amount: amount,
      total_debit: totalDebit,
      fee_total: feeTotal,
      tax_total: tax,
      note,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
      fees: { bank_fee: bankFee, gateway_fee: gatewayFee, tax }
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 5. PAY PAYMENT REQUEST / QR / INVOICE
  payPaymentRequest: async (paymentRequestId, payerWalletId, token) => {
    if (!config.centralBank.mock) {
      const idempotencyKey = `idem_pay_${paymentRequestId}`;
      const response = await fetch(`${config.centralBank.url}/api/v1/payment-requests/${paymentRequestId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
          'X-Request-Id': `req_pay_${crypto.randomUUID()}`
        }
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'BAD_REQUEST',
          errBody.error?.message || 'Pembayaran QR ditolak oleh Central Bank',
          response.status
        );
      }
      const envelope = await response.json();
      const data = envelope.data;
      return {
        id: data.transaction_id,
        transaction_type: 'PAYMENT',
        status: data.status || 'SETTLED',
        created_at: new Date().toISOString()
      };
    }

    // Simulation Engine Mock:
    const payreq = cbState.paymentRequests[paymentRequestId];
    if (!payreq) throw new CustomError('NOT_FOUND', 'Payment Request/Invoice tidak ditemukan', 404);
    if (payreq.status !== 'PENDING') throw new CustomError('BAD_REQUEST', `Payment Request sudah berstatus: ${payreq.status}`, 400);

    const now = new Date();
    if (now > new Date(payreq.expires_at)) {
      payreq.status = 'EXPIRED';
      throw new CustomError('BAD_REQUEST', 'Invoice/Payment Request telah kedaluwarsa', 400);
    }

    const payer = cbState.wallets[payerWalletId];
    if (!payer) throw new CustomError('NOT_FOUND', 'Payer wallet tidak ditemukan', 404);

    const amountDue = payreq.amount_due;
    if (payer.available_balance < amountDue) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo tidak mencukupi untuk membayar tagihan. Dibutuhkan: ${amountDue}`, 400);
    }

    const payee = cbState.wallets[payreq.payee_wallet_id];
    if (!payee) throw new CustomError('NOT_FOUND', 'Merchant/Penerima tidak ditemukan', 404);

    payer.available_balance -= amountDue;
    payee.available_balance += payreq.gross_amount;
    
    const feeTaxTotal = amountDue - payreq.gross_amount;
    cbState.wallets["wal_system_reserve"].available_balance += feeTaxTotal;

    payreq.payer_wallet_id = payerWalletId;
    payreq.status = 'PAID';

    const tx = {
      id: `trx_pay_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'PAYMENT',
      status: 'SETTLED',
      source_app: payreq.source_app,
      payer_wallet_id: payerWalletId,
      payee_wallet_id: payreq.payee_wallet_id,
      gross_amount: payreq.gross_amount,
      total_debit: amountDue,
      fee_total: Math.floor(payreq.gross_amount * 0.015),
      tax_total: Math.floor(payreq.gross_amount * 0.02),
      note: payreq.description,
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 6. APPLY LOAN
  applyLoan: async (walletId, amount, token) => {
    if (!config.centralBank.mock) {
      const idempotencyKey = `idem_loan_${crypto.randomUUID()}`;
      const response = await fetch(`${config.centralBank.url}/api/v1/loans/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
          'X-Request-Id': `req_loan_${crypto.randomUUID()}`
        },
        body: JSON.stringify({ amount: amount.toString() })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'BAD_REQUEST',
          errBody.error?.message || 'Pengajuan pinjaman ditolak oleh Central Bank',
          response.status
        );
      }
      const envelope = await response.json();
      const data = envelope.data;
      return {
        id: data.loan_id,
        borrower_wallet_id: walletId,
        principal: parseInt(data.principal, 10),
        interest_amount: parseInt(data.interest_amount, 10),
        total_due: parseInt(data.total_due, 10),
        paid_amount: 0,
        status: data.status,
        created_at: new Date().toISOString()
      };
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    if (amount <= 0 || amount > 100000) {
      throw new CustomError('BAD_REQUEST', 'Limit maksimal pengajuan pinjaman UMKM adalah 100.000', 400);
    }

    const outstanding = Object.values(cbState.loans)
      .filter(l => l.borrower_wallet_id === walletId && l.status !== 'PAID')
      .reduce((sum, l) => sum + (l.total_due - l.paid_amount), 0);

    if (outstanding + amount > 100000) {
      throw new CustomError('DAILY_LIMIT_EXCEEDED', `Batas total pinjaman aktif terlampaui.`, 400);
    }

    const interest = Math.floor(amount * 0.10);
    const totalDue = amount + interest;

    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < amount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral sedang tidak memadai', 400);
    }

    reserve.available_balance -= amount;
    wallet.available_balance += amount;

    const loanId = `loan_${crypto.randomBytes(6).toString('hex')}`;
    const loan = {
      id: loanId,
      borrower_wallet_id: walletId,
      principal: amount,
      interest_amount: interest,
      total_due: totalDue,
      paid_amount: 0,
      status: 'DISBURSED',
      created_at: new Date().toISOString(),
      disbursed_at: new Date().toISOString()
    };
    cbState.loans[loanId] = loan;
    return loan;
  },

  // 7. REPAY LOAN
  repayLoan: async (loanId, walletId, amount, token) => {
    if (!config.centralBank.mock) {
      const idempotencyKey = `idem_repay_${loanId}_${crypto.randomUUID()}`;
      const response = await fetch(`${config.centralBank.url}/api/v1/loans/${loanId}/repay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
          'X-Request-Id': `req_repay_${crypto.randomUUID()}`
        },
        body: JSON.stringify({ amount: amount.toString() })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new CustomError(
          errBody.error?.code || 'BAD_REQUEST',
          errBody.error?.message || 'Pembayaran cicilan pinjaman ditolak',
          response.status
        );
      }
      
      // Query database to retrieve the latest state
      const loanResult = await db.query("SELECT principal, total_due, paid_amount, status FROM loans WHERE id = $1", [loanId]);
      const loanRows = loanResult.rows;
      if (loanRows && loanRows.length > 0) {
        const loan = loanRows[0];
        return {
          loan_id: loanId,
          principal: parseInt(loan.principal, 10),
          total_due: parseInt(loan.total_due, 10),
          paid_amount: parseInt(loan.paid_amount, 10),
          remaining_due: parseInt(loan.total_due, 10) - parseInt(loan.paid_amount, 10),
          status: loan.status
        };
      }

      const envelope = await response.json();
      const data = envelope.data;
      return {
        loan_id: loanId,
        status: data.status,
        remaining_due: parseInt(data.remaining_due, 10)
      };
    }

    // Simulation Engine Mock:
    const loan = cbState.loans[loanId];
    if (!loan) throw new CustomError('NOT_FOUND', 'Data pinjaman tidak ditemukan', 404);
    if (loan.borrower_wallet_id !== walletId) throw new CustomError('UNAUTHORIZED', 'Pinjaman ini bukan milik wallet Anda', 401);
    if (loan.status === 'PAID') throw new CustomError('BAD_REQUEST', 'Pinjaman ini sudah lunas sepenuhnya', 400);

    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    const remaining = loan.total_due - loan.paid_amount;
    if (amount <= 0 || amount > remaining) {
      throw new CustomError('BAD_REQUEST', `Jumlah pembayaran tidak valid. Sisa tagihan: ${remaining}`, 400);
    }

    if (wallet.available_balance < amount) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo tidak mencukupi untuk melunasi pinjaman.`, 400);
    }

    wallet.available_balance -= amount;
    cbState.wallets["wal_system_reserve"].available_balance += amount;

    loan.paid_amount += amount;
    if (loan.paid_amount >= loan.total_due) {
      loan.status = 'PAID';
    } else {
      loan.status = 'PARTIAL_PAID';
    }

    return {
      loan_id: loan.id,
      principal: loan.principal,
      total_due: loan.total_due,
      paid_amount: loan.paid_amount,
      remaining_due: loan.total_due - loan.paid_amount,
      status: loan.status
    };
  },

  // Helper for generating dynamic mock payment requests on request for testing
  generateTestInvoice: async (payerWalletId, token) => {
    if (!config.centralBank.mock) {
      // 1. Find a payee wallet ID from the database
      let payeeId = 'FEE_MARKETPLACE';
      const merchantResult = await db.query(
        "SELECT id FROM wallet_accounts WHERE account_type = 'MERCHANT_WALLET' LIMIT 1"
      );
      const merchantRow = merchantResult.rows;
      if (merchantRow && merchantRow.length > 0) {
        payeeId = merchantRow[0].id;
      } else {
        const feeResult = await db.query(
          "SELECT id FROM wallet_accounts WHERE account_code = 'FEE_MARKETPLACE' LIMIT 1"
        );
        const feeRow = feeResult.rows;
        if (feeRow && feeRow.length > 0) {
          payeeId = feeRow[0].id;
        }
      }

      // 2. Call Central Bank POST /api/v1/payment-requests
      const idempotencyKey = `idem_payreq_${crypto.randomUUID()}`;
      const response = await fetch(`${config.centralBank.url}/api/v1/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
          'X-Request-Id': `req_payreq_${crypto.randomUUID()}`
        },
        body: JSON.stringify({
          source_app: 'MARKETPLACE',
          payer_wallet_id: payerWalletId,
          payee_wallet_id: payeeId,
          gross_amount: '10000',
          description: 'Invoice QR Code - Pembayaran Kopi & Roti Bakar',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error?.message || 'Gagal membuat invoice di Central Bank');
      }

      const envelope = await response.json();
      const result = envelope.data;
      return {
        id: result.payment_request_id,
        source_app: 'MARKETPLACE',
        payer_wallet_id: payerWalletId,
        payee_wallet_id: payeeId,
        payee_name: 'Merchant Partner',
        gross_amount: 10000,
        amount_due: parseInt(result.amount_due, 10),
        status: 'PENDING',
        description: 'Invoice QR Code - Pembayaran Kopi & Roti Bakar',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };
    }

    const payreqId = `payreq_${crypto.randomBytes(4).toString('hex')}`;
    const newInvoice = {
      id: payreqId,
      source_app: 'MARKETPLACE',
      payer_wallet_id: payerWalletId,
      payee_wallet_id: 'wal_seller_123',
      payee_name: 'Toko Sembako UMKM',
      gross_amount: 10000,
      amount_due: 10350,
      status: 'PENDING',
      description: 'Invoice QR Code POS - Kopi & Roti Bakar',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };
    cbState.paymentRequests[payreqId] = newInvoice;
    return newInvoice;
  },

  // 8. SIMULATED TOP UP (FUNDS ADDED FROM CASH/BANK)
  topUp: async (walletId, amount) => {
    if (!config.centralBank.mock) {
      throw new CustomError(
        'FORBIDDEN',
        'Top-up produksi wajib diproses Teller melalui endpoint Central Bank /api/v1/teller/top-up',
        403
      );
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal top up harus lebih besar dari 0', 400);

    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < amount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral tidak memadai', 400);
    }

    reserve.available_balance -= amount;
    wallet.available_balance += amount;

    const tx = {
      id: `trx_topup_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'TOPUP',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      note: 'Top Up Saldo Simulatif',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 9. SIMULATED WITHDRAWAL (CASH OUT)
  withdraw: async (walletId, amount, token) => {
    if (!config.centralBank.mock) {
      // Look up CENTRAL_RESERVE wallet ID from DB
      const reservesResult = await db.query("SELECT id FROM wallet_accounts WHERE account_code = 'CENTRAL_RESERVE' LIMIT 1");
      const reserves = reservesResult.rows;
      if (!reserves || reserves.length === 0) throw new CustomError('NOT_FOUND', 'Central Reserve tidak ditemukan', 404);
      const reserveId = reserves[0].id;

      // Call real transfer endpoint to send cash out amount to Central Reserve
      return await centralBankService.transfer(
        walletId,
        reserveId,
        amount,
        'Tarik Tunai Simulatif',
        `idem_wd_${crypto.randomUUID()}`,
        token
      );
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);
    if (amount <= 0) throw new CustomError('BAD_REQUEST', 'Nominal tarik tunai harus lebih besar dari 0', 400);
    if (wallet.available_balance < amount) {
      throw new CustomError('INSUFFICIENT_BALANCE', 'Saldo tidak mencukupi untuk melakukan tarik tunai', 400);
    }

    wallet.available_balance -= amount;
    cbState.wallets["wal_system_reserve"].available_balance += amount;

    const tx = {
      id: `trx_wd_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'WITHDRAWAL',
      status: 'SETTLED',
      source_app: 'SMARTBANK_WALLET',
      payer_wallet_id: walletId,
      payee_wallet_id: 'wal_system_reserve',
      gross_amount: amount,
      total_debit: amount,
      fee_total: 0,
      tax_total: 0,
      note: 'Tarik Tunai Simulatif',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 10. STIMULUS CLAIM (5.000)
  claimStimulus: async (walletId) => {
    if (!config.centralBank.mock) {
      throw new CustomError(
        'FORBIDDEN',
        'Stimulus produksi harus diproses oleh kebijakan moneter Central Bank Core',
        403
      );
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    const lastClaim = cbState.transactions
      .filter(t => t.payee_wallet_id === walletId && t.transaction_type === 'STIMULUS')
      .pop();
    
    if (lastClaim) {
      const secondsSince = Math.floor((Date.now() - new Date(lastClaim.created_at).getTime()) / 1000);
      if (secondsSince < 15) {
        throw new CustomError('COOLDOWN_ACTIVE', `Anda baru saja mengklaim stimulus. Tunggu ${15 - secondsSince} detik lagi untuk mengklaim kembali.`, 429);
      }
    }

    const stimulusAmount = 5000;
    const reserve = cbState.wallets["wal_system_reserve"];
    if (reserve.available_balance < stimulusAmount) {
      throw new CustomError('BAD_REQUEST', 'Cadangan dana Bank Sentral sedang tidak memadai', 400);
    }

    reserve.available_balance -= stimulusAmount;
    wallet.available_balance += stimulusAmount;

    const tx = {
      id: `trx_stim_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'STIMULUS',
      status: 'SETTLED',
      source_app: 'CENTRAL_BANK',
      payer_wallet_id: 'wal_system_reserve',
      payee_wallet_id: walletId,
      gross_amount: stimulusAmount,
      total_debit: stimulusAmount,
      fee_total: 0,
      tax_total: 0,
      note: 'Klaim Stimulus Mingguan',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  },

  // 11. SUBSCRIBE INSIGHT (10.000)
  subscribeInsight: async (walletId, token) => {
    if (!config.centralBank.mock) {
      // Look up CENTRAL_RESERVE wallet ID from DB
      const reservesResult = await db.query("SELECT id FROM wallet_accounts WHERE account_code = 'CENTRAL_RESERVE' LIMIT 1");
      const reserves = reservesResult.rows;
      if (!reserves || reserves.length === 0) throw new CustomError('NOT_FOUND', 'Central Reserve tidak ditemukan', 404);
      const reserveId = reserves[0].id;

      // Call transfer endpoint to send subscription fee to Central Reserve
      return await centralBankService.transfer(
        walletId,
        reserveId,
        10000,
        'Berlangganan Premium UMKM Insight',
        `idem_sub_${crypto.randomUUID()}`,
        token
      );
    }

    // Simulation Engine Mock:
    const wallet = cbState.wallets[walletId];
    if (!wallet) throw new CustomError('NOT_FOUND', 'Wallet tidak ditemukan', 404);

    const subscriptionAmount = 10000;
    if (wallet.available_balance < subscriptionAmount) {
      throw new CustomError('INSUFFICIENT_BALANCE', `Saldo tidak mencukupi untuk berlangganan UMKM Insight. Saldo Anda: ${wallet.available_balance}. Diperlukan: ${subscriptionAmount}`, 400);
    }

    wallet.available_balance -= subscriptionAmount;
    cbState.wallets["wal_system_reserve"].available_balance += subscriptionAmount;

    const tx = {
      id: `trx_sub_${crypto.randomBytes(8).toString('hex')}`,
      transaction_type: 'FEE',
      status: 'SETTLED',
      source_app: 'UMKM_INSIGHT',
      payer_wallet_id: walletId,
      payee_wallet_id: 'wal_system_reserve',
      gross_amount: subscriptionAmount,
      total_debit: subscriptionAmount,
      fee_total: 0,
      tax_total: 0,
      note: 'Berlangganan Premium UMKM Insight',
      created_at: new Date().toISOString(),
      settled_at: new Date().toISOString()
    };
    cbState.transactions.push(tx);
    return tx;
  }
};

// Privacy Masking Helper: "Yonaldi Ernanda" -> "Yo**** Er*****" or "Ugi S." -> "Ug* S."
function maskName(name) {
  if (!name) return '***';
  const parts = name.split(' ');
  const maskedParts = parts.map(part => {
    if (part.length <= 2) return part;
    return part.substring(0, 2) + '*'.repeat(part.length - 2);
  });
  return maskedParts.join(' ');
}
