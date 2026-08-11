import React, { useMemo, useState } from "react";

interface CalendarPopoverProps {
  startDate: string;
  endDate: string;
  activePicker: "start" | "end";
  onSelectDate: (dateStr: string) => void;
}

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  startDate,
  endDate,
  activePicker,
  onSelectDate,
}) => {
  const initialDate = activePicker === "start" ? startDate : endDate;
  const initialYear = initialDate ? Number(initialDate.split("-")[0]) : 2026;
  const initialMonth = initialDate ? Number(initialDate.split("-")[1]) - 1 : 7;

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const totalDays = getDaysInMonth(viewYear, viewMonth);

    // Days of previous month to fill the first row
    const prevMonthTotalDays = getDaysInMonth(viewYear, viewMonth - 1);
    const prevMonthDays = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        monthOffset: -1,
      });
    }

    // Days of current month
    const currentMonthDays = [];
    for (let i = 1; i <= totalDays; i++) {
      currentMonthDays.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0,
      });
    }

    // Days of next month to fill the remaining slots (makes a standard 6-row / 42-cell grid)
    const remainingSlots = 42 - (prevMonthDays.length + currentMonthDays.length);
    const nextMonthDays = [];
    for (let i = 1; i <= remainingSlots; i++) {
      nextMonthDays.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1,
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const prevYear = () => setViewYear((prev) => prev - 1);
  const nextYear = () => setViewYear((prev) => prev + 1);

  const isStartDate = (day: number, isCurrentMonth: boolean, monthOffset: number) => {
    if (!isCurrentMonth || !startDate) return false;
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
    return sDay === day && sMonth === (targetMonth + 1) && sYear === targetYear;
  };

  const isEndDate = (day: number, isCurrentMonth: boolean, monthOffset: number) => {
    if (!isCurrentMonth || !endDate) return false;
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
    return eDay === day && eMonth === (targetMonth + 1) && eYear === targetYear;
  };

  const handleDaySelect = (day: number, isCurrentMonth: boolean, monthOffset: number) => {
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const formattedDate = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelectDate(formattedDate);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onSelectDate(formattedDate);
  };

  const getDayClass = (dayObj: { day: number; isCurrentMonth: boolean; monthOffset: number }) => {
    const { day, isCurrentMonth, monthOffset } = dayObj;
    const baseClass = "w-8 h-8 flex items-center justify-center mx-auto text-xs focus:outline-none transition-all";

    if (!isCurrentMonth) {
      return `${baseClass} text-gray-300 font-normal hover:bg-gray-50 rounded-full`;
    }

    const isStart = isStartDate(day, isCurrentMonth, monthOffset);
    const isEnd = isEndDate(day, isCurrentMonth, monthOffset);

    // If editing the "From" date picker
    if (activePicker === "start") {
      if (isStart) {
        return `${baseClass} text-white font-semibold bg-blue-500 rounded-full shadow-sm`;
      }
      return `${baseClass} text-gray-700 font-medium hover:bg-gray-100 rounded-full`;
    }

    // If editing the "To" date picker
    if (activePicker === "end") {
      if (isEnd) {
        return `${baseClass} text-white font-semibold bg-blue-500 rounded-full shadow-sm`;
      }
      if (isStart) {
        return `${baseClass} text-blue-600 font-semibold border-2 border-blue-500 rounded bg-blue-50/50`;
      }
      return `${baseClass} text-gray-700 font-medium hover:bg-gray-100 rounded-full`;
    }

    return `${baseClass} text-gray-700 font-medium hover:bg-gray-100 rounded-full`;
  };

  return (
    <div
      className={`absolute top-full z-50 mt-1 w-[280px] border-gray-200 bg-white p-3.5 shadow-xl animate-fade-in ${
        activePicker === "start" ? "left-0" : "right-0"
      }`}
    >
      {/* Header Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={prevYear}
            className="cursor-pointer text-[13px] font-bold text-gray-400 transition hover:text-gray-700"
            title="Previous year"
          >
            &lt;&lt;
          </button>
          <button
            onClick={prevMonth}
            className="cursor-pointer text-[13px] font-bold text-gray-400 transition hover:text-gray-700"
            title="Previous month"
          >
            &lt;
          </button>
        </div>

        <span className="text-xs font-bold text-gray-800 font-sans">
          {months[viewMonth]} {viewYear}
        </span>

        <div className="flex gap-2">
          <button
            onClick={nextMonth}
            className="cursor-pointer text-[13px] font-bold text-gray-400 transition hover:text-gray-700"
            title="Next month"
          >
            &gt;
          </button>
          <button
            onClick={nextYear}
            className="cursor-pointer text-[13px] font-bold text-gray-400 transition hover:text-gray-700"
            title="Next year"
          >
            &gt;&gt;
          </button>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
          <span key={dayName} className="text-[11px] font-bold text-gray-500 py-1 font-sans">
            {dayName}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 mt-1 text-center">
        {calendarDays.map((dayObj, idx) => (
          <button
            key={`${dayObj.monthOffset}-${dayObj.day}-${idx}`}
            onClick={() => handleDaySelect(dayObj.day, dayObj.isCurrentMonth, dayObj.monthOffset)}
            className={`${getDayClass(dayObj)}`}
          >
            {dayObj.day}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3.5 border-t border-gray-100 pt-2 text-center font-sans">
        <button
          onClick={handleSelectToday}
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-800 hover:underline cursor-pointer"
        >
          Today
        </button>
      </div>
    </div>
  );
};
