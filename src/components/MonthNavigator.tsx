import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths, format, isAfter, isBefore, endOfMonth } from "date-fns";
import { MonthPicker } from "./MonthPicker";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface MonthNavigatorProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function MonthNavigator({ 
  date, 
  onDateChange, 
  className,
  minDate = new Date("2023-01-01"), // Earliest data availability
  maxDate = endOfMonth(new Date()) // End of current month
}: MonthNavigatorProps) {
  
  const handlePreviousMonth = () => {
    const newDate = subMonths(date, 1);
    if (!isBefore(newDate, minDate)) {
      onDateChange(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = addMonths(date, 1);
    if (!isAfter(newDate, maxDate)) {
      onDateChange(newDate);
    }
  };

  const handleMonthPickerChange = (selectedDate?: Date) => {
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  // Check if navigation buttons should be disabled
  const isPreviousDisabled = isBefore(subMonths(date, 1), minDate);
  const isNextDisabled = isAfter(addMonths(date, 1), maxDate);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Previous Month Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousMonth}
        disabled={isPreviousDisabled}
        className={cn(
          "h-9 w-9 p-0 flex items-center justify-center transition-all duration-200",
          isPreviousDisabled 
            ? "opacity-40 cursor-not-allowed" 
            : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        )}
        title={isPreviousDisabled ? `Cannot go before ${format(minDate, 'MMM yyyy')}` : "Previous month"}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Month Picker */}
      <div className="min-w-[180px]">
        <MonthPicker 
          date={date} 
          onDateChange={handleMonthPickerChange}
        />
      </div>

      {/* Next Month Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextMonth}
        disabled={isNextDisabled}
        className={cn(
          "h-9 w-9 p-0 flex items-center justify-center transition-all duration-200",
          isNextDisabled 
            ? "opacity-40 cursor-not-allowed" 
            : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        )}
        title={isNextDisabled ? `Cannot go beyond ${format(maxDate, 'MMM yyyy')}` : "Next month"}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}