import React, { useState } from 'react';
import { HandCoins, RotateCw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AmountInput } from '../../components/ui/AmountInput';
import { IdempotencyKeyField } from '../../components/ui/IdempotencyKeyField';
import { LoansApi } from '../../api/loans.api';
import { useToast } from '../../components/feedback/ToastProvider';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { getErrorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/money';

export const LoanPage: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [applyKey, setApplyKey] = useState(generateIdempotencyKey());
  const [applyLoading, setApplyLoading] = useState(false);
  const [lastLoanId, setLastLoanId] = useState('');

  const [loanId, setLoanId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayKey, setRepayKey] = useState(generateIdempotencyKey());
  const [repayLoading, setRepayLoading] = useState(false);
  const { toast } = useToast();

  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!amount) return;
    setApplyLoading(true);
    try {
      const res = await LoansApi.createLoan(amount, purpose.trim() || undefined, applyKey);
      if (!res.ok) throw res;
      const loan = res.envelope.data;
      toast({
        type: 'success',
        title: 'Loan Disbursed',
        message: loan ? `Loan ${formatMoney(loan.principal)} approved. Total due ${formatMoney(loan.total_due)}.` : 'Loan approved.',
      });
      if (loan?.loan_id) {
        setLastLoanId(loan.loan_id);
        setLoanId(loan.loan_id);
        setRepayAmount(loan.total_due);
      }
      setAmount('');
      setPurpose('');
      setApplyKey(generateIdempotencyKey());
    } catch (err) {
      toast({ type: 'error', title: 'Loan Failed', message: getErrorMessage(err) });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleRepay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loanId.trim() || !repayAmount) return;
    setRepayLoading(true);
    try {
      const res = await LoansApi.repayLoan(loanId.trim(), repayAmount, repayKey);
      if (!res.ok) throw res;
      toast({
        type: 'success',
        title: 'Repayment Settled',
        message: `Remaining due: ${formatMoney(res.envelope.data?.remaining_due ?? '0')}`,
      });
      setLoanId('');
      setRepayAmount('');
      setRepayKey(generateIdempotencyKey());
    } catch (err) {
      toast({ type: 'error', title: 'Repayment Failed', message: getErrorMessage(err) });
    } finally {
      setRepayLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Loans"
        description="Apply for simulated CBDC loans and repay them through Central Bank Core settlement."
      />

      <div className="financial-grid">
        <Card>
          <CardHeader>
            <CardTitle className="card-title-row">
              <span className="card-title-icon"><HandCoins size={18} /></span>
              Apply Loan
            </CardTitle>
            <CardDescription>Loan disbursement uses the loan pool and ledger settlement.</CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleApply} className="form-stack">
            <AmountInput label="Amount" value={amount} onChange={setAmount} required />
            <Input label="Purpose (Optional)" placeholder="e.g. UMKM working capital" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
            <IdempotencyKeyField value={applyKey} onChange={setApplyKey} />
            <Button type="submit" isLoading={applyLoading} leftIcon={<HandCoins size={18} />}>
              Apply and Disburse
            </Button>
          </form>

          {lastLoanId && (
            <div className="result-panel">
              <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>Latest Loan ID</div>
              <div className="mono-block">{lastLoanId}</div>
            </div>
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="card-title-row">
              <span className="card-title-icon"><RotateCw size={18} /></span>
              Repay Loan
            </CardTitle>
            <CardDescription>Repayment credits the loan pool and updates loan status.</CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleRepay} className="form-stack">
            <Input label="Loan ID" placeholder="Paste loan_id" value={loanId} onChange={(event) => setLoanId(event.target.value)} required />
            <AmountInput label="Repayment Amount" value={repayAmount} onChange={setRepayAmount} required />
            <IdempotencyKeyField value={repayKey} onChange={setRepayKey} />
            <Button type="submit" variant="outline" isLoading={repayLoading} leftIcon={<RotateCw size={18} />}>
              Repay Loan
            </Button>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
