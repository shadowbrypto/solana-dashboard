import React, { useState, useRef, useEffect } from 'react';
import { cn, formatCurrency } from '../lib/utils';
import { TrendingUp, Target, RotateCcw } from 'lucide-react';

interface PercentageWheelProps {
  value: number;
  onChange: (value: number) => void;
  axiomRevenue: number;
  className?: string;
}

export function PercentageWheel({ value, onChange, axiomRevenue, className }: PercentageWheelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Generate percentage options
  const percentages = Array.from({ length: 100 }, (_, i) => i + 1);
  
  // Calculate which percentage should be centered
  const centerIndex = value - 1;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.clientY;
    const sensitivity = 2.5; // How many pixels to move for 1% change
    const newValue = Math.max(1, Math.min(100, startValue + Math.round(deltaY / sensitivity)));
    
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newValue = Math.max(1, Math.min(100, value + delta));
    onChange(newValue);
  };

  const resetToDefault = () => {
    onChange(50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, value, startY, startValue]);

  const missedRevenue = axiomRevenue * (value / 100);

  return (
    <div className={cn("flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-muted/30 to-background border border-border/60 rounded-xl shadow-lg h-fit", className)}>
      {/* Compact Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Target className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xs font-semibold text-foreground">Revenue Share</h3>
        </div>
        
        {/* Compact percentage display */}
        <div className="relative">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {value}%
          </div>
          <div className="absolute -top-0.5 -right-0.5">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-purple-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Compact Wheel Container */}
      <div className="relative">
        {/* Decorative frame */}
        <div className="absolute -inset-1.5 bg-gradient-to-b from-primary/20 via-transparent to-primary/20 rounded-xl" />
        <div className="absolute -inset-0.5 bg-gradient-to-b from-background via-muted/40 to-background rounded-lg" />
        
        {/* Main wheel */}
        <div
          ref={wheelRef}
          className={cn(
            "relative w-16 h-24 bg-gradient-to-b from-background via-muted/20 to-background",
            "border-2 border-border/80 rounded-lg overflow-hidden",
            "shadow-xl cursor-grab select-none transition-all duration-200",
            "hover:shadow-primary/20 hover:border-primary/40",
            isDragging && "cursor-grabbing scale-105 shadow-primary/30"
          )}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {/* Center selection area */}
          <div className="absolute inset-x-1.5 top-1/2 transform -translate-y-1/2 h-5 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-md z-10 pointer-events-none" />
          
          {/* Center line indicator */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary via-primary to-transparent z-20 pointer-events-none" />
          
          {/* Selection arrows */}
          <div className="absolute left-0.5 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none">
            <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[4px] border-transparent border-l-primary" />
          </div>
          <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none">
            <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-r-[4px] border-transparent border-r-primary" />
          </div>

          {/* Scrolling numbers */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-100 ease-out"
            style={{
              transform: `translateY(${(50 - centerIndex) * 16}px)`,
            }}
          >
            {percentages.map((percentage, index) => {
              const distance = Math.abs(index - centerIndex);
              const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : 0.1;
              const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;
              const fontWeight = distance === 0 ? 'font-bold' : distance === 1 ? 'font-semibold' : 'font-medium';
              
              return (
                <div
                  key={percentage}
                  className={cn(
                    "flex-shrink-0 h-4 flex items-center justify-center text-xs transition-all duration-100",
                    fontWeight,
                    distance === 0 ? "text-primary" : "text-muted-foreground"
                  )}
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  {percentage}
                </div>
              );
            })}
          </div>

          {/* Enhanced gradient overlays */}
          <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-30" />
          <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30" />
        </div>

        {/* Side indicators */}
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
          <div className="w-1.5 h-8 bg-gradient-to-b from-primary/30 via-primary to-primary/30 rounded-full shadow-md" />
        </div>
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-1.5 h-8 bg-gradient-to-b from-primary/30 via-primary to-primary/30 rounded-full shadow-md" />
        </div>
      </div>

      {/* Compact Revenue Display */}
      <div className="text-center space-y-2 min-w-0">
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-wide">
            Missed Revenue
          </div>
          <div className="text-sm font-bold text-foreground">
            {formatCurrency(missedRevenue)}
          </div>
        </div>
        
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground/60">
            From {formatCurrency(axiomRevenue)}
          </div>
          {value !== 50 && (
            <div className="flex items-center justify-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-2.5 h-2.5" />
              {value > 50 ? 'Aggressive' : 'Conservative'}
            </div>
          )}
        </div>
      </div>

      {/* Compact Controls */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div className="text-center">
          <div>Scroll or drag</div>
        </div>
        
        {value !== 50 && (
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span className="text-[9px]">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}