import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, addMonths, isBefore, differenceInMonths } from 'date-fns';

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
  const containerRef = useRef<HTMLDivElement>(null);

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
    
    // Determine interval based on total months
    let interval = 1;
    if (totalMonths > 24) interval = 6; // Show every 6 months if > 2 years
    else if (totalMonths > 12) interval = 3; // Show every 3 months if > 1 year
    else if (totalMonths > 6) interval = 2; // Show every 2 months if > 6 months
    
    let currentDate = startOfMonth(effectiveMinDate);
    
    while (isBefore(currentDate, maxDate) && markers.length < 10) {
      markers.push({
        date: currentDate,
        position: dateToPosition(currentDate),
        label: format(currentDate, totalMonths > 12 ? 'MMM yy' : 'MMM')
      });
      currentDate = addMonths(currentDate, interval);
    }
    
    return markers;
  };

  const monthMarkers = generateMonthMarkers();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    
    setIsDragging(true);
    setDragStart(position);
    setTempRange({ start: position, end: position });
  };

  useEffect(() => {
    if (!isDragging || dragStart === null) return;

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
  }, [isDragging, dragStart, onRangeChange, effectiveMinDate, maxDate]);


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Elegant header with date range */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50">
          <Calendar className={`w-4 h-4 transition-colors duration-200 ${tempRange ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-semibold transition-all duration-200 ${tempRange ? 'text-primary scale-105' : 'text-foreground'}`}>
            {format(displayStartDate, 'MMM d')} - {format(displayEndDate, 'MMM d, yyyy')}
          </span>
          <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${tempRange ? 'text-primary bg-primary/15 shadow-sm scale-105' : 'text-muted-foreground bg-muted/60'}`}>
            {displayDays} days
          </div>
        </div>
      </div>

      {/* Refined timeline slider */}
      <div className="relative">
        <div 
          ref={containerRef}
          className={`relative h-10 bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 rounded-xl cursor-crosshair overflow-hidden border transition-all duration-200 ${isDragging ? 'border-primary/50 shadow-lg shadow-primary/20' : 'border-border/40 hover:border-border/60'}`}
          onMouseDown={handleMouseDown}
        >
          {/* Refined grid marks */}
          <div className="absolute inset-0 flex items-center px-2">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="flex-1 flex justify-center"
              >
                <div className={`w-px transition-all duration-200 ${i % 3 === 0 ? 'h-3 bg-border/50' : 'h-2 bg-border/30'}`} />
              </div>
            ))}
          </div>

          {/* Enhanced selected range */}
          <div
            className={`absolute top-1 bottom-1 bg-gradient-to-r from-primary/25 via-primary/35 to-primary/25 border rounded-lg transition-all duration-200 ${isDragging ? 'shadow-lg shadow-primary/30 border-primary/70' : 'shadow-md border-primary/60'}`}
            style={{
              left: `${tempRange ? tempRange.start : startPosition}%`,
              width: `${Math.max(2, tempRange ? tempRange.end - tempRange.start : endPosition - startPosition)}%`,
            }}
          >
            {/* Premium handles */}
            <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-5 bg-primary rounded-full cursor-ew-resize shadow-lg border-2 border-background transition-all duration-200 ${isDragging ? 'scale-110' : 'hover:scale-105'}`} />
            <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-5 bg-primary rounded-full cursor-ew-resize shadow-lg border-2 border-background transition-all duration-200 ${isDragging ? 'scale-110' : 'hover:scale-105'}`} />
            
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent rounded-lg" />
          </div>

          {/* Enhanced drag indicator */}
          {isDragging && dragStart !== null && (
            <div 
              className="absolute top-2 bottom-2 w-0.5 bg-primary rounded-full pointer-events-none shadow-sm animate-pulse"
              style={{ left: `${dragStart}%` }}
            />
          )}
        </div>

        {/* Refined month markers */}
        <div className="relative mt-3 h-5">
          {monthMarkers.map((marker, index) => (
            <div
              key={index}
              className="absolute flex flex-col items-center group"
              style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-2.5 bg-gradient-to-b from-border/60 to-border/30 mb-1.5 group-hover:from-primary/60 group-hover:to-primary/30 transition-colors duration-200" />
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap group-hover:text-foreground transition-colors duration-200 px-1 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/30">
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}