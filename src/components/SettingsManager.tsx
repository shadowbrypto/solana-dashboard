import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Settings, settingsManager } from '../lib/settings';
import { Download, Upload, RotateCcw, Eye, EyeOff } from 'lucide-react';

export function SettingsManager() {
  const [isVisible, setIsVisible] = useState(false);
  const [exportData, setExportData] = useState<string>('');

  const handleExportSettings = () => {
    const settings = settingsManager.exportSettings();
    const dataStr = JSON.stringify(settings, null, 2);
    setExportData(dataStr);
    
    // Download as file
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solana-dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        settingsManager.importSettings(settings);
        alert('Settings imported successfully! Please refresh the page to see changes.');
      } catch (error) {
        alert('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
      settingsManager.resetAllSettings();
      alert('All settings have been reset to default! Please refresh the page to see changes.');
    }
  };

  const getCurrentSettings = () => {
    return {
      'Accordion State': Settings.getAccordionState(),
      'Daily Table Hidden Protocols': Settings.getDailyTableHiddenProtocols(),
      'Weekly Heatmap Hidden Protocols': Settings.getWeeklyHeatmapHiddenProtocols(),
      'Daily Table Collapsed Categories': Settings.getDailyTableCollapsedCategories(),
      'Sidebar Expanded Categories': Object.keys(Settings.getSidebarExpandedCategories()).filter(key => 
        Settings.getSidebarExpandedCategories()[key]
      ),
      'Daily Table Column Order': Settings.getDailyTableColumnOrder(),
      'Protocol Data Table Metric': Settings.getProtocolDataTableMetric(),
      'Weekly Heatmap Metric': Settings.getWeeklyHeatmapMetric(),
      'Dashboard Active View': Settings.getDashboardActiveView(),
      'Last Selected Dates': Settings.getLastSelectedDates(),
    };
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Settings
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Settings Manager</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSettings}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div className="flex-1 relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => document.getElementById('settings-file-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input
              id="settings-file-input"
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetAllSettings}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Settings:</h4>
          {Object.entries(getCurrentSettings()).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{key}:</p>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(value) ? (
                  value.length > 0 ? (
                    value.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">Empty</Badge>
                  )
                ) : typeof value === 'object' ? (
                  <Badge variant="secondary" className="text-xs">
                    {JSON.stringify(value)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {String(value)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {exportData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Exported Data:</h4>
            <textarea
              className="w-full h-24 text-xs font-mono p-2 border rounded"
              value={exportData}
              readOnly
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}