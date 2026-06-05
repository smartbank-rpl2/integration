import crypto from 'crypto';

async function testE2E() {
  console.log('🏁 Starting SmartBank E2E Microservice Integration Test...');

  const uniqueId = Math.random().toString(36).substring(2, 7);
  const name = `E2E User ${uniqueId}`;
  const email = `e2e_${uniqueId}@smartbank.test`;
  const phone = `0812${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = 'securepassword123';
  const pin = '123456';

  // 1. REGISTER
  console.log('\n--- 1. Testing User Registration ---');
  let registerRes;
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, pin })
    });
    registerRes = await res.json();
    console.log('Registration Response:', JSON.stringify(registerRes, null, 2));
    if (!res.ok) throw new Error('Registration failed');
  } catch (err) {
    console.error('❌ Registration test failed:', err.message);
    process.exit(1);
  }

  const { walletId } = registerRes.data;

  // 2. LOGIN
  console.log('\n--- 2. Testing User Login ---');
  let token;
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log('Login Response Status:', res.status);
    if (!res.ok) throw new Error('Login failed');
    token = data.data.accessToken;
  } catch (err) {
    console.error('❌ Login test failed:', err.message);
    process.exit(1);
  }

  // 3. GET BALANCE (INITIAL STATE)
  console.log('\n--- 3. Testing Initial Balance Check ---');
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/wallets/me/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceInfo = await res.json();
    console.log('Balance Info:', JSON.stringify(balanceInfo, null, 2));
    if (!res.ok || balanceInfo.data.available_balance !== 50000) {
      throw new Error(`Expected initial balance 50000, got ${balanceInfo.data?.available_balance}`);
    }
  } catch (err) {
    console.error('❌ Balance check test failed:', err.message);
    process.exit(1);
  }

  // 4. APPLY LOAN
  console.log('\n--- 4. Testing Loan Application (Kredit UMKM) ---');
  let loanId;
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/loans/apply', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `idem_loan_test_${uniqueId}`
      },
      body: JSON.stringify({ amount: 10000 }) // Apply for Rp 10.000
    });
    const data = await res.json();
    console.log('Loan Application Response:', JSON.stringify(data, null, 2));
    if (!res.ok) throw new Error('Loan application failed');
    loanId = data.data.loan.id;
  } catch (err) {
    console.error('❌ Loan test failed:', err.message);
    process.exit(1);
  }

  // 5. GET BALANCE AFTER LOAN (SHOULD BE 50.000 + 10.000 = 60.000)
  console.log('\n--- 5. Checking Balance after Loan Disbursement ---');
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/wallets/me/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const balanceInfo = await res.json();
    console.log('New Balance Info:', JSON.stringify(balanceInfo, null, 2));
    if (!res.ok || balanceInfo.data.available_balance !== 60000) {
      throw new Error(`Expected balance 60000, got ${balanceInfo.data?.available_balance}`);
    }
  } catch (err) {
    console.error('❌ Post-loan balance check test failed:', err.message);
    process.exit(1);
  }

  // 6. REPAY LOAN PARTIALLY (Rp 5.500)
  console.log('\n--- 6. Testing Loan Repayment ---');
  try {
    const res = await fetch(`http://127.0.0.1:6969/api/v1/loans/${loanId}/repay`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `idem_repay_test_${uniqueId}`
      },
      body: JSON.stringify({ amount: 5500 })
    });
    const data = await res.json();
    console.log('Loan Repayment Response:', JSON.stringify(data, null, 2));
    if (!res.ok) throw new Error('Loan repayment failed');
  } catch (err) {
    console.error('❌ Loan repayment test failed:', err.message);
    process.exit(1);
  }

  // 7. GENERATE TEST INVOICE AND PAY IT
  console.log('\n--- 7. Testing QR/Invoice Payment Flow ---');
  try {
    // Generate Invoice
    const invoiceRes = await fetch('http://127.0.0.1:6969/api/v1/wallets/me/invoice/generate-test', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const invoiceData = await invoiceRes.json();
    console.log('Generated Invoice:', JSON.stringify(invoiceData, null, 2));
    if (!invoiceRes.ok) throw new Error('Invoice generation failed');

    const paymentRequestId = invoiceData.data.invoice.id;

    // Pay Invoice
    const payRes = await fetch(`http://127.0.0.1:6969/api/v1/payment-requests/${paymentRequestId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `idem_pay_test_${uniqueId}`
      },
      body: JSON.stringify({ pin }) // Needs PIN validation
    });
    const payData = await payRes.json();
    console.log('Invoice Payment Response:', JSON.stringify(payData, null, 2));
    if (!payRes.ok) throw new Error('Invoice payment failed');
  } catch (err) {
    console.error('❌ QR Invoice Payment test failed:', err.message);
    process.exit(1);
  }

  // 8. VERIFY TRANSACTIONS HISTORY (MUTASI REKENING)
  console.log('\n--- 8. Testing Mutasi Rekening (Transaction History) ---');
  try {
    const res = await fetch('http://127.0.0.1:6969/api/v1/wallets/me/transactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const txsInfo = await res.json();
    console.log('Mutasi Rekening list count:', txsInfo.data.length);
    console.log('First 2 history entries:', JSON.stringify(txsInfo.data.slice(0, 2), null, 2));
    if (!res.ok) throw new Error('Failed to retrieve transactions');
  } catch (err) {
    console.error('❌ Transaction history test failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY! SmartBank E-Wallet and Central Bank Core are perfectly integrated as microservices.');
}

testE2E();
