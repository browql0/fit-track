export const Skeleton = ({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  circle = false
}) => {
  const styles = {
    width: width || (variant === 'text' ? '100%' : '100px'),
    height: height || (variant === 'text' ? '1rem' : '100px'),
    borderRadius: circle ? '50%' : 'var(--radius-sm)'
  };

  return (
    <div 
      className={`skeleton ${className}`} 
      style={styles}
      aria-hidden="true"
    />
  );
};
