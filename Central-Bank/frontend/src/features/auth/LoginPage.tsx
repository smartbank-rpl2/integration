import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthApi } from '../../api/auth.api';
import { setSessionToken } from '../../auth/session';
import { useToast } from '../../components/feedback/ToastProvider';
import { getErrorMessage } from '../../lib/errors';
import { schemas } from '../../api/schemas';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = { email: email.trim(), password };
    const validation = schemas.auth.login.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await AuthApi.login(payload.email, payload.password);
      if (!res.ok) throw res;
      if (res.ok && res.envelope.data) {
        setSessionToken(res.envelope.data.access_token);
        toast({ type: 'success', message: 'Successfully logged in', title: 'Welcome back' });
        window.location.href = '/';
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({ type: 'error', message: msg, title: 'Login Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-brand-icon">
            <Building2 size={32} />
          </div>
          <h1 className="auth-card__title">Central Bank Core</h1>
          <p className="auth-card__description">
            Sign in to access the CBDC simulation platform.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <Input
            label="Email Address"
            type="email"
            placeholder="admin@centralbank.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error || undefined}
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            required
            autoComplete="current-password"
          />

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            isLoading={loading}
            leftIcon={<LogIn size={18} />}
            style={{ width: '100%' }}
          >
            Sign In
          </Button>
          
          <div className="auth-link-row">
            <span>Don't have an account? </span>
            <Link to="/register">
              Register Simulator Wallet
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
