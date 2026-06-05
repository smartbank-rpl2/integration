import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { IdempotencyKeyField } from '../../components/ui/IdempotencyKeyField';
import { CentralBankApi } from '../../api/central-bank.api';
import { useToast } from '../../components/feedback/ToastProvider';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { getErrorMessage } from '../../lib/errors';

export const ReversalPage: React.FC = () => {
  const [transactionId, setTransactionId] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transactionId.trim() || !reasonCode.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await CentralBankApi.reverseTransaction(
        transactionId.trim(),
        reasonCode.trim(),
        note.trim() || undefined,
        idempotencyKey,
      );
      if (!res.ok) throw res;
      const reversalId = res.envelope.data?.reversal_transaction_id ?? '';
      setResult(reversalId);
      toast({ type: 'success', title: 'Reversal Settled', message: `Created reversal transaction ${reversalId}` });
      setTransactionId('');
      setReasonCode('');
      setNote('');
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      toast({ type: 'error', title: 'Reversal Failed', message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Transaction Reversals"
        description="Create audited reversal transactions without deleting or mutating settled ledger entries."
      />

      <Card className="form-card">
        <CardHeader>
          <CardTitle className="card-title-row">
            <span className="card-title-icon"><RotateCcw size={18} /></span>
            Reversal Instruction
          </CardTitle>
          <CardDescription>Creates a new balanced reversal transaction and records audit metadata.</CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="form-stack">
          <Input
            label="Original Transaction ID"
            placeholder="Paste settled transaction_id"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
            required
          />
          <Input
            label="Reason Code"
            placeholder="e.g. ADMIN_CORRECTION"
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            required
          />
          <Input
            label="Note (Optional)"
            placeholder="Additional audit note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} />
          <Button type="submit" variant="danger" isLoading={loading} leftIcon={<RotateCcw size={18} />}>
            Create Reversal
          </Button>
        </form>

        {result && (
          <div className="result-panel result-panel--success">
            <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>Reversal created</div>
            <div className="mono-block">{result}</div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
};
