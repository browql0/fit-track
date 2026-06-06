import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './CustomDatePicker.css';

const parseDateValue = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const CustomDatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const currentDate = parseDateValue(value);
  
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        popupRef.current && !popupRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      setDisplayYear(currentDate.getFullYear());
      setDisplayMonth(currentDate.getMonth());
      const rect = containerRef.current.getBoundingClientRect();
      // Right align popup with the trigger button
      const popupWidth = 280; // from CSS
      let left = rect.right - popupWidth;
      if (left < 10) left = 10; // basic boundary safety
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: left,
      });
    }
    setIsOpen(!isOpen);
  };

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(y => y - 1);
    } else {
      setDisplayMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(y => y + 1);
    } else {
      setDisplayMonth(m => m + 1);
    }
  };

  const handleSelectDate = (day) => {
    const newDate = new Date(Date.UTC(displayYear, displayMonth, day));
    const yyyy = newDate.getUTCFullYear();
    const mm = String(newDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getUTCDate()).padStart(2, '0');
    if (onChange) {
      onChange({ target: { value: `${yyyy}-${mm}-${dd}` } });
    }
    setIsOpen(false);
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  const displayDateText = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const renderPopup = () => (
    <div className="custom-datepicker-popup" style={{ top: coords.top, left: coords.left }} ref={popupRef}>
      <div className="datepicker-header">
        <button type="button" className="datepicker-nav" onClick={handlePrevMonth}><ChevronLeft size={18} /></button>
        <strong>{monthNames[displayMonth]} {displayYear}</strong>
        <button type="button" className="datepicker-nav" onClick={handleNextMonth}><ChevronRight size={18} /></button>
      </div>
      
      <div className="datepicker-grid datepicker-weekdays">
        {weekDays.map(d => <div key={d} className="datepicker-cell weekday">{d}</div>)}
      </div>
      
      <div className="datepicker-grid">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="datepicker-cell empty"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = currentDate.getDate() === day && currentDate.getMonth() === displayMonth && currentDate.getFullYear() === displayYear;
          const isToday = new Date().getDate() === day && new Date().getMonth() === displayMonth && new Date().getFullYear() === displayYear;
          
          return (
            <button
              key={day}
              type="button"
              className={`datepicker-cell day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => handleSelectDate(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="custom-datepicker-container" ref={containerRef}>
      <button 
        type="button"
        className="custom-datepicker-trigger" 
        onClick={toggleOpen}
      >
        <CalendarIcon size={16} />
        <span>{displayDateText}</span>
      </button>

      {isOpen && createPortal(renderPopup(), document.body)}
    </div>
  );
};
