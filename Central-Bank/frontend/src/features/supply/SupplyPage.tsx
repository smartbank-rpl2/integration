import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ShieldCheck, ShieldX } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SupplyApi } from '../../api/supply.api';
import { SupplyReport } from '../../api/types';
import { useToast } from '../../components/feedback/ToastProvider';
import { formatMoney } from '../../lib/money';

export const SupplyPage: React.FC = () => {
  const [supply, setSupply] = useState<SupplyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSupply = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SupplyApi.getSupply();
      if (!res.ok) throw res;
      setSupply(res.envelope.data);
    } catch (err) {
      toast({ type: 'error', message: 'Failed to fetch supply invariant report.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSupply();
  }, [fetchSupply]);

  const metrics = [
    { label: 'Total Supply', value: supply?.total_supply },
    { label: 'Central Reserve', value: supply?.reserve_balance },
    { label: 'Circulating Supply', value: supply?.circulating_supply },
    { label: 'Sink / Burn Accounting', value: supply?.sink_or_burn_accounting },
    { label: 'Invariant Total', value: supply?.invariant_total },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="CBDC Supply Monitor"
        description="Read-only reserve, circulation, and supply invariant report from Central Bank Core."
        actions={
          <Button type="button" variant="outline" onClick={() => void fetchSupply()} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      <Card className="metric-card">
        <div className="page-header__row">
          <div className="metric-card__row">
            <div className="metric-card__icon">
              <Activity size={24} />
            </div>
            <div>
              <div className="metric-card__label">Supply Invariant</div>
              <div className="metric-card__value">
                {loading ? '...' : supply ? formatMoney(supply.invariant_total) : '---'}
              </div>
            </div>
          </div>
          <Badge variant={supply?.invariant_valid ? 'success' : 'danger'}>
            {supply?.invariant_valid ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
            <span style={{ marginLeft: 6 }}>{supply?.invariant_valid ? 'Valid' : 'Invalid'}</span>
          </Badge>
        </div>
      </Card>

      <div className="dashboard-grid">
        {metrics.map((metric) => (
          <Card key={metric.label} className="metric-card">
            <div className="metric-card__label">{metric.label}</div>
            <div className="metric-card__value" style={{ fontSize: 'var(--text-xl)' }}>
              {loading ? '...' : metric.value ? formatMoney(metric.value) : '---'}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
