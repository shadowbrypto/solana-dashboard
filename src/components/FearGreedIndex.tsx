import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface FearGreedIndexProps {
  value: number; // 0-100
  className?: string;
}

export function FearGreedIndex({ value, className }: FearGreedIndexProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // Calculate angle for dot position (0 = left side, 180 = right side)
  const angle = (clampedValue / 100) * 180;
  
  // Determine color and label based on value
  const getColorAndLabel = (val: number) => {
    if (val <= 25) return { color: '#ef4444', label: 'Extreme Fear' };
    if (val <= 45) return { color: '#f97316', label: 'Fear' };
    if (val <= 55) return { color: '#eab308', label: 'Neutral' };
    if (val <= 75) return { color: '#22c55e', label: 'Greed' };
    return { color: '#16a34a', label: 'Extreme Greed' };
  };
  
  const { color, label } = getColorAndLabel(clampedValue);
  
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-sm text-muted-foreground">
          Fear & Greed Index
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-0 pb-0">
        <div className="relative w-full h-28 flex items-center justify-center">
          {/* Semi-circular gradient background */}
          <svg
            width="200"
            height="120"
            viewBox="0 0 200 120"
            className="absolute"
          >
            <defs>
              {/* Gradient for the arc */}
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              {/* Shadow filter for dot */}
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
              </filter>
            </defs>
            
            {/* Background arc (gray) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              strokeLinecap="round"
            />
            
            {/* Colored arc segments */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            
            {/* Value indicator dot on the arc */}
            <circle
              cx={100 + 80 * Math.cos((180 - angle) * Math.PI / 180)}
              cy={100 + 80 * Math.sin((180 - angle) * Math.PI / 180)}
              r="4"
              fill="#1f2937"
              stroke="white"
              strokeWidth="2"
              filter="url(#dotShadow)"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
            <div className="text-3xl font-bold text-foreground">
              {Math.round(clampedValue)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}