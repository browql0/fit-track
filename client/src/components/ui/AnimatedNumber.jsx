import { useEffect, useMemo, useRef, useState } from 'react';

const easeOutQuart = (value) => 1 - Math.pow(1 - value, 4);

export const AnimatedNumber = ({
  value = 0,
  suffix = '',
  prefix = '',
  duration = 780,
  decimals = 0,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  const target = useMemo(() => Number(value) || 0, [value]);

  useEffect(() => {
    let frameId;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frameId = requestAnimationFrame(() => {
        setDisplayValue(target);
        previousValue.current = target;
      });
      return () => cancelAnimationFrame(frameId);
    }

    const start = performance.now();
    const from = previousValue.current;
    const delta = target - from;

    const tick = (now) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const next = from + delta * easeOutQuart(elapsed);
      setDisplayValue(next);

      if (elapsed < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValue.current = target;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return (
    <span className={`animated-number ${className}`.trim()}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};
