import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { WalletApi } from '../../api/wallet.api';
import { Card } from '../../components/ui/Card';
import { formatMoney } from '../../lib/money';
import { Wallet, QrCode } from 'lucide-react';
import { useToast } from '../../components/feedback/ToastProvider';
import { DataTable } from '../../components/data-table/DataTable';
import { WalletTransaction } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/date';

export const WalletOverviewPage: React.FC = () => {
  const [balance, setBalance] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await WalletApi.getWallet();
      if (!res.ok) throw res;
      if (res.ok && res.envelope.data) {
        setBalance(res.envelope.data.available_balance);
        setAccountId(res.envelope.data.wallet_id);
      }
      const txRes = await WalletApi.getTransactions();
      if (!txRes.ok) throw txRes;
      if (txRes.ok && txRes.envelope.data) {
        setTransactions(txRes.envelope.data);
      }
    } catch (err) {
      toast({ type: 'error', message: 'Failed to fetch wallet.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return (
    <div className="page-stack">
      <PageHeader 
        title="Wallet Overview" 
        description="View your simulated CBDC balance and account details."
      />

      <div className="dashboard-grid">
        <Card className="metric-card">
          <div className="metric-card__row">
            <div className="metric-card__icon success">
              <Wallet size={24} />
            </div>
            <div>
              <div className="metric-card__label">Current Balance</div>
              <div className="metric-card__value">
                {loading ? '...' : (balance !== null ? formatMoney(balance) : '---')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-card__row">
            <div className="metric-card__icon">
              <QrCode size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="metric-card__label">Wallet ID</div>
              <div className="mono-block" style={{ marginTop: 'var(--space-2)', fontWeight: 'var(--weight-semibold)' }}>
                {loading ? '...' : (accountId || '---')}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <DataTable
        data={transactions}
        columns={[
          {
            key: 'created_at',
            header: 'Time',
            cell: (item: WalletTransaction) => <span style={{ color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</span>,
            width: '180px',
          },
          {
            key: 'transaction_type',
            header: 'Type',
            cell: (item: WalletTransaction) => <Badge variant={item.direction === 'IN' ? 'success' : 'warning'}>{item.transaction_type}</Badge>,
          },
          {
            key: 'transaction_id',
            header: 'Transaction',
            cell: (item: WalletTransaction) => <span className="mono-block">{item.transaction_id}</span>,
          },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right' as const,
            cell: (item: WalletTransaction) => (
              <span style={{ fontWeight: 'var(--weight-semibold)', color: item.direction === 'IN' ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                {item.direction === 'IN' ? '+' : '-'}{formatMoney(item.direction === 'IN' ? item.gross_amount : item.total_debit)}
              </span>
            ),
          },
        ]}
        isLoading={loading}
        keyExtractor={(item) => item.transaction_id}
      />
    </div>
  );
};
