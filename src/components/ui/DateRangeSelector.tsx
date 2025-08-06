import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, addMonths, isBefore, differenceInMonths, addDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  data?: Array<{ formattedDay: string; [key: string]: any }>;
  dataKey?: string;
}

export function DateRangeSelector({
  startDate,
  endDate,
  onRangeChange,
  minDate,
  maxDate = new Date(),
  className = "",
  data,
  dataKey = "value"
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
  const [isCalendarDragging, setIsCalendarDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
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
        label: format(currentDate, "MMM ''yy")
      });
      currentDate = addMonths(currentDate, interval);
    }
    
    return markers;
  };

  const monthMarkers = generateMonthMarkers();

  // Prepare timeline chart data - full dataset formatted for Recharts
  const timelineChartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data
      .map(item => ({
        date: item.formattedDay,
        value: dataKey && item[dataKey] !== undefined ? item[dataKey] : 0,
        timestamp: (() => {
          const [day, month, year] = item.formattedDay.split("-");
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
        })()
      }))
      .filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= effectiveMinDate && itemDate <= maxDate;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data, dataKey, effectiveMinDate, maxDate]);



  const handleCalendarDateMouseDown = (date: Date) => {
    // Check if date is valid (within range and not in future)
    const isValidDate = date >= (minDate || effectiveMinDate) && date <= maxDate;
    if (!isValidDate) return;
    
    // If we already have a start date but no end date, set this as end date
    if (calendarStartDate && !calendarEndDate && !isCalendarDragging) {
      const startDate = calendarStartDate <= date ? calendarStartDate : date;
      const endDate = calendarStartDate <= date ? date : calendarStartDate;
      setCalendarStartDate(startDate);
      setCalendarEndDate(endDate);
      setIsSelectingEnd(false);
      return;
    }
    
    // Otherwise start new drag selection
    setIsCalendarDragging(true);
    setDragStartDate(date);
    setCalendarStartDate(date);
    setCalendarEndDate(null);
    setIsSelectingEnd(false);
  };

  const handleCalendarDateMouseEnter = (date: Date) => {
    if (isCalendarDragging && dragStartDate) {
      // Check if date is valid (within range and not in future)
      const isValidDate = date >= (minDate || effectiveMinDate) && date <= maxDate;
      if (!isValidDate) return;
      
      const startDate = dragStartDate <= date ? dragStartDate : date;
      const endDate = dragStartDate <= date ? date : dragStartDate;
      setCalendarStartDate(startDate);
      setCalendarEndDate(endDate);
    }
  };

  const handleCalendarDateMouseUp = () => {
    setIsCalendarDragging(false);
    setDragStartDate(null);
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
        // Validate the new end date is within bounds
        if (newEndDate <= maxDate && displayStartDate >= (minDate || effectiveMinDate)) {
          onRangeChange(displayStartDate, newEndDate);
        }
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

  // Handle drag events
  useEffect(() => {
    const handleMouseUp = () => {
      if (isCalendarDragging) {
        handleCalendarDateMouseUp();
      }
    };

    if (isCalendarDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isCalendarDragging]);


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
      {/* Header with custom time period text and controls */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Select custom time period
        </span>
        
        <div className="flex items-center gap-4">
          <div 
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
              tempRange 
                ? 'border-primary/50 bg-primary/5 text-primary' 
                : 'border-border/50 bg-background/50 text-foreground hover:border-primary/30 hover:bg-primary/5'
            }`}
            onClick={() => {
              setCalendarStartDate(startDate);
              setCalendarEndDate(endDate);
              setCalendarMonth(startDate);
              setIsSelectingEnd(false);
              setShowCalendar(true);
            }}
          >
            <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">
              {format(displayStartDate, 'MMM d')} — {format(displayEndDate, 'MMM d, yyyy')}
            </span>
          </div>
          
          <div className="w-px h-4 bg-border/40"></div>
          
          {isEditingDays ? (
            <input
              type="number"
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              onKeyDown={handleDaysSubmit}
              onBlur={() => setIsEditingDays(false)}
              className="text-sm w-20 bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="days"
              min="1"
              autoFocus
            />
          ) : (
            <span 
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer border ${tempRange ? 'text-primary bg-primary/5 border-primary/20 hover:bg-primary/10' : 'text-muted-foreground bg-background/50 border-border/50 hover:bg-muted/40 hover:text-foreground'}`}
              onClick={() => {
                setIsEditingDays(true);
                setDaysInput(displayDays.toString());
              }}
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
                const isValidDate = day >= (minDate || effectiveMinDate) && day <= maxDate;
                const isDisabled = !isCurrentMonth || !isValidDate;

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
                    onMouseDown={() => handleCalendarDateMouseDown(day)}
                    onMouseEnter={() => handleCalendarDateMouseEnter(day)}
                    disabled={isDisabled}
                    className={`
                      relative p-2 text-xs font-medium ${roundedClass} select-none
                      ${isDisabled ? 'text-muted-foreground/20 cursor-not-allowed' : 'text-foreground'}
                      ${!isDisabled && isInRange ? 'bg-muted/40 text-muted-foreground/40' : ''}
                      ${!isDisabled && isStart ? 'bg-primary text-primary-foreground relative' : ''}
                      ${!isDisabled && isEnd ? 'bg-primary text-primary-foreground relative' : ''}
                      ${!isDisabled && isTodayDate && !isInRange && !isStart && !isEnd ? 'border border-foreground' : ''}
                      ${!isDisabled && isCalendarDragging ? 'cursor-grabbing' : !isDisabled ? 'cursor-pointer' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {isStart && !isDisabled && (
                      <div className="absolute inset-y-0 -right-0.5 w-0.5 bg-primary"></div>
                    )}
                    {isEnd && !isDisabled && (
                      <div className="absolute inset-y-0 -left-0.5 w-0.5 bg-primary"></div>
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

      {/* Timeline Chart with Range Selector Overlay */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="relative h-20 bg-card rounded-lg border border-border overflow-hidden"
        >
          {/* Area Chart Background */}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timelineChartData}
              margin={{ top: 3, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeOpacity={0.6}
                fill="url(#timelineGradient)"
                dot={false}
                activeDot={false}
              />
              <XAxis 
                dataKey="date"
                hide={true}
              />
              <YAxis 
                hide={true}
                domain={[0, 'dataMax']}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Range Selection Overlay */}
          <div
            className="absolute inset-0 pointer-events-auto"
          >
            
            {/* Selected range */}
            <div
              className="absolute top-0.5 bottom-0.5 rounded-md border pointer-events-auto"
              style={{
                left: `${tempRange ? tempRange.start : startPosition}%`,
                width: `${Math.max(2, tempRange ? tempRange.end - tempRange.start : endPosition - startPosition)}%`,
                backgroundColor: 'hsl(var(--primary) / 0.2)',
                borderColor: 'hsl(var(--primary) / 0.5)',
              }}
            >
              {/* Left resize handle */}
              <div 
                className={`absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize transition-all duration-200 hover:scale-110 ${isResizing === 'start' ? 'scale-110' : ''}`}
                style={{ backgroundColor: 'hsl(var(--primary))' }}
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
                className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm cursor-ew-resize transition-all duration-200 hover:scale-110 ${isResizing === 'end' ? 'scale-110' : ''}`}
                style={{ backgroundColor: 'hsl(var(--primary))' }}
                onMouseDown={handleEndHandleMouseDown}
              />
            </div>
            
            {/* Clickable background areas for new selections */}
            <div
              className="absolute top-0 bottom-0 left-0 pointer-events-auto cursor-crosshair"
              style={{
                width: `${tempRange ? tempRange.start : startPosition}%`,
              }}
              onMouseDown={handleMouseDown}
            />
            
            <div
              className="absolute top-0 bottom-0 right-0 pointer-events-auto cursor-crosshair"
              style={{
                width: `${100 - (tempRange ? tempRange.end : endPosition)}%`,
              }}
              onMouseDown={handleMouseDown}
            />
          </div>
        </div>

        {/* Timeline Labels */}
        <div className="relative mt-1 h-6 overflow-visible px-2">
          {monthMarkers.map((marker, index) => {
            // More aggressive overflow prevention
            let transform = 'translateX(-50%)';
            let textAlign = 'center';
            
            if (marker.position < 8) {
              transform = 'translateX(0%)';
              textAlign = 'left';
            } else if (marker.position > 92) {
              transform = 'translateX(-100%)';
              textAlign = 'right';
            }
            
            return (
              <div
                key={index}
                className="absolute flex flex-col items-center"
                style={{ 
                  left: `${Math.max(0, Math.min(100, marker.position))}%`, 
                  transform,
                  maxWidth: '60px', // Fixed max width
                  minWidth: '40px'
                }}
              >
                <div className="w-px h-2 bg-border/40 mb-1" />
                <span 
                  className="text-[10px] text-muted-foreground whitespace-nowrap truncate"
                  style={{ textAlign }}
                >
                  {marker.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}