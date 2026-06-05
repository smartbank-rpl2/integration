import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PaymentApi } from '../../api/payment.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AmountInput } from '../../components/ui/AmountInput';
import { IdempotencyKeyField } from '../../components/ui/IdempotencyKeyField';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/feedback/ToastProvider';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { getErrorMessage } from '../../lib/errors';
import { Receipt, Check } from 'lucide-react';
import { formatMoney } from '../../lib/money';

export const PaymentRequestPage: React.FC = () => {
  const [sourceApp, setSourceApp] = useState('MARKETPLACE');
  const [payerWalletId, setPayerWalletId] = useState('');
  const [payeeWalletId, setPayeeWalletId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [idemKey, setIdemKey] = useState(generateIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<any>(null);
  
  const [payRequestId, setPayRequestId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payIdemKey, setPayIdemKey] = useState(generateIdempotencyKey());

  const { toast } = useToast();

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerWalletId || !payeeWalletId || !amountStr || !description) return;
    
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const res = await PaymentApi.createPaymentRequest(
        sourceApp,
        payerWalletId.trim(),
        payeeWalletId.trim(),
        amountStr,
        description.trim(),
        expiresAt,
        idemKey,
      );
      if (!res.ok) throw res;
      if (res.ok && res.envelope.data) {
        toast({ type: 'success', title: 'Request Created', message: `Requested ${formatMoney(amountStr)} from ${payerWalletId}` });
        setCreatedRequest(res.envelope.data);
        setPayerWalletId('');
        setPayeeWalletId('');
        setAmountStr('');
        setDescription('');
        setIdemKey(generateIdempotencyKey());
      }
    } catch (err) {
      toast({ type: 'error', title: 'Creation Failed', message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handlePayRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRequestId) return;
    
    setPayLoading(true);
    try {
      const res = await PaymentApi.payPaymentRequest(payRequestId, payIdemKey);
      if (!res.ok) throw res;
      if (res.ok) {
        toast({ type: 'success', title: 'Payment Successful', message: `Paid request ${payRequestId}` });
        setPayRequestId('');
        setPayIdemKey(generateIdempotencyKey());
      }
    } catch (err) {
      toast({ type: 'error', title: 'Payment Failed', message: getErrorMessage(err) });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader 
        title="Payment Requests" 
        description="Request CBDC from other wallets or pay pending requests."
      />

      <div className="financial-grid">
        
        <Card>
          <CardHeader>
            <CardTitle className="card-title-row">
              <span className="card-title-icon"><Receipt size={18} /></span>
              Create Request
            </CardTitle>
            <CardDescription>Create a pending programmable payment request without changing balances.</CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleCreateRequest} className="form-stack">
            <Select
              label="Source App"
              value={sourceApp}
              onChange={(e) => setSourceApp(e.target.value)}
              required
            >
              <option value="MARKETPLACE">Marketplace</option>
              <option value="POS">POS</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="LOGISTICS">Logistics</option>
            </Select>

            <Input 
              label="Payer Wallet ID"
              placeholder="Wallet that will pay"
              value={payerWalletId}
              onChange={(e) => setPayerWalletId(e.target.value)}
              required
            />

            <Input
              label="Payee Wallet ID"
              placeholder="Wallet that will receive gross amount"
              value={payeeWalletId}
              onChange={(e) => setPayeeWalletId(e.target.value)}
              required
            />
            
            <AmountInput 
              label="Amount to Request"
              value={amountStr}
              onChange={setAmountStr}
              required
            />

            <Input 
              label="Description"
              placeholder="e.g. Marketplace order checkout"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <IdempotencyKeyField value={idemKey} onChange={setIdemKey} />

            <Button 
              type="submit" 
              variant="primary" 
              isLoading={loading}
            >
              Request Funds
            </Button>
          </form>

          {createdRequest && (
            <div className="result-panel result-panel--success">
              <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>Request Created Successfully</div>
              <div className="mono-block">ID: {createdRequest.payment_request_id}</div>
              <div className="mono-block">Status: {createdRequest.status}</div>
              <div className="mono-block">Amount Due: {formatMoney(createdRequest.amount_due)}</div>
            </div>
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="card-title-row">
              <span className="card-title-icon"><Check size={18} /></span>
              Pay a Request
            </CardTitle>
            <CardDescription>Settlement is atomic, idempotent, and posted to the ledger.</CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handlePayRequest} className="form-stack">
            <Input 
              label="Payment Request ID"
              placeholder="e.g. pr_123456789"
              value={payRequestId}
              onChange={(e) => setPayRequestId(e.target.value)}
              required
            />
            
            <IdempotencyKeyField value={payIdemKey} onChange={setPayIdemKey} />

            <Button 
              type="submit" 
              variant="primary" 
              isLoading={payLoading}
            >
              Pay Now
            </Button>
          </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
