import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/feedback/ToastProvider';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ResponseConsole } from './components/feedback/ResponseConsole';

import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SupplyPage } from './features/supply/SupplyPage';
import { LedgerExplorerPage } from './features/ledger/LedgerExplorerPage';
import { WalletOverviewPage } from './features/wallet/WalletOverviewPage';
import { TransferPage } from './features/transfers/TransferPage';
import { PaymentRequestPage } from './features/payments/PaymentRequestPage';
import { LoanPage } from './features/loans/LoanPage';
import { ReversalPage } from './features/transactions/ReversalPage';
import { AuditLogPage } from './features/audit/AuditLogPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route index element={<DashboardPage />} />
                
                {/* Admin Only */}
                <Route path="supply" element={<ProtectedRoute requireAdmin><SupplyPage /></ProtectedRoute>} />
                <Route path="ledger" element={<ProtectedRoute requireAdmin><LedgerExplorerPage /></ProtectedRoute>} />
                <Route path="reversals" element={<ProtectedRoute requireAdmin><ReversalPage /></ProtectedRoute>} />
                <Route path="audit-logs" element={<ProtectedRoute requireAdmin><AuditLogPage /></ProtectedRoute>} />
                
                {/* User Wallet */}
                <Route path="wallet" element={<WalletOverviewPage />} />
                <Route path="transfers" element={<TransferPage />} />
                <Route path="payments" element={<PaymentRequestPage />} />
                <Route path="loans" element={<LoanPage />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <ResponseConsole />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
