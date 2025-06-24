import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MonthPickerProps {
  date: Date;
  onDateChange: (date: Date | undefined) => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth();

// Define data availability range - adjust these based on your actual data
const DATA_START_YEAR = 2023;
const DATA_START_MONTH = 0; // January (0-indexed) - change to actual first month with data

// Generate available years (from data start to current year)
const years = Array.from({ length: currentYear - DATA_START_YEAR + 1 }, (_, i) => DATA_START_YEAR + i);

export function MonthPicker({ date, onDateChange }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(date.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(date.getFullYear());

  // Helper function to check if a month/year combination is valid
  const isMonthYearValid = (month: number, year: number) => {
    // Future dates are invalid
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return false;
    }
    
    // Dates before data availability are invalid
    if (year < DATA_START_YEAR || (year === DATA_START_YEAR && month < DATA_START_MONTH)) {
      return false;
    }
    
    return true;
  };

  // Get available months for the selected year
  const getAvailableMonths = (year: number) => {
    return months.map((month, index) => ({
      value: index,
      label: month.slice(0, 3),
      disabled: !isMonthYearValid(index, year)
    }));
  };

  // Get available years
  const getAvailableYears = () => {
    return years.map(year => ({
      value: year,
      label: year.toString(),
      disabled: false // All years in the range are valid
    }));
  };

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month);
    setSelectedMonth(newMonth);
    
    // Only update if the combination is valid
    if (isMonthYearValid(newMonth, selectedYear)) {
      const newDate = new Date(selectedYear, newMonth, 1);
      onDateChange(newDate);
      setOpen(false);
    }
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    
    // Check if current month is valid for new year, if not, select the latest valid month
    let validMonth = selectedMonth;
    if (!isMonthYearValid(selectedMonth, newYear)) {
      // Find the latest valid month for this year
      for (let m = currentYear === newYear ? currentMonth : 11; m >= 0; m--) {
        if (isMonthYearValid(m, newYear)) {
          validMonth = m;
          break;
        }
      }
    }
    
    setSelectedMonth(validMonth);
    const newDate = new Date(newYear, validMonth, 1);
    onDateChange(newDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full sm:w-[180px] justify-between text-left font-normal h-9",
            !date && "text-muted-foreground"
          )}
        >
          <span className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMM yyyy") : "Select month"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-2" align="start">
        <div className="grid grid-cols-2 gap-1">
          <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableMonths(selectedYear).map((month) => (
                <SelectItem 
                  key={month.value} 
                  value={month.value.toString()}
                  disabled={month.disabled}
                  className={month.disabled ? "text-muted-foreground/50" : ""}
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableYears().map((year) => (
                <SelectItem 
                  key={year.value} 
                  value={year.value.toString()}
                  disabled={year.disabled}
                  className={year.disabled ? "text-muted-foreground/50" : ""}
                >
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}