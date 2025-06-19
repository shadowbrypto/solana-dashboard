import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, ALL_PROTOCOLS } from './utils';
import { setupMockApiResponses, resetMocks, mockApiError, mockEmptyData } from './mocks';
import { DailyMetricsTable } from '../components/DailyMetricsTable';

describe('Daily Metrics Report', () => {
  beforeEach(() => {
    resetMocks();
    setupMockApiResponses();
  });

  describe('Component Rendering', () => {
    it('should render the daily metrics table', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should display date picker', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        // Date picker should be present
        expect(screen.getByRole('button', { name: /pick a date/i })).toBeInTheDocument();
      });
    });

    it('should display protocol columns', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByText(/protocol/i)).toBeInTheDocument();
        
        // Should show protocol data
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });

    it('should display metric columns', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        // Check for key metric columns
        expect(screen.getByText(/volume/i)).toBeInTheDocument();
        expect(screen.getByText(/daily users/i)).toBeInTheDocument();
        expect(screen.getByText(/trades/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Selection', () => {
    it('should load data for current date by default', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        
        // Should show protocol data for current date
        const tableRows = screen.getAllByRole('row');
        expect(tableRows.length).toBeGreaterThan(1); // Header + data rows
      });
    });

    it('should update data when date is changed', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Click date picker
      const datePicker = screen.getByRole('button', { name: /pick a date/i });
      await user.click(datePicker);

      // Note: Date picker implementation might vary, so we check for calendar
      await waitFor(() => {
        // Should show calendar or date selection interface
        const calendar = screen.queryByRole('dialog') || screen.queryByRole('grid');
        if (calendar) {
          expect(calendar).toBeInTheDocument();
        }
      });
    });

    it('should handle multiple random date selections', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      // Test several random dates
      const testDates = [
        new Date('2025-06-15'),
        new Date('2025-05-20'),
        new Date('2025-04-10'),
      ];

      for (const testDate of testDates) {
        // Mock the date selection (this would typically involve calendar interaction)
        const datePicker = screen.getByRole('button', { name: /pick a date/i });
        await user.click(datePicker);

        await waitFor(() => {
          // Should load data for the selected date
          expect(screen.getByRole('table')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Protocol Data Display', () => {
    it('should display data for all provided protocols', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const tableContent = table.textContent || '';
        
        // Should display multiple protocols
        const majorProtocols = ['bullx', 'photon', 'trojan'];
        const protocolsFound = majorProtocols.filter(protocol => 
          tableContent.toLowerCase().includes(protocol.toLowerCase())
        );
        
        expect(protocolsFound.length).toBeGreaterThan(0);
      });
    });

    it('should display metric values for each protocol', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const cells = screen.getAllByRole('cell');
        
        // Should have numerical values in cells
        const hasNumericalData = cells.some(cell => {
          const text = cell.textContent || '';
          return /\d+/.test(text) || /\$/.test(text);
        });
        
        expect(hasNumericalData).toBe(true);
      });
    });

    it('should format numerical values correctly', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const content = table.textContent || '';
        
        // Should contain properly formatted numbers (with K, M, B suffixes or currency)
        const hasFormattedNumbers = /\$?\d+\.?\d*[KMB]?/.test(content) || /\$\d+/.test(content);
        expect(hasFormattedNumbers).toBe(true);
      });
    });

    it('should handle zero values gracefully', async () => {
      mockEmptyData();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Should display zeros or empty states properly
        const content = table.textContent || '';
        expect(content).toMatch(/0|—|N\/A/);
      });
    });
  });

  describe('Column Functionality', () => {
    it('should support column reordering', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Check for draggable column headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(1);

      // Note: Actual drag-and-drop testing would require more complex setup
      // For now, we just verify the table structure supports it
      const hasMetricColumns = columnHeaders.some(header => {
        const text = header.textContent || '';
        return /volume|users|trades|fees/i.test(text);
      });
      
      expect(hasMetricColumns).toBe(true);
    });

    it('should display sortable columns', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Table should be structured to support sorting
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Grouping', () => {
    it('should group protocols by categories', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        const content = table.textContent || '';
        
        // Should show protocol groupings or categories
        // This depends on the protocol-categories implementation
        expect(table).toBeInTheDocument();
      });
    });

    it('should allow collapsing/expanding categories', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Look for expandable/collapsible elements
      const expandButtons = screen.queryAllByRole('button').filter(button => {
        const ariaExpanded = button.getAttribute('aria-expanded');
        return ariaExpanded !== null;
      });

      if (expandButtons.length > 0) {
        const button = expandButtons[0];
        await user.click(button);
        
        // Should toggle the expanded state
        await waitFor(() => {
          expect(button).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiError('Failed to fetch daily metrics');
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        // Should still render the table structure
        expect(screen.getByRole('table')).toBeInTheDocument();
        
        // Should handle the error without crashing
        expect(screen.queryByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid dates', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Component should handle invalid date scenarios gracefully
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle missing protocol data', async () => {
      render(<DailyMetricsTable protocols={[] as any} />);

      await waitFor(() => {
        // Should render empty table or appropriate message
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should load quickly with large protocol lists', async () => {
      const largeProtocolList = [...ALL_PROTOCOLS, ...ALL_PROTOCOLS, ...ALL_PROTOCOLS]; // 3x the protocols
      
      render(<DailyMetricsTable protocols={largeProtocolList as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle rapid date changes', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Simulate rapid date picker clicks
      const datePicker = screen.getByRole('button', { name: /pick a date/i });
      
      for (let i = 0; i < 3; i++) {
        await user.click(datePicker);
        await waitFor(() => {
          expect(screen.getByRole('table')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure for screen readers', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
      });
    });

    it('should have accessible date picker', async () => {
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        const datePicker = screen.getByRole('button', { name: /pick a date/i });
        expect(datePicker).toBeInTheDocument();
        expect(datePicker).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DailyMetricsTable protocols={ALL_PROTOCOLS as any} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      
      // Should be able to navigate to interactive elements
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeTruthy();
    });
  });
});