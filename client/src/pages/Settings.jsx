import { useContext, useState } from 'react';
import { ThemeContext } from '../context/themeContext';
import { AuthContext } from '../context/authContext';
import { 
  Moon, Sun, ShieldCheck, User, Bell, Globe, 
  Smartphone, ChevronRight, ExternalLink, Zap
} from 'lucide-react';
import './Settings.css';

export const Settings = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  
  // Dummy states for the UI switches
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="set-shell">
      <div className="set-layout">
        
        {/* --- Left Column / Top --- */}
        <div className="set-sidebar">
          <header className="set-header">
            <span className="set-eyebrow">Preferences</span>
            <h1 className="set-title">Parametres</h1>
          </header>

          <div className="set-user-card">
            <div className="set-user-avatar">
              <User size={28} />
            </div>
            <div className="set-user-info">
              <h2>{user?.email || 'Sportif Connecte'}</h2>
              <span><ShieldCheck size={16} /> Session securisee</span>
            </div>
          </div>
        </div>

        {/* --- Right Column / Bottom --- */}
        <div className="set-main">
          
          <section className="set-section" style={{ '--delay': '120ms' }}>
            <h3>Apparence</h3>
            <div className="set-card">
              <div className="set-theme-picker">
                <button 
                  type="button"
                  className={`set-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => { if(theme !== 'dark') toggleTheme() }}
                >
                  <div className="set-theme-icon"><Moon size={24} /></div>
                  Mode Sombre
                </button>
                <button 
                  type="button"
                  className={`set-theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => { if(theme !== 'light') toggleTheme() }}
                >
                  <div className="set-theme-icon"><Sun size={24} /></div>
                  Mode Clair
                </button>
              </div>
            </div>
          </section>

          <section className="set-section" style={{ '--delay': '180ms' }}>
            <h3>Preferences (A venir)</h3>
            <div className="set-card list">
              
              <div className="set-list-item clickable" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                <div className="set-item-icon"><Bell size={20} /></div>
                <div className="set-item-info">
                  <strong>Notifications</strong>
                  <small>Rappels et bilans</small>
                </div>
                <div className={`set-toggle-dummy ${notificationsEnabled ? 'active' : ''}`}></div>
              </div>

              <div className="set-list-item clickable">
                <div className="set-item-icon"><Globe size={20} /></div>
                <div className="set-item-info">
                  <strong>Langue</strong>
                  <small>Francais</small>
                </div>
                <ChevronRight size={20} className="set-action-icon" />
              </div>

              <div className="set-list-item clickable">
                <div className="set-item-icon"><Zap size={20} /></div>
                <div className="set-item-info">
                  <strong>Unites</strong>
                  <small>Metrique (kg, km)</small>
                </div>
                <ChevronRight size={20} className="set-action-icon" />
              </div>

            </div>
          </section>

          <section className="set-section" style={{ '--delay': '240ms' }}>
            <h3>A propos</h3>
            <div className="set-card list">
              
              <div className="set-list-item">
                <div className="set-item-icon" style={{ color: 'var(--primary)' }}><Smartphone size={20} /></div>
                <div className="set-item-info">
                  <strong>Version de l'application</strong>
                  <small>v2.4.0 Sport Luxe</small>
                </div>
              </div>

              <div className="set-list-item clickable">
                <div className="set-item-info">
                  <strong>Conditions d'utilisation</strong>
                </div>
                <ExternalLink size={18} className="set-action-icon" />
              </div>

              <div className="set-list-item clickable">
                <div className="set-item-info">
                  <strong>Politique de confidentialite</strong>
                </div>
                <ExternalLink size={18} className="set-action-icon" />
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
