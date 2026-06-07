import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './CustomDatePicker.css';

const parseDateValue = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
const weekDays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

export class CustomDatePicker extends React.PureComponent {
  constructor(props) {
    super(props);
    const currentDate = parseDateValue(props.value);

    this.state = {
      isOpen: false,
      coords: { top: 0, left: 0 },
      displayYear: currentDate.getFullYear(),
      displayMonth: currentDate.getMonth(),
    };

    this.containerRef = React.createRef();
    this.popupRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event) => {
    if (
      this.containerRef.current &&
      !this.containerRef.current.contains(event.target) &&
      this.popupRef.current &&
      !this.popupRef.current.contains(event.target)
    ) {
      this.setState({ isOpen: false });
    }
  };

  toggleOpen = () => {
    const { isOpen } = this.state;
    const currentDate = parseDateValue(this.props.value);

    if (!isOpen && this.containerRef.current) {
      const rect = this.containerRef.current.getBoundingClientRect();
      const popupWidth = 280;
      const left = Math.max(10, rect.right - popupWidth);

      this.setState({
        isOpen: true,
        displayYear: currentDate.getFullYear(),
        displayMonth: currentDate.getMonth(),
        coords: {
          top: rect.bottom + window.scrollY + 8,
          left,
        },
      });
      return;
    }

    this.setState({ isOpen: false });
  };

  handlePrevMonth = () => {
    this.setState(({ displayMonth, displayYear }) => {
      if (displayMonth === 0) {
        return { displayMonth: 11, displayYear: displayYear - 1 };
      }
      return { displayMonth: displayMonth - 1 };
    });
  };

  handleNextMonth = () => {
    this.setState(({ displayMonth, displayYear }) => {
      if (displayMonth === 11) {
        return { displayMonth: 0, displayYear: displayYear + 1 };
      }
      return { displayMonth: displayMonth + 1 };
    });
  };

  handleSelectDate = (day) => {
    const { displayYear, displayMonth } = this.state;
    const { onChange } = this.props;
    const newDate = new Date(Date.UTC(displayYear, displayMonth, day));
    const yyyy = newDate.getUTCFullYear();
    const mm = String(newDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getUTCDate()).padStart(2, '0');

    if (onChange) {
      onChange({ target: { value: `${yyyy}-${mm}-${dd}` } });
    }

    this.setState({ isOpen: false });
  };

  renderPopup() {
    const { coords, displayYear, displayMonth } = this.state;
    const currentDate = parseDateValue(this.props.value);
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const today = new Date();

    return (
      <div className="custom-datepicker-popup" style={{ top: coords.top, left: coords.left }} ref={this.popupRef}>
        <div className="datepicker-header">
          <button type="button" className="datepicker-nav" onClick={this.handlePrevMonth}>
            <ChevronLeft size={18} />
          </button>
          <strong>{monthNames[displayMonth]} {displayYear}</strong>
          <button type="button" className="datepicker-nav" onClick={this.handleNextMonth}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="datepicker-grid datepicker-weekdays">
          {weekDays.map((day) => <div key={day} className="datepicker-cell weekday">{day}</div>)}
        </div>

        <div className="datepicker-grid">
          {Array.from({ length: startOffset }).map((_, index) => (
            <div key={`empty-${index}`} className="datepicker-cell empty" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isSelected = currentDate.getDate() === day && currentDate.getMonth() === displayMonth && currentDate.getFullYear() === displayYear;
            const isToday = today.getDate() === day && today.getMonth() === displayMonth && today.getFullYear() === displayYear;

            return (
              <button
                key={day}
                type="button"
                className={`datepicker-cell day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => this.handleSelectDate(day)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  render() {
    const { isOpen } = this.state;
    const currentDate = parseDateValue(this.props.value);
    const displayDateText = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

    return (
      <div className="custom-datepicker-container" ref={this.containerRef}>
        <button
          type="button"
          className="custom-datepicker-trigger"
          onClick={this.toggleOpen}
        >
          <CalendarIcon size={16} />
          <span>{displayDateText}</span>
        </button>

        {isOpen && createPortal(this.renderPopup(), document.body)}
      </div>
    );
  }
}
