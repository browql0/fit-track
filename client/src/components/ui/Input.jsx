import { forwardRef, useId, useState, useRef, useEffect } from 'react';
import { getErrorMessage } from '../../utils/errors';
import './Input.css';

export const Input = forwardRef(({ label, error, className = '', icon, ...props }, ref) => {
  const generatedId = useId();
  const inputId = props.id || props.name || generatedId;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            {icon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`input-field ${error ? 'error' : ''}`}
          style={icon ? { paddingLeft: '2.5rem' } : {}}
          {...props}
        />
      </div>
      {error && <span className="input-error-msg">{getErrorMessage(error)}</span>}
    </div>
  );
});

export const Select = forwardRef(({ label, error, options, className = '', value, onChange, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const generatedId = useId();
  const selectId = props.id || props.name || generatedId;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.value === '') || options[0];

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val, name: props.name } });
    }
    setIsOpen(false);
  };

  return (
    <div className={`input-wrapper ${className}`} ref={selectRef}>
      {label && <label className="input-label" htmlFor={selectId}>{label}</label>}
      
      <div 
        className={`custom-select-trigger input-field ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        id={selectId}
      >
        <span className={!value ? 'placeholder' : ''}>
          {selectedOption ? selectedOption.label : 'Sélectionner...'}
        </span>
        <svg 
          className="select-chevron" 
          width="16" height="16" 
          viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`}>
        <div className="custom-select-scroll">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>
      
      {error && <span className="input-error-msg">{getErrorMessage(error)}</span>}
      
      {/* Hidden input for form submission if needed by the parent via ref */}
      <input type="hidden" ref={ref} value={value} name={props.name} />
    </div>
  );
});
