import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Wallet, Activity, ArrowRightLeft, BookOpen, Receipt, HandCoins } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { SupplyApi } from '../../api/supply.api';
import { WalletApi } from '../../api/wallet.api';
import { formatMoney } from '../../lib/money';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'CENTRAL_BANK_ADMIN';
  
  const [supply, setSupply] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        if (isAdmin) {
          const res = await SupplyApi.getSupply();
          if (!res.ok) throw res;
          if (res.ok && res.envelope.data && mounted) {
            setSupply(res.envelope.data.total_supply);
          }
        } else {
          const res = await WalletApi.getWallet();
          if (!res.ok) throw res;
          if (res.ok && res.envelope.data && mounted) {
            setWalletBalance(res.envelope.data.available_balance);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [isAdmin]);

  return (
    <div className="page-stack">
      <PageHeader 
        title="Dashboard" 
        description={`Welcome back to Central Bank Core Simulation, ${user?.email || 'User'}`} 
      />

      <div className="bento-grid">
        {/* Main Balance/Metric Card */}
        {isAdmin ? (
          <Card className="bento-item bento-large metric-card-hero">
            <div className="metric-card__row">
              <div className="metric-card__icon hero-icon">
                <Activity size={32} />
              </div>
              <div>
                <div className="metric-card__label">Total CBDC Supply</div>
                <div className="metric-card__value hero-value">
                  {supply !== null ? formatMoney(supply) : '---'}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bento-item bento-large metric-card-hero">
            <div className="metric-card__row">
              <div className="metric-card__icon success hero-icon">
                <Wallet size={32} />
              </div>
              <div>
                <div className="metric-card__label">Your Available Balance</div>
                <div className="metric-card__value hero-value">
                  {walletBalance !== null ? formatMoney(walletBalance) : '---'}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions Bento Items */}
        <Link to="/transfers" className="action-card cb-card bento-item bento-small">
          <span className="action-card__icon"><ArrowRightLeft size={24} /></span>
          <span className="action-card__label">Make a Transfer</span>
        </Link>

        <Link to="/payments" className="action-card cb-card bento-item bento-small">
          <span className="action-card__icon"><Receipt size={24} /></span>
          <span className="action-card__label">Payment Requests</span>
        </Link>

        <Link to="/loans" className="action-card cb-card bento-item bento-small">
          <span className="action-card__icon"><HandCoins size={24} /></span>
          <span className="action-card__label">Loans</span>
        </Link>

        <Link to="/wallet" className="action-card cb-card bento-item bento-small">
          <span className="action-card__icon"><Wallet size={24} /></span>
          <span className="action-card__label">Wallet Overview</span>
        </Link>
        
        {isAdmin && (
          <Link to="/ledger" className="action-card cb-card bento-item bento-small">
            <span className="action-card__icon"><BookOpen size={24} /></span>
            <span className="action-card__label">View Ledger</span>
          </Link>
        )}
      </div>
    </div>
  );
};
