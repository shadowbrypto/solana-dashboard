import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Settings } from '../lib/settings';
import { Database, Globe } from 'lucide-react';

interface DataTypeIndicatorProps {
  className?: string;
}

export const DataTypeIndicator: React.FC<DataTypeIndicatorProps> = ({ className = '' }) => {
  const [dataType, setDataType] = useState<'public' | 'private'>(Settings.getDataTypePreference());

  useEffect(() => {
    const unsubscribe = Settings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
    });
    return unsubscribe;
  }, []);

  const isPrivate = dataType === 'private';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isPrivate ? 'default' : 'secondary'}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${
          isPrivate 
            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
            : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
        }`}
      >
        {isPrivate ? (
          <Database className="w-3 h-3" />
        ) : (
          <Globe className="w-3 h-3" />
        )}
        <span>{isPrivate ? 'Private' : 'Public'} Data</span>
      </Badge>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {isPrivate ? 'Paid Analytics' : 'Free Analytics'}
      </span>
    </div>
  );
};