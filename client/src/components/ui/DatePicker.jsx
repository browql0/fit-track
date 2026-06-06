import { Calendar } from 'lucide-react';
import { getRelativeDate } from '../../utils/formatters';

export const DatePicker = ({ value, onChange, className = '' }) => {
  // value is expected to be a string YYYY-MM-DD
  
  const handlePrevDay = () => {
    const d = new Date(value);
    d.setDate(d.getDate() - 1);
    onChange(d.toISOString().split('T')[0]);
  };
  
  const handleNextDay = () => {
    const d = new Date(value);
    d.setDate(d.getDate() + 1);
    onChange(d.toISOString().split('T')[0]);
  };
  
  const today = new Date().toISOString().split('T')[0];
  const isToday = value === today;

  return (
    <div className={`flex items-center justify-between glass-panel px-4 py-3 ${className}`} style={{ borderRadius: 'var(--radius-full)' }}>
      <button type="button" onClick={handlePrevDay} className="p-1 text-secondary hover:text-primary transition-colors" aria-label="Jour precedent">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <div className="flex flex-col items-center relative cursor-pointer px-4">
        <div className="flex items-center gap-2 text-primary font-medium hover:opacity-80 transition-opacity">
          <Calendar size={16} />
          <span>{getRelativeDate(value)}</span>
        </div>
        <input 
          type="date" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          aria-label="Choisir une date"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
        />
      </div>
      
      <button 
        type="button"
        onClick={handleNextDay} 
        disabled={isToday}
        aria-label="Jour suivant"
        className={`p-1 transition-colors ${isToday ? 'text-secondary opacity-30 cursor-not-allowed' : 'text-secondary hover:text-primary'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};
