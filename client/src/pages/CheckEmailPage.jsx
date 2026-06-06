import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, MailCheck, RefreshCcw, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import './Auth.css';

export const CheckEmailPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [message, setMessage] = useState('Si ce compte existe, un lien de verification a ete envoye.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await authService.resendVerification(email);
      setMessage(result.message || 'Si ce compte existe, un nouveau lien a ete envoye.');
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Email invalide.');
      } else {
        setMessage('Si ce compte existe, un nouveau lien a ete envoye.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
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

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon-hero">
              <div className="auth-icon-circle">
                <MailCheck size={36} strokeWidth={1.8} />
              </div>
            </div>
            <span className="auth-eyebrow">
              <span className="dot" />
              Confirmation email
            </span>
            <h1 className="auth-title">Verifie ta boite mail</h1>
            <p className="auth-subtitle">
              Saisis ton email pour recevoir un nouveau lien de verification si ton compte n est pas encore active.
            </p>
          </div>

          {message && <div className="auth-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleResend} className="auth-form" style={{ marginTop: 16 }}>
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="check-email">Email</label>
              <div className="auth-input-wrap">
                <input
                  id="check-email"
                  className="auth-input"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="auth-input-icon"><Mail size={18} /></span>
              </div>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <RefreshCcw size={18} />
                  Renvoyer l'email
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Email confirme ?{' '}
            <Link to="/login">Se connecter</Link>
          </div>
        </div>

        <div className="auth-badge">
          <Flame size={14} />
          Lien valable 24h
        </div>
      </div>
    </div>
  );
};
