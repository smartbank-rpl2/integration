import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { LedgerApi } from '../../api/ledger.api';
import { LedgerEntry } from '../../api/types';
import { DataTable } from '../../components/data-table/DataTable';
import { Badge } from '../../components/ui/Badge';
import { formatMoney } from '../../lib/money';
import { formatDate } from '../../lib/date';
import { useToast } from '../../components/feedback/ToastProvider';

export const LedgerExplorerPage: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LedgerApi.getLedger();
      if (!res.ok) throw res;
      if (res.ok && res.envelope.data) {
        setEntries(res.envelope.data);
      }
    } catch (err) {
      toast({ type: 'error', message: 'Failed to fetch ledger entries.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const columns = [
    {
      key: 'id',
      header: 'ID',
      cell: (item: LedgerEntry) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{item.id.substring(0, 8)}...</span>,
      width: '100px'
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      cell: (item: LedgerEntry) => <span style={{ color: 'var(--text-secondary)' }}>{formatDate(item.createdAt)}</span>,
      width: '180px'
    },
    {
      key: 'transactionId',
      header: 'Txn Ref',
      cell: (item: LedgerEntry) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{item.transactionId.substring(0, 8)}...</span>,
      width: '120px'
    },
    {
      key: 'accountId',
      header: 'Account',
      cell: (item: LedgerEntry) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{item.accountId}</span>
    },
    {
      key: 'direction',
      header: 'Dr/Cr',
      cell: (item: LedgerEntry) => (
        <Badge variant={item.direction === 'CREDIT' ? 'success' : 'danger'}>
          {item.direction}
        </Badge>
      ),
      width: '100px'
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      cell: (item: LedgerEntry) => (
        <span style={{ fontWeight: 'var(--weight-semibold)', color: item.direction === 'CREDIT' ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
          {item.direction === 'CREDIT' ? '+' : '-'}{formatMoney(item.amount)}
        </span>
      ),
      width: '150px'
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader 
        title="Ledger Explorer" 
        description="Immutable double-entry ledger records of all balance changes."
      />

      <DataTable
        data={entries}
        columns={columns}
        isLoading={loading}
        keyExtractor={(item) => item.id}
      />
    </div>
  );
};
