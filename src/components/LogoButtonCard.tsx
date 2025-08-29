import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface LogoButtonData {
  id: string;
  logo: string; // Logo URL or icon
  value: number;
  label: string;
}

interface LogoButtonCardProps {
  title: string;
  defaultValue: number;
  buttons: LogoButtonData[];
  formatValue?: (value: number) => string;
  className?: string;
}

export function LogoButtonCard({ 
  title, 
  defaultValue, 
  buttons, 
  formatValue = (val) => val.toLocaleString(),
  className 
}: LogoButtonCardProps) {
  const [selectedButton, setSelectedButton] = useState<string | null>('solana');
  const [currentValue, setCurrentValue] = useState(() => {
    const solanaButton = buttons.find(b => b.id === 'solana');
    return solanaButton ? solanaButton.value : defaultValue;
  });

  const handleButtonClick = (buttonId: string, value: number) => {
    setSelectedButton(buttonId);
    setCurrentValue(value);
  };

  const handleReset = () => {
    setSelectedButton(null);
    setCurrentValue(defaultValue);
  };

  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-sm text-muted-foreground">
          {title}
        </CardDescription>
        <CardTitle 
          className="text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary transition-colors"
          onClick={handleReset}
          title="Click to reset"
        >
          {formatValue(currentValue)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 pb-4 flex flex-col justify-between h-[100px]">
        <div className="flex-1 min-h-0"></div>
        <div className="flex gap-2 justify-start">
          {buttons.map((button) => (
            <Button
              key={button.id}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 rounded-lg p-0 flex items-center justify-center transition-colors border",
                // Active/selected state - darker background with darker border
                selectedButton === button.id && button.id === 'solana' && "bg-purple-200 border-purple-500 dark:bg-purple-800/30 dark:border-purple-500",
                selectedButton === button.id && button.id === 'ethereum' && "bg-blue-200 border-blue-500 dark:bg-blue-800/30 dark:border-blue-500", 
                selectedButton === button.id && button.id === 'bsc' && "bg-yellow-200 border-yellow-500 dark:bg-yellow-800/30 dark:border-yellow-500",
                // Default and hover states - transparent border
                selectedButton !== button.id && button.id === 'solana' && "bg-purple-100 hover:bg-purple-200 border-transparent dark:bg-purple-900/20 dark:hover:bg-purple-800/30",
                selectedButton !== button.id && button.id === 'ethereum' && "bg-blue-100 hover:bg-blue-200 border-transparent dark:bg-blue-900/20 dark:hover:bg-blue-800/30",
                selectedButton !== button.id && button.id === 'bsc' && "bg-yellow-100 hover:bg-yellow-200 border-transparent dark:bg-yellow-900/20 dark:hover:bg-yellow-800/30",
                selectedButton === button.id && button.id === 'base' && "bg-blue-200 border-blue-500 dark:bg-blue-800/30 dark:border-blue-500",
                selectedButton !== button.id && button.id === 'base' && "bg-blue-100 hover:bg-blue-200 border-transparent dark:bg-blue-900/20 dark:hover:bg-blue-800/30"
              )}
              onClick={() => handleButtonClick(button.id, button.value)}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <img 
                  src={button.logo} 
                  alt={button.label}
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2IiByeD0iNCIvPgo8L3N2Zz4K';
                  }}
                />
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}