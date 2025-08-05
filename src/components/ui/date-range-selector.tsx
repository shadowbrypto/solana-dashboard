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
  const [isMovingRange, setIsMovingRange] = useState(false);
  const [moveStartOffset, setMoveStartOffset] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
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
    
    // Determine interval based on total months - more aggressive showing
    let interval = 1;
    if (totalMonths > 36) interval = 4; // Show every 4 months if > 3 years
    else if (totalMonths > 24) interval = 3; // Show every 3 months if > 2 years
    else if (totalMonths > 18) interval = 2; // Show every 2 months if > 1.5 years
    // Otherwise show every month (interval = 1)
    
    let currentDate = startOfMonth(effectiveMinDate);
    
    while (isBefore(currentDate, maxDate) && markers.length < 15) {
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


  return (
    <div className={`space-y-3 ${className}`}>
      {/* Clean header */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`text-sm font-medium ${tempRange ? 'text-primary' : 'text-foreground'}`}>
            {format(displayStartDate, 'MMM d')} - {format(displayEndDate, 'MMM d, yyyy')}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${tempRange ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/50'}`}>
            {displayDays} days
          </span>
        </div>
      </div>

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