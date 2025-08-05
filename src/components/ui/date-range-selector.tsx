import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    
    setIsDragging(true);
    setDragStart(position);
    setTempRange({ start: position, end: position });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || dragStart === null || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    
    setTempRange({
      start: Math.min(dragStart, position),
      end: Math.max(dragStart, position)
    });
  };

  const handleMouseUp = () => {
    if (tempRange && Math.abs(tempRange.end - tempRange.start) >= 0.5) {
      const newStartDate = startOfDay(positionToDate(tempRange.start));
      const newEndDate = endOfDay(positionToDate(tempRange.end));
      onRangeChange(newStartDate, newEndDate);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setTempRange(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);


  return (
    <div className={`space-y-3 ${className}`}>
      {/* Compact header with date range */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
          </span>
        </div>
      </div>

      {/* Compact timeline slider */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="relative h-8 bg-gradient-to-r from-muted/30 to-muted/60 rounded-full cursor-crosshair overflow-hidden border border-border/30"
          onMouseDown={handleMouseDown}
        >
          {/* Subtle grid marks */}
          <div className="absolute inset-0 flex items-center">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="flex-1 flex justify-center"
              >
                <div className="w-px h-2 bg-border/30" />
              </div>
            ))}
          </div>

          {/* Selected range with gradient */}
          <div
            className="absolute top-0.5 bottom-0.5 bg-gradient-to-r from-primary/20 to-primary/30 border border-primary/60 rounded-full transition-all duration-200 shadow-sm"
            style={{
              left: `${tempRange ? tempRange.start : startPosition}%`,
              width: `${Math.max(2, tempRange ? tempRange.end - tempRange.start : endPosition - startPosition)}%`,
            }}
          >
            {/* Sleek handles */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-primary rounded-full cursor-ew-resize shadow-md border border-background" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-primary rounded-full cursor-ew-resize shadow-md border border-background" />
          </div>

          {/* Drag indicator */}
          {isDragging && dragStart !== null && (
            <div 
              className="absolute top-1 bottom-1 w-0.5 bg-primary rounded-full pointer-events-none"
              style={{ left: `${dragStart}%` }}
            />
          )}
        </div>

        {/* Minimalist date labels */}
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[9px] text-muted-foreground">
            {format(effectiveMinDate, 'MMM yyyy')}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {format(maxDate, 'MMM yyyy')}
          </span>
        </div>
      </div>
    </div>
  );
}