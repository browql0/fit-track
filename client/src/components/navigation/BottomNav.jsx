import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Zap, BarChart3, UtensilsCrossed, Target } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Accueil',   icon: Home },
  { to: '/nutrition',  label: 'Nutrition',  icon: UtensilsCrossed },
  null, // center slot
  { to: '/goals',      label: 'Objectifs',  icon: Target },
  { to: '/progress',   label: 'Progrès',    icon: BarChart3 },
];

export const BottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const transitionTo = (path) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(path));
      return;
    }
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="apex-nav" aria-label="Navigation mobile">

      {NAV_ITEMS.map((item, i) => {
        /* ── Center CTA ── */
        if (item === null) {
          return (
            <button
              key="cta"
              className="apex-cta"
              onClick={() => transitionTo('/workouts')}
              aria-label="Entraînement"
            >
              <span className="apex-cta-outer">
                <span className="apex-cta-inner">
                  <Zap size={24} strokeWidth={2.5} />
                </span>
              </span>
              <span className="apex-cta-label">Sport</span>
            </button>
          );
        }

        /* ── Regular item ── */
        const Icon   = item.icon;
        const active = isActive(item.to);

        return (
          <button
            key={item.to}
            className={`apex-item${active ? ' active' : ''}`}
            onClick={() => transitionTo(item.to)}
            aria-label={item.label}
            style={{ '--idx': i }}
          >
            {/* beam that shoots up when active */}
            <span className="apex-beam" aria-hidden="true" />

            {/* icon bubble */}
            <span className="apex-icon-wrap">
              <Icon size={21} strokeWidth={active ? 2.5 : 2} className="apex-icon" />
              {/* active halo ring */}
              {active && <span className="apex-halo" aria-hidden="true" />}
            </span>

            <span className="apex-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
