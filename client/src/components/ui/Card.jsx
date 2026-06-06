import './Card.css';

export const Card = ({ children, className = '', animate = false, ...props }) => {
  const classes = `glass-panel card ${animate ? 'slide-up' : ''} ${className}`;
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, className = '' }) => (
  <div className={`card-header ${className}`}>
    <h3 className="card-title">{title}</h3>
    {subtitle && <p className="text-sm card-subtitle">{subtitle}</p>}
  </div>
);
