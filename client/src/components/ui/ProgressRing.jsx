import { useEffect, useState } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import './ProgressRing.css';

export const ProgressRing = ({ 
  value = 0, 
  max = 100, 
  size = 120, 
  strokeWidth = 10, 
  color = 'var(--info)',
  trackColor = 'var(--border-subtle)', // Updated default for light theme
  label,
  sublabel
}) => {
  const [offset, setOffset] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(Math.max(value / max, 0), 1);
  const numericLabel = typeof label === 'string' ? label.match(/^(\d+(?:\.\d+)?)(.*)$/) : null;

  useEffect(() => {
    const progressOffset = circumference - percent * circumference;
    const timeout = setTimeout(() => {
      setOffset(progressOffset);
    }, 100); 
    
    return () => clearTimeout(timeout);
  }, [percent, circumference]);

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg
        className="progress-ring-svg"
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--success)" />
            <stop offset="45%" stopColor="var(--secondary)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <circle
          className="progress-ring-track"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Fill */}
        <circle
          className="progress-ring-circle"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset === 0 && percent > 0 ? circumference : offset }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {(label || sublabel) && (
        <div className="progress-ring-content">
          {label && (
            <span 
              className="progress-ring-label" 
              style={{ fontSize: size > 150 ? '1.75rem' : '1.1rem' }}
            >
              {numericLabel ? (
                <AnimatedNumber value={Number(numericLabel[1])} suffix={numericLabel[2]} duration={920} />
              ) : label}
            </span>
          )}
          {sublabel && <span className="progress-ring-sublabel">{sublabel}</span>}
        </div>
      )}
    </div>
  );
};
