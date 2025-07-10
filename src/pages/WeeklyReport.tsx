import React, { useState } from 'react';
import { WeeklyMetricsTable } from '../components/WeeklyMetricsTable';
import { getMutableAllCategories, getMutableProtocolsByCategory } from '../lib/protocol-config';
import { Protocol } from '../types/protocol';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isAfter, isBefore, subWeeks, subDays } from 'date-fns';

export default function WeeklyReport() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Date validation - ensure we start with a valid date (excluding today)
  const getValidInitialDate = () => {
    const yesterday = subDays(new Date(), 1); // Start with yesterday since today is excluded
    const minDate = new Date('2024-01-01');
    const maxDate = subDays(new Date(), 1); // Yesterday is the latest allowed date
    
    // If yesterday is valid, use it
    if (!isBefore(yesterday, minDate) && !isAfter(yesterday, maxDate)) {
      return yesterday;
    }
    
    // If yesterday is too early, use min date
    if (isBefore(yesterday, minDate)) {
      return minDate;
    }
    
    // If yesterday is too late (shouldn't happen), use max date
    return maxDate;
  };
  
  const [selectedEndDate, setSelectedEndDate] = useState(getValidInitialDate());

  // Get all protocols for the table
  const protocols: Protocol[] = [];
  getMutableAllCategories().forEach(categoryName => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    categoryProtocols.forEach(p => {
      if (!protocols.includes(p.id as Protocol)) {
        protocols.push(p.id as Protocol);
      }
    });
  });

  const handleDateChange = (newEndDate: Date) => {
    const minDate = new Date('2024-01-01');
    const maxDate = subDays(new Date(), 1); // Yesterday is the latest allowed date
    
    // Validate the new date is within acceptable range
    if (isBefore(newEndDate, minDate) || isAfter(newEndDate, maxDate)) {
      return; // Don't allow invalid dates
    }
    
    setSelectedEndDate(newEndDate);
  };

  const startDate = subDays(selectedEndDate, 6);
  const endDate = selectedEndDate;

  return (
    <div className="p-2 sm:p-4 lg:p-4">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl text-foreground text-center font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Weekly Report
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Weekly Metrics Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <WeeklyMetricsTable 
          protocols={protocols} 
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      )}
    </div>
  );
}