import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Receipt, 
  HandCoins,
  BookOpen, 
  RotateCcw, 
  Activity, 
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { clearSession } from '../../auth/session';
import './Sidebar.css';

interface SidebarProps {
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'CBDC Supply', path: '/supply', icon: <Building2 size={20} />, adminOnly: true },
    { label: 'Ledger Explorer', path: '/ledger', icon: <BookOpen size={20} />, adminOnly: true },
    { label: 'Reversals', path: '/reversals', icon: <RotateCcw size={20} />, adminOnly: true },
    { label: 'Audit Logs', path: '/audit-logs', icon: <Activity size={20} />, adminOnly: true },
    { type: 'divider' },
    { label: 'Wallet Sim', path: '/wallet', icon: <Wallet size={20} /> },
    { label: 'Transfers', path: '/transfers', icon: <ArrowRightLeft size={20} /> },
    { label: 'Payment Requests', path: '/payments', icon: <Receipt size={20} /> },
    { label: 'Loans', path: '/loans', icon: <HandCoins size={20} /> },
  ];

  const isAdmin = user?.role === 'CENTRAL_BANK_ADMIN';

  return (
    <>
      <div className="cb-sidebar-header">
        <div className="cb-sidebar-brand">
          <Building2 size={24} className="text-brand-300" />
          <span>Core Bank</span>
        </div>
        <button className="cb-sidebar-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="cb-sidebar-nav">
        {navItems.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={`divider-${index}`} className="cb-sidebar-divider" />;
          }

          if (item.adminOnly && !isAdmin) {
            return null;
          }

          return (
            <NavLink 
              key={item.path} 
              to={item.path as string} 
              className={({ isActive }) => `cb-sidebar-item ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="cb-sidebar-footer">
        <div className="cb-sidebar-user">
          <div className="cb-sidebar-user-info">
            <span className="cb-sidebar-user-email truncate" title={user?.email}>{user?.email || 'User'}</span>
            <span className="cb-sidebar-user-role">{user?.role?.replace(/_/g, ' ') || 'Unknown'}</span>
          </div>
        </div>
        <button className="cb-sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </>
  );
};
