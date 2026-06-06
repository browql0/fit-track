import './Button.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  type = 'button', 
  fullWidth = false, 
  loading = false,
  icon = null,
  className = '',
  ...props 
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    loading ? 'loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner"></span>}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};
