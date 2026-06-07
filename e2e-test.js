const GATEWAY_URL = 'http://localhost:4000';

const createClient = (token = null) => {
  return {
    post: async (path, body) => {
      const res = await fetch(`${GATEWAY_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_${Date.now()}_${Math.random()}`,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      return { status: res.status, data: await res.json() };
    },
    get: async (path) => {
      const res = await fetch(`${GATEWAY_URL}${path}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return { status: res.status, data: await res.json() };
    }
  };
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runE2ETests() {
  console.log('🚀 Starting End-to-End API Tests...\n');

  try {
    const ts = Date.now();
    const client = createClient();
    
    // 1. Setup Accounts
    console.log('--- Registering Users ---');
    const retailRes1 = await client.post('/api/wallet/v1/auth/register', { name: 'Retail1', email: `r1${ts}@test.com`, phone: `1${ts}`, password: 'password', pin: '123456', role: 'RETAIL_CUSTOMER' });
    const retailRes2 = await client.post('/api/wallet/v1/auth/register', { name: 'Retail2', email: `r2${ts}@test.com`, phone: `2${ts}`, password: 'password', pin: '123456', role: 'RETAIL_CUSTOMER' });
    const tellerRes = await client.post('/api/wallet/v1/auth/register', { name: 'Teller', email: `t${ts}@test.com`, phone: `3${ts}`, password: 'password', pin: '123456', role: 'TELLER' });
    const managerRes = await client.post('/api/wallet/v1/auth/register', { name: 'Manager', email: `m${ts}@test.com`, phone: `4${ts}`, password: 'password', pin: '123456', role: 'MANAGER' });

    if (retailRes1.status !== 201 || tellerRes.status !== 201 || managerRes.status !== 201) {
      console.log('Registration failed. Exiting.', retailRes1.data, tellerRes.data, managerRes.data);
      return;
    }

    console.log('✅ Users registered successfully');

    console.log('--- Logging in Users ---');
    const logR1 = await client.post('/api/wallet/v1/auth/login', { email: `r1${ts}@test.com`, password: 'password' });
    const logR2 = await client.post('/api/wallet/v1/auth/login', { email: `r2${ts}@test.com`, password: 'password' });
    const logT = await client.post('/api/wallet/v1/auth/login', { email: `t${ts}@test.com`, password: 'password' });
    const logM = await client.post('/api/wallet/v1/auth/login', { email: `m${ts}@test.com`, password: 'password' });

    if (logR1.status !== 200 || logT.status !== 200 || logM.status !== 200) {
      console.log('Login failed. Exiting.', logR1.data, logT.data, logM.data);
      return;
    }

    const t_r1 = logR1.data.data.accessToken;
    const t_r2 = logR2.data.data.accessToken;
    const t_teller = logT.data.data.accessToken;
    const t_manager = logM.data.data.accessToken;

    const u_r1 = logR1.data.data.user.id;
    const u_r2 = logR2.data.data.user.id;

    const r1Client = createClient(t_r1);
    const r2Client = createClient(t_r2);
    const tClient = createClient(t_teller);
    const mClient = createClient(t_manager);

    console.log('✅ Users logged in successfully');

    // 2. KYC Verification
    console.log('\n--- Teller verifies KYC ---');
    const kycRes = await tClient.post('/api/bank/teller/kyc/verify', { userId: u_r1 });
    console.log('KYC Verification:', kycRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(kycRes.data)}`);

    // 3. Teller Top-Up
    console.log('\n--- Teller Tops Up Retail1 ---');
    const topUpRes = await tClient.post('/api/bank/teller/top-up', { userId: u_r1, amount: '50000' });
    console.log('Top Up:', topUpRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(topUpRes.data)}`);

    await delay(1000);

    // 4. Retail1 Applies for Loan
    console.log('\n--- Retail1 Applies for Loan ---');
    const applyLoanRes = await r1Client.post('/api/bank/loans/apply', { amount: '10000' });
    console.log('Apply Loan:', applyLoanRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(applyLoanRes.data)}`);
    const loanId = applyLoanRes.data?.data?.loan_id || applyLoanRes.data?.loan_id || applyLoanRes.data?.data?.id;
    
    // 5. Manager Approves Loan
    if (loanId) {
      console.log(`\n--- Manager Approves Loan (${loanId}) ---`);
      const approveRes = await mClient.post('/api/bank/manager/loans/approve', { loanId });
      console.log('Approve Loan:', approveRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(approveRes.data)}`);
    } else {
      console.log('❌ Skipping loan approval: No loanId returned');
    }

    await delay(1000);

    // 6. Retail1 Transfers to Retail2
    console.log('\n--- Retail1 Transfers to Retail2 ---');
    const w2Id = logR2.data.data.user.walletId;

    if (w2Id) {
      const transferRes = await r1Client.post('/api/bank/transfers', {
        payeeWalletId: w2Id,
        amount: '1000',
        note: 'E2E Transfer'
      });
      console.log('Transfer:', transferRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(transferRes.data)}`);
    } else {
      console.log('❌ Skipping transfer: Could not get w2Id');
    }

    // 7. Manager Suspends Retail1
    console.log('\n--- Manager Suspends Retail1 ---');
    const suspendRes = await mClient.post('/api/bank/manager/users/suspend', { userId: u_r1 });
    console.log('Suspend User:', suspendRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(suspendRes.data)}`);

    // 8. Retail1 Transfers to Retail2 (Should Fail)
    console.log('\n--- Retail1 Attempts Transfer (Suspended) ---');
    if (w2Id) {
      const transferFailRes = await r1Client.post('/api/bank/transfers', {
        payeeWalletId: w2Id,
        amount: '1000',
        note: 'E2E Fail Transfer'
      });
      console.log('Transfer (Suspended):', transferFailRes.status !== 201 ? '✅ OK (Failed as expected)' : `❌ FAILED (Should have failed): ${JSON.stringify(transferFailRes.data)}`);
    }

    // 9. Manager Activates Retail1
    console.log('\n--- Manager Activates Retail1 ---');
    const activateRes = await mClient.post('/api/bank/manager/users/activate', { userId: u_r1 });
    console.log('Activate User:', activateRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(activateRes.data)}`);

    // 10. Teller Withdraws from Retail1
    console.log('\n--- Teller Withdraws from Retail1 ---');
    const withdrawRes = await tClient.post('/api/bank/teller/withdraw', { userId: u_r1, amount: '5000' });
    console.log('Withdraw:', withdrawRes.status === 201 ? '✅ OK' : `❌ FAILED: ${JSON.stringify(withdrawRes.data)}`);

    console.log('\n🎉 E2E Tests Complete!');
  } catch (error) {
    console.error('Test Execution Failed:', error.message);
  }
}

runE2ETests();
