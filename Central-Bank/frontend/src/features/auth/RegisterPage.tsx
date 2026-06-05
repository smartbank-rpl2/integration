import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthApi } from '../../api/auth.api';
import { useToast } from '../../components/feedback/ToastProvider';
import { getErrorMessage } from '../../lib/errors';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { schemas } from '../../api/schemas';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setIdempotencyKey(generateIdempotencyKey());
  }, [name, email, password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = { name: name.trim(), email: email.trim(), password };
    const validation = schemas.auth.register.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await AuthApi.register(payload, idempotencyKey);
      if (!res.ok) throw res;
      if (res.ok) {
        toast({ 
          type: 'success', 
          message: 'Wallet created with initial distribution.', 
          title: 'Registration Successful' 
        });
        setIdempotencyKey(generateIdempotencyKey());
        navigate('/login');
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({ type: 'error', message: msg, title: 'Registration Failed' });
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
          <h1 className="auth-card__title">Create Wallet</h1>
          <p className="auth-card__description">
            Register a new CBDC wallet for the academic simulation.
          </p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <Input
            label="Full Name"
            type="text"
            placeholder="Example User"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            autoFocus
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error || undefined}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />

          <div className="auth-note">
            Register uses an automatic idempotency header because wallet creation triggers initial CBDC distribution.
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            isLoading={loading}
            leftIcon={<UserPlus size={18} />}
            style={{ width: '100%' }}
          >
            Create Wallet
          </Button>
          
          <div className="auth-link-row">
            <span>Already have a wallet? </span>
            <Link to="/login">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
