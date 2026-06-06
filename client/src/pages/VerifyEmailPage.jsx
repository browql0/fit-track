import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flame, CheckCircle2, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { authService } from '../services/authService';
import './Auth.css';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Vérification en cours...');

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get('token');

    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Lien de vérification invalide ou expiré.');
        return;
      }

      try {
        const result = await authService.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(result.message || 'Email confirmé avec succès.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.error || 'Lien de vérification invalide ou expiré.');
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const renderIcon = () => {
    if (status === 'loading') return <Loader2 size={36} strokeWidth={1.8} style={{ animation: 'spin 1s linear infinite' }} />;
    if (status === 'success') return <CheckCircle2 size={36} strokeWidth={1.8} />;
    return <AlertTriangle size={36} strokeWidth={1.8} />;
  };

  const getTitle = () => {
    if (status === 'loading') return 'Vérification...';
    if (status === 'success') return 'Email confirmé';
    return 'Lien invalide';
  };

  return (
    <div className="auth-page">
      {/* Background scene */}
      <div className="auth-bg-scene">
        <div
          className="auth-bg-image"
          style={{ backgroundImage: 'url(/auth-hero.png)' }}
        />
        <div className="auth-bg-overlay" />
        <div className="auth-particles">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="auth-particle" />
          ))}
        </div>
        <div className="auth-deco-line auth-deco-line--top" />
      </div>

      {/* Content */}
      <div className="auth-content">
        <div className="auth-card">
          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-icon-hero">
              <div className="auth-icon-circle" style={
                status === 'success'
                  ? { borderColor: 'rgba(86, 243, 154, 0.25)', background: 'linear-gradient(135deg, rgba(86, 243, 154, 0.15), rgba(86, 243, 154, 0.05))' }
                  : status === 'error'
                    ? { borderColor: 'rgba(255, 91, 124, 0.25)', background: 'linear-gradient(135deg, rgba(255, 91, 124, 0.15), rgba(255, 91, 124, 0.05))' }
                    : {}
              }>
                <span style={{
                  color: status === 'success' ? '#56f39a' : status === 'error' ? '#ff5b7c' : 'var(--lime)',
                  display: 'flex',
                }}>
                  {renderIcon()}
                </span>
              </div>
            </div>
            <span className="auth-eyebrow">
              <span className="dot" />
              Vérification email
            </span>
            <h1 className="auth-title">{getTitle()}</h1>
            <p className="auth-subtitle">{message}</p>
          </div>

          {/* Actions */}
          {status === 'success' && (
            <Link to="/login" className="auth-btn" style={{ textDecoration: 'none', marginTop: 8 }}>
              Se connecter
              <ChevronRight size={18} />
            </Link>
          )}

          {status === 'error' && (
            <Link to="/check-email" className="auth-btn" style={{ textDecoration: 'none', marginTop: 8 }}>
              Renvoyer un email
              <ChevronRight size={18} />
            </Link>
          )}
        </div>

        {/* Badge */}
        <div className="auth-badge">
          <Flame size={14} />
          Expérience Sport Premium
        </div>
      </div>
    </div>
  );
};
