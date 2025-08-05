import React, { useState, useRef, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, addMonths, isBefore, differenceInMonths, addDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export function DateRangeSelector({
  startDate,
  endDate,
  onRangeChange,
  minDate,
  maxDate = new Date(),
  className = ""
}: DateRangeSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [tempRange, setTempRange] = useState<{ start: number; end: number } | null>(null);
  const [isMovingRange, setIsMovingRange] = useState(false);
  const [moveStartOffset, setMoveStartOffset] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [daysInput, setDaysInput] = useState('');
  const [calendarStartDate, setCalendarStartDate] = useState<Date | null>(null);
  const [calendarEndDate, setCalendarEndDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Calculate the date range in days
  const totalDays = minDate 
    ? Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    : 365; // Default to 1 year if no minDate

  const effectiveMinDate = minDate || subDays(maxDate, totalDays);

  // Convert dates to positions (0-100%)
  const dateToPosition = (date: Date) => {
    const percentage = ((date.getTime() - effectiveMinDate.getTime()) / (maxDate.getTime() - effectiveMinDate.getTime())) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  // Convert position to date
  const positionToDate = (position: number) => {
    const timestamp = effectiveMinDate.getTime() + (position / 100) * (maxDate.getTime() - effectiveMinDate.getTime());
    return new Date(timestamp);
  };

  const startPosition = dateToPosition(startDate);
  const endPosition = dateToPosition(endDate);

  // Calculate display values (live updates during drag)
  const displayStartDate = tempRange ? positionToDate(tempRange.start) : startDate;
  const displayEndDate = tempRange ? positionToDate(tempRange.end) : endDate;
  const displayDays = Math.ceil((displayEndDate.getTime() - displayStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate month markers
  const generateMonthMarkers = () => {
    const totalMonths = differenceInMonths(maxDate, effectiveMinDate);
    const markers = [];
    
    // Determine interval based on total months - show more tickers
    let interval = 1;
    if (totalMonths > 60) interval = 3; // Show every 3 months if > 5 years
    else if (totalMonths > 36) interval = 2; // Show every 2 months if > 3 years
    // Otherwise show every month (interval = 1)
    
    let currentDate = startOfMonth(effectiveMinDate);
    
    while (isBefore(currentDate, maxDate) && markers.length < 25) {
      markers.push({
        date: currentDate,
        position: dateToPosition(currentDate),
        label: format(currentDate, 'MMM yy')
      });
      currentDate = addMonths(currentDate, interval);
    }
    
    return markers;
  };

  const monthMarkers = generateMonthMarkers();

  const handleDateDoubleClick = () => {
    setCalendarStartDate(startDate);
    setCalendarEndDate(endDate);
    setCalendarMonth(startDate);
    setIsSelectingEnd(false);
    setShowCalendar(true);
  };

  const handleDaysDoubleClick = () => {
    setIsEditingDays(true);
    setDaysInput(displayDays.toString());
  };

  const handleCalendarDateClick = (date: Date) => {
    if (!isSelectingEnd && !calendarStartDate) {
      setCalendarStartDate(date);
      setIsSelectingEnd(true);
    } else if (isSelectingEnd) {
      if (calendarStartDate && date >= calendarStartDate) {
        setCalendarEndDate(date);
        setIsSelectingEnd(false);
      } else if (calendarStartDate && date < calendarStartDate) {
        setCalendarStartDate(date);
        setCalendarEndDate(calendarStartDate);
        setIsSelectingEnd(false);
      }
    } else {
      setCalendarStartDate(date);
      setCalendarEndDate(null);
      setIsSelectingEnd(true);
    }
  };

  const handleCalendarCancel = () => {
    setShowCalendar(false);
    setCalendarStartDate(null);
    setCalendarEndDate(null);
    setIsSelectingEnd(false);
  };

  const handleDaysSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const days = parseInt(daysInput);
      if (!isNaN(days) && days > 0) {
        const newEndDate = endOfDay(new Date(displayStartDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000));
        onRangeChange(displayStartDate, newEndDate);
      }
      setIsEditingDays(false);
    } else if (e.key === 'Escape') {
      setIsEditingDays(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    
    setIsDragging(true);
    setDragStart(position);
    setTempRange({ start: position, end: position });
  };

  const handleStartHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing('start');
    setTempRange({ start: startPosition, end: endPosition });
  };

  const handleEndHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing('end');
    setTempRange({ start: startPosition, end: endPosition });
  };

  const handleRangeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickPosition = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Calculate offset from the start of the selected range
    setMoveStartOffset(clickPosition - startPosition);
    setIsMovingRange(true);
    
    // Store the original duration in milliseconds for precise preservation
    setOriginalDuration(endDate.getTime() - startDate.getTime());
  };

  useEffect(() => {
    if (isDragging && dragStart !== null) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        
        setTempRange({
          start: Math.min(dragStart, position),
          end: Math.max(dragStart, position)
        });
      };

      const handleMouseUp = () => {
        setTempRange(currentTempRange => {
          if (currentTempRange && Math.abs(currentTempRange.end - currentTempRange.start) >= 0.5) {
            const newStartDate = startOfDay(positionToDate(currentTempRange.start));
            const newEndDate = endOfDay(positionToDate(currentTempRange.end));
            onRangeChange(newStartDate, newEndDate);
          }
          return null;
        });
        
        setIsDragging(false);
        setDragStart(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, onRangeChange, effectiveMinDate, maxDate]);

  useEffect(() => {
    if (isMovingRange) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const mousePosition = ((e.clientX - rect.left) / rect.width) * 100;
        
        // Calculate new start position (mouse position minus the initial offset)
        const newStartPosition = mousePosition - moveStartOffset;
        const rangeWidth = endPosition - startPosition;
        
        // Constrain to boundaries
        const constrainedStart = Math.max(0, Math.min(100 - rangeWidth, newStartPosition));
        const constrainedEnd = constrainedStart + rangeWidth;
        
        setTempRange({
          start: constrainedStart,
          end: constrainedEnd
        });
      };

      const handleMouseUp = () => {
        setTempRange(currentTempRange => {
          if (currentTempRange && originalDuration > 0) {
            // Use the stored original duration to preserve exact duration
            const newStartDate = startOfDay(positionToDate(currentTempRange.start));
            const newEndDate = new Date(newStartDate.getTime() + originalDuration);
            onRangeChange(newStartDate, newEndDate);
          }
          return null;
        });
        
        setIsMovingRange(false);
        setMoveStartOffset(0);
        setOriginalDuration(0);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isMovingRange, moveStartOffset, startPosition, endPosition, originalDuration, onRangeChange, effectiveMinDate, maxDate]);

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const mousePosition = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        
        if (isResizing === 'start') {
          // Resize from the start (left) handle
          setTempRange(prev => ({
            start: Math.min(mousePosition, endPosition - 1), // Ensure minimum 1% width
            end: endPosition
          }));
        } else if (isResizing === 'end') {
          // Resize from the end (right) handle
          setTempRange(prev => ({
            start: startPosition,
            end: Math.max(mousePosition, startPosition + 1) // Ensure minimum 1% width
          }));
        }
      };

      const handleMouseUp = () => {
        setTempRange(currentTempRange => {
          if (currentTempRange) {
            const newStartDate = startOfDay(positionToDate(currentTempRange.start));
            const newEndDate = endOfDay(positionToDate(currentTempRange.end));
            onRangeChange(newStartDate, newEndDate);
          }
          return null;
        });
        
        setIsResizing(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startPosition, endPosition, onRangeChange, effectiveMinDate, maxDate]);

  // Handle click outside calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        handleCalendarCancel();
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);


  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className={`space-y-3 ${className} relative`}>
      {/* Compact header */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <span 
            className={`text-xs font-medium transition-colors duration-200 cursor-pointer hover:text-primary ${tempRange ? 'text-primary' : 'text-foreground'}`}
            onDoubleClick={handleDateDoubleClick}
            title="Double-click to select date range"
          >
            {format(displayStartDate, 'MMM d')} - {format(displayEndDate, 'MMM d, yyyy')}
          </span>
          
          {isEditingDays ? (
            <input
              type="number"
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              onKeyDown={handleDaysSubmit}
              onBlur={() => setIsEditingDays(false)}
              className="text-[10px] w-16 bg-background border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="days"
              min="1"
              autoFocus
            />
          ) : (
            <span 
              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-200 cursor-pointer hover:bg-primary/20 ${tempRange ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/50'}`}
              onDoubleClick={handleDaysDoubleClick}
              title="Double-click to edit duration"
            >
              {displayDays} days
            </span>
          )}
        </div>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div 
            ref={calendarRef}
            className="bg-card border border-border rounded-lg shadow-lg p-4 w-80"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-sm font-semibold">
                {format(calendarMonth, 'MMMM yyyy')}
              </h3>
              <button
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>


            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                const isInRange = calendarStartDate && calendarEndDate && day > calendarStartDate && day < calendarEndDate;
                const isStart = calendarStartDate && isSameDay(day, calendarStartDate);
                const isEnd = calendarEndDate && isSameDay(day, calendarEndDate);
                const isTodayDate = isToday(day);

                let roundedClass = 'rounded-md';
                if (isStart && isEnd) {
                  roundedClass = 'rounded-md'; // Single day selection
                } else if (isStart) {
                  roundedClass = 'rounded-l-md rounded-r-none'; // Start of range
                } else if (isEnd) {
                  roundedClass = 'rounded-r-md rounded-l-none'; // End of range  
                } else if (isInRange) {
                  roundedClass = 'rounded-none'; // Middle of range
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleCalendarDateClick(day)}
                    className={`
                      relative p-2 text-xs font-medium ${roundedClass}
                      ${!isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
                      ${isInRange ? 'bg-muted/80 text-muted-foreground/80' : ''}
                      ${isStart ? 'bg-foreground text-background relative' : ''}
                      ${isEnd ? 'bg-foreground text-background relative' : ''}
                      ${isTodayDate && !isInRange && !isStart && !isEnd ? 'border border-foreground' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {isStart && (
                      <div className="absolute inset-y-0 -right-0.5 w-0.5 bg-foreground"></div>
                    )}
                    {isEnd && (
                      <div className="absolute inset-y-0 -left-0.5 w-0.5 bg-foreground"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Footer */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
              <button
                onClick={handleCalendarCancel}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (calendarStartDate && calendarEndDate) {
                    onRangeChange(startOfDay(calendarStartDate), endOfDay(calendarEndDate));
                  }
                  setShowCalendar(false);
                  setIsSelectingEnd(false);
                }}
                disabled={!calendarStartDate || !calendarEndDate}
                className="px-3 py-1.5 text-xs bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground rounded-md transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple timeline slider */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="relative h-8 bg-muted/30 rounded-lg cursor-crosshair border border-border/50"
          onMouseDown={handleMouseDown}
        >
          {/* Selected range */}
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md border bg-primary/20 border-primary/50"
            style={{
              left: `${tempRange ? tempRange.start : startPosition}%`,
              width: `${Math.max(2, tempRange ? tempRange.end - tempRange.start : endPosition - startPosition)}%`,
            }}
          >
            {/* Left resize handle */}
            <div 
              className={`absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize transition-all duration-200 hover:scale-110 bg-primary ${isResizing === 'start' ? 'scale-110' : ''}`}
              onMouseDown={handleStartHandleMouseDown}
            />
            
            {/* Middle drag area */}
            <div 
              className={`absolute inset-0 mx-2 rounded-sm ${
                isMovingRange ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleRangeMouseDown}
            />
            
            {/* Right resize handle */}
            <div 
              className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize transition-all duration-200 hover:scale-110 bg-primary ${isResizing === 'end' ? 'scale-110' : ''}`}
              onMouseDown={handleEndHandleMouseDown}
            />
          </div>
        </div>

        {/* Clean month markers */}
        <div className="relative mt-1 h-4">
          {monthMarkers.map((marker, index) => (
            <div
              key={index}
              className="absolute flex flex-col items-center"
              style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-1 bg-border/40 mb-0.5" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}