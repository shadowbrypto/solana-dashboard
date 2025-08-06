import React from 'react';

export type TimeFrame = "1d" | "7d" | "30d" | "90d" | "3m" | "6m" | "1y" | "all";

interface TimeframeSelectorProps {
  value: TimeFrame;
  onChange: (timeframe: TimeFrame) => void;
  options?: TimeFrame[];
  className?: string;
}

export function TimeframeSelector({ 
  value, 
  onChange, 
  options = ["7d", "30d", "3m", "6m", "1y", "all"],
  className = ""
}: TimeframeSelectorProps) {
  const optionLabels: Record<string, string> = {
    "1d": "1d",
    "7d": "7d", 
    "30d": "30d",
    "90d": "90d",
    "3m": "3m",
    "6m": "6m",
    "1y": "1y",
    "all": "All"
  };

  const currentIndex = options.indexOf(value);
  const buttonCount = options.length;

  return (
    <div className={`relative inline-flex items-center rounded-lg bg-muted p-1 ${className}`}>
      {/* Sliding background indicator */}
      <div 
        className="absolute bg-background rounded-md shadow-sm transition-all duration-300 ease-out"
        style={{
          width: `calc(${100 / buttonCount}% - ${4 * (buttonCount - 1) / buttonCount}px)`,
          height: 'calc(100% - 8px)',
          top: '4px',
          left: `calc(${currentIndex * (100 / buttonCount)}% + 4px)`,
        }}
      />
      {/* Time period buttons */}
      <div className="relative z-10 flex items-center w-full">
        {options.map((period) => (
          <button
            key={period}
            onClick={() => onChange(period)}
            className={`flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              value === period
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {optionLabels[period]}
          </button>
        ))}
      </div>
    </div>
  );
}