import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Flame, MailCheck, RefreshCcw, ShieldCheck, ChevronRight, Mail } from 'lucide-react';
import { authService } from '../services/authService';
import { getErrorMessage } from '../utils/errors';
import './Auth.css';

const OTP_LENGTH = 6;

export const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [email, setEmail] = useState(location.state?.email || '');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Entre le code a 6 chiffres envoye par email.');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!verified) return undefined;
    const timeout = window.setTimeout(() => {
      navigate('/login', { replace: true, state: { email } });
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [email, navigate, verified]);

  const applyCode = (value, startIndex = 0) => {
    const clean = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!clean) return;

    setDigits((current) => {
      const next = [...current];
      for (let i = 0; i < clean.length && startIndex + i < OTP_LENGTH; i += 1) {
        next[startIndex + i] = clean[i];
      }
      return next;
    });

    const nextIndex = Math.min(startIndex + clean.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleDigitChange = (index, value) => {
    setError('');
    applyCode(value, index);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    applyCode(event.clipboardData.getData('text'), 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Email requis pour verifier le code.');
      return;
    }

    if (code.length !== OTP_LENGTH) {
      setError('Entre les 6 chiffres du code.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.verifyEmail(email, code);
      setVerified(true);
      setMessage(result.message || 'Email confirme. Redirection vers la connexion...');
    } catch (err) {
      setError(getErrorMessage(err, 'Code invalide ou expire.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Saisis ton email pour recevoir un nouveau code.');
      return;
    }

    setResendLoading(true);
    try {
      await authService.resendCode(email);
      setDigits(Array(OTP_LENGTH).fill(''));
      setMessage('Si ce compte existe, un nouveau code a ete envoye.');
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err.response?.status === 400) {
        setError(getErrorMessage(err, 'Email invalide.'));
      } else {
        setMessage('Si ce compte existe, un nouveau code a ete envoye.');
      }
    } finally {
      setResendLoading(false);
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
        <div className="auth-deco-line auth-deco-line--accent" />
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon-hero">
              <div className="auth-icon-circle">
                {verified ? <ShieldCheck size={38} strokeWidth={1.8} /> : <MailCheck size={38} strokeWidth={1.8} />}
              </div>
            </div>
            <span className="auth-eyebrow">
              <span className="dot" />
              Verification OTP
            </span>
            <h1 className="auth-title">{verified ? 'Email confirme' : 'Code de verification'}</h1>
            <p className="auth-subtitle">
              {verified ? 'Redirection vers la connexion...' : 'Le code expire dans 15 minutes.'}
            </p>
          </div>

          {message && <div className="auth-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="verify-email">Email</label>
              <div className="auth-input-wrap">
                <input
                  id="verify-email"
                  className="auth-input"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="auth-input-icon"><Mail size={18} /></span>
              </div>
            </div>

            <div className="auth-otp-wrap" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={`otp-${index}`}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  className="auth-otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Chiffre ${index + 1} du code`}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  disabled={verified}
                />
              ))}
            </div>

            <button className="auth-btn" type="submit" disabled={loading || verified}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Verifier
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            <button
              className="auth-secondary-btn"
              type="button"
              onClick={handleResend}
              disabled={resendLoading || verified}
            >
              {resendLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <RefreshCcw size={18} />
                  Renvoyer le code
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Deja verifie ?{' '}
            <Link to="/login">Se connecter</Link>
          </div>
        </div>

        <div className="auth-badge">
          <Flame size={14} />
          Code valable 15 min
        </div>
      </div>
    </div>
  );
};
