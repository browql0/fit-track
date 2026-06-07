import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, BarChart3, Bell, Dumbbell, Home, LogOut, 
  Moon, Settings, Sparkles, Sun, Target, UtensilsCrossed, 
  User, Flame, Zap, ChevronRight
} from 'lucide-react';
import { AuthContext } from '../../context/authContext';
import { ThemeContext } from '../../context/themeContext';
import './Navbar.css';

export const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const transitionTo = (path) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(path));
      return;
    }
    navigate(path);
  };

  const navGroups = [
    {
      title: "Quotidien",
      items: [
        { to: '/dashboard', label: "Aujourd'hui", icon: Home },
        { to: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
        { to: '/workouts', label: 'Entraînement', icon: Dumbbell },
      ]
    },
    {
      title: "Performance",
      items: [
        { to: '/progress', label: 'Progrès', icon: BarChart3 },
        { to: '/goals', label: 'Objectifs', icon: Target },
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/progress') return location.pathname === '/progress' || location.pathname === '/tracking';
    return location.pathname === path;
  };

  return (
    <aside className="navbar navbar-desktop-only">
      <div className="navbar-top">
        {/* Brand */}
        <Link
          to="/dashboard"
          className="navbar-brand"
          onClick={(event) => { event.preventDefault(); transitionTo('/dashboard'); }}
        >
          <span className="brand-mark">
            <span className="brand-glow" />
            <Activity size={20} strokeWidth={2.5} />
          </span>
          <span className="brand-text-wrap">
            <span className="brand-text">FitTrack OS</span>
            <span className="brand-sub">Elite Performance</span>
          </span>
        </Link>

        {/* Gold scan-line divider */}
        <div className="navbar-brand-divider" />

        {user && (
          <>
            {/* User Profile Card */}
            <div className="navbar-user-card" onClick={() => transitionTo('/profile')}>
              <div className="navbar-avatar">
                {user.email ? user.email.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">
                  {user.name || user.email?.split('@')[0] || 'Athlète'}
                </span>
                <span className="navbar-user-status">
                  <Flame size={11} className="status-icon" /> En feu · 3j
                </span>
              </div>
              <ChevronRight size={15} className="navbar-user-arrow" />
            </div>

            {/* Quick Stats Widget */}
            <div className="navbar-stats-widget">
              <div className="nav-stat">
                <span className="nav-stat-value">2.4k</span>
                <span className="nav-stat-label">Kcal</span>
              </div>
              <div className="nav-stat-divider" />
              <div className="nav-stat">
                <span className="nav-stat-value text-accent">45</span>
                <span className="nav-stat-label">Min</span>
              </div>
              <div className="nav-stat-divider" />
              <div className="nav-stat">
                <span className="nav-stat-value text-aqua">120</span>
                <span className="nav-stat-label">BPM</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="navbar-links" aria-label="Navigation principale">
              {navGroups.map((group, groupIndex) => (
                <div key={group.title} className="nav-group">
                  <div className="nav-group-title">{group.title}</div>
                  {group.items.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={(event) => { event.preventDefault(); transitionTo(item.to); }}
                        className={`navbar-link${active ? ' active' : ''}`}
                        style={{ '--i': index + (groupIndex * 3) }}
                      >
                        {active && <span className="nav-active-indicator" />}
                        <span className="nav-icon-box">
                          <Icon size={17} />
                        </span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="navbar-bottom">
        <div className="navbar-separator" />

        {user ? (
          <div className="navbar-footer">
            {/* Premium Banner */}
            <div className="premium-banner">
              <div className="premium-bg-glow" />
              <div className="premium-banner-head">
                <Sparkles size={15} />
                <strong>Pass Élite</strong>
              </div>
              <p>Analyses avancées & coaching IA personnalisé.</p>
              <button type="button" className="premium-btn">
                <Zap size={13} /> Découvrir
              </button>
            </div>

            {/* Settings & Actions */}
            <div className="nav-actions-grid">
              <button type="button" className="nav-action-mini" onClick={() => transitionTo('/settings')} aria-label="Réglages">
                <Settings size={17} />
              </button>
              <button type="button" className="nav-action-mini" aria-label="Notifications">
                <Bell size={17} />
                <span className="nav-badge" />
              </button>
              <button type="button" className="nav-action-mini" onClick={toggleTheme} aria-label="Thème">
                <span className="theme-icon-swap" data-theme={theme}>
                  <Sun size={17} className="theme-icon theme-icon-sun" />
                  <Moon size={17} className="theme-icon theme-icon-moon" />
                </span>
              </button>
              <button type="button" className="nav-action-mini danger" onClick={handleLogout} aria-label="Déconnexion">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-footer">
            <button type="button" className="nav-action cta" onClick={() => navigate('/register')}>
              Démarrer maintenant
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
