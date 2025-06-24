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

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i); // 5 years before and after current year

export function MonthPicker({ date, onDateChange }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(date.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(date.getFullYear());

  const handleMonthChange = (month: string) => {
    setSelectedMonth(parseInt(month));
    const newDate = new Date(selectedYear, parseInt(month), 1);
    onDateChange(newDate);
    setOpen(false);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year));
    const newDate = new Date(parseInt(year), selectedMonth, 1);
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
      <PopoverContent className="w-[240px] p-3" align="start">
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month.slice(0, 3)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}