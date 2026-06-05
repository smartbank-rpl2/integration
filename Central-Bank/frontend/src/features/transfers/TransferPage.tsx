import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { TransferApi } from '../../api/transfer.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AmountInput } from '../../components/ui/AmountInput';
import { IdempotencyKeyField } from '../../components/ui/IdempotencyKeyField';
import { useToast } from '../../components/feedback/ToastProvider';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { getErrorMessage } from '../../lib/errors';
import { Send } from 'lucide-react';
import { formatMoney } from '../../lib/money';

export const TransferPage: React.FC = () => {
  const [toWalletId, setToWalletId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [idemKey, setIdemKey] = useState(generateIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toWalletId || !amountStr) return;
    
    setLoading(true);
    try {
      const res = await TransferApi.createTransfer(toWalletId.trim(), amountStr, note.trim() || undefined, idemKey);
      if (!res.ok) throw res;
      if (res.ok) {
        toast({ type: 'success', title: 'Transfer Successful', message: `Sent ${formatMoney(amountStr)} to ${toWalletId}` });
        setToWalletId('');
        setAmountStr('');
        setNote('');
        setIdemKey(generateIdempotencyKey());
      }
    } catch (err) {
      toast({ type: 'error', title: 'Transfer Failed', message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader 
        title="P2P Transfer" 
        description="Send CBDC directly to another simulated wallet instantly."
      />

      <Card className="form-card">
        <CardHeader>
          <CardTitle className="card-title-row">
            <span className="card-title-icon"><Send size={18} /></span>
            Transfer Instruction
          </CardTitle>
          <CardDescription>Only Central Bank Core can settle and mutate balances.</CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleTransfer} className="form-stack">
          <Input 
            label="Recipient Wallet ID"
            placeholder="Paste receiver wallet_id"
            value={toWalletId}
            onChange={(e) => setToWalletId(e.target.value)}
            required
          />
          
          <AmountInput 
            label="Amount to Send"
            value={amountStr}
            onChange={setAmountStr}
            required
          />

          <Input
            label="Note (Optional)"
            placeholder="e.g. Payment for lunch"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <IdempotencyKeyField value={idemKey} onChange={setIdemKey} />

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            isLoading={loading}
            leftIcon={<Send size={18} />}
          >
            Send Funds
          </Button>
        </form>
        </CardContent>
      </Card>
    </div>
  );
};
