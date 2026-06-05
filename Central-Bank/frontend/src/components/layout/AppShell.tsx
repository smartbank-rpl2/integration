import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { EnvironmentBadge } from '../ui/EnvironmentBadge';
import './AppShell.css';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <div 
          className="cb-modal-overlay" 
          style={{ zIndex: 40 }} 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <div className={`app-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="app-main">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <EnvironmentBadge />
    </div>
  );
};
