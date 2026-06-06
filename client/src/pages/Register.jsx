import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Lock, Mail, Eye, EyeOff, Shield, Dumbbell, Heart, ChevronRight } from 'lucide-react';
import { AuthContext } from '../context/authContext';
import './Auth.css';

export const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      navigate('/check-email', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Echec de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: 'Faible', color: '#ff5b7c' };
    if (score <= 2) return { level: 2, label: 'Moyen', color: '#ffcc66' };
    if (score <= 3) return { level: 3, label: 'Bon', color: '#47d6ff' };
    return { level: 4, label: 'Fort', color: '#56f39a' };
  };

  const strength = getStrength(password);

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
              Rejoins l'élite
            </span>
            <h1 className="auth-title">Crée ton profil</h1>
            <p className="auth-subtitle">
              Un compte. Des objectifs. Une progression quotidienne vers ta meilleure version.
            </p>
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="register-email">Email</label>
              <div className="auth-input-wrap">
                <input
                  id="register-email"
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
              <label className="auth-input-label" htmlFor="register-password">Mot de passe</label>
              <div className="auth-input-wrap">
                <input
                  id="register-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <span className="auth-input-icon"><Lock size={18} /></span>
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Strength indicator */}
              {password && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    flex: 1,
                  }}>
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 999,
                          background: s <= strength.level ? strength.color : 'rgba(255,255,255,0.08)',
                          transition: 'background 300ms ease',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: strength.color,
                    minWidth: 40,
                  }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="register-confirm">Confirmer</label>
              <div className="auth-input-wrap">
                <input
                  id="register-confirm"
                  className="auth-input"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirme ton mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <span className="auth-input-icon"><Shield size={18} /></span>
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmPassword && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: password === confirmPassword ? '#56f39a' : '#ff5b7c',
                  marginTop: 2,
                }}>
                  {password === confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Ne correspond pas'}
                </span>
              )}
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Démarrer mon parcours
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            Déjà inscrit ?{' '}
            <Link to="/login">Se connecter</Link>
          </div>

          {/* Features */}
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon"><Dumbbell size={18} /></div>
              <span>Entraînements</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Heart size={18} /></div>
              <span>Nutrition</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Shield size={18} /></div>
              <span>Données sécurisées</span>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="auth-badge">
          <Flame size={14} />
          Setup personnalisé
        </div>
      </div>
    </div>
  );
};
