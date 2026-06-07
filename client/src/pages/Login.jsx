import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Lock, Mail, Eye, EyeOff, Zap, Target, Trophy, ChevronRight, RefreshCcw } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import { EMAIL_VERIFICATION_ENABLED } from '../config/features';
import { authService } from '../services/authService';
import { getErrorMessage } from '../utils/errors';
import './Auth.css';

export const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsEmailNotVerified(false);
    setLoading(true);
    try {
      const data = await login(email, password);
      navigate(data.user?.profile ? '/dashboard' : '/profile/setup');
    } catch (err) {
      const code = err.response?.data?.code;
      if (EMAIL_VERIFICATION_ENABLED && code === 'EMAIL_NOT_VERIFIED') {
        setIsEmailNotVerified(true);
        setError('Votre email n est pas encore verifie.');
      } else {
        setError(getErrorMessage(err, 'Echec de la connexion.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!EMAIL_VERIFICATION_ENABLED) return;

    setResendLoading(true);

    try {
      await authService.resendCode(email);
      navigate('/verify-email', { state: { email } });
    } catch {
      navigate('/verify-email', { state: { email } });
    } finally {
      setResendLoading(false);
    }
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
        <div className="auth-deco-line auth-deco-line--accent" />
      </div>

      {/* Content */}
      <div className="auth-content">
        <div className="auth-card">
          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-logo">
              <Flame size={32} strokeWidth={2.5} />
            </div>
            <span className="auth-eyebrow">
              <span className="dot" />
              Elite Performance
            </span>
            <h1 className="auth-title">Bon retour, champion</h1>
            <p className="auth-subtitle">
              Reconnecte-toi et reprends ta progression vers l'excellence.
            </p>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}
          {EMAIL_VERIFICATION_ENABLED && isEmailNotVerified && (
            <button
              className="auth-btn"
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading || !email}
              style={{ marginBottom: 16 }}
            >
              {resendLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <RefreshCcw size={18} />
                  Renvoyer le code de verification
                </>
              )}
            </button>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="login-email">Email</label>
              <div className="auth-input-wrap">
                <input
                  id="login-email"
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

            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="login-password">Mot de passe</label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <span className="auth-input-icon"><Lock size={18} /></span>
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Se connecter
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            Pas encore de compte ?{' '}
            <Link to="/register">Créer un profil</Link>
          </div>

          {/* Features */}
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon"><Zap size={18} /></div>
              <span>Suivi intelligent</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Target size={18} /></div>
              <span>Objectifs précis</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Trophy size={18} /></div>
              <span>Performance max</span>
            </div>
          </div>
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
