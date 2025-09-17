import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, subDays, format, isAfter, isBefore } from "date-fns";
import { DatePicker } from "./DatePicker";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface DateNavigatorProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateNavigator({ 
  date, 
  onDateChange, 
  className,
  minDate = new Date("2024-01-01"),
  maxDate = new Date()
}: DateNavigatorProps) {
  
  const handlePreviousDay = () => {
    const newDate = subDays(date, 1);
    if (!isBefore(newDate, minDate)) {
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    const newDate = addDays(date, 1);
    if (!isAfter(newDate, maxDate)) {
      onDateChange(newDate);
    }
  };

  const handleDatePickerChange = (selectedDate?: Date) => {
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  // Check if navigation buttons should be disabled
  const isPreviousDisabled = isBefore(subDays(date, 1), minDate);
  const isNextDisabled = isAfter(addDays(date, 1), maxDate);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Previous Day Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousDay}
        disabled={isPreviousDisabled}
        className={cn(
          "h-9 w-9 p-0 flex items-center justify-center transition-all duration-200",
          isPreviousDisabled 
            ? "opacity-40 cursor-not-allowed" 
            : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        )}
        title={isPreviousDisabled ? `Cannot go before ${format(minDate, 'MMM dd, yyyy')}` : "Previous day"}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Picker */}
      <div className="min-w-[200px]">
        <DatePicker 
          date={date} 
          onDateChange={handleDatePickerChange}
        />
      </div>

      {/* Next Day Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextDay}
        disabled={isNextDisabled}
        className={cn(
          "h-9 w-9 p-0 flex items-center justify-center transition-all duration-200",
          isNextDisabled 
            ? "opacity-40 cursor-not-allowed" 
            : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        )}
        title={isNextDisabled ? `Cannot go beyond ${format(maxDate, 'MMM dd, yyyy')}` : "Next day"}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}