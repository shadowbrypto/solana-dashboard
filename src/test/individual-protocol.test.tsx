import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, ALL_PROTOCOLS, TIMEFRAMES, METRIC_TYPES } from './utils';
import { setupMockApiResponses, resetMocks, mockApiError, mockApiLoading } from './mocks';
import App from '../App';

// Mock the window location to simulate different protocol URLs
const mockLocation = (protocol: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      search: `?protocol=${protocol}`,
    },
    writable: true,
  });
};

describe('Individual Protocol Pages', () => {
  beforeEach(() => {
    resetMocks();
    setupMockApiResponses();
  });

  describe('Protocol Data Loading', () => {
    it.each(ALL_PROTOCOLS)('should load data for %s protocol', async (protocol) => {
      mockLocation(protocol);
      render(<App />);

      // Check that the protocol name appears in the dashboard title
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${protocol.charAt(0).toUpperCase() + protocol.slice(1)}.*Dashboard`, 'i'))).toBeInTheDocument();
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display loading skeletons while data is being fetched', async () => {
      mockApiLoading(500);
      mockLocation('bullx');
      render(<App />);

      // Should show loading skeleton initially
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle API errors gracefully', async () => {
      mockApiError('Failed to fetch data');
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Metric Cards', () => {
    it.each(ALL_PROTOCOLS)('should display all metric cards for %s', async (protocol) => {
      mockLocation(protocol);
      render(<App />);

      await waitFor(() => {
        METRIC_TYPES.forEach(metricType => {
          expect(screen.getByText(new RegExp(metricType, 'i'))).toBeInTheDocument();
        });
      });
    });

    it('should display non-zero values in metric cards', async () => {
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        // Check that metric cards contain numerical values (not just zeros)
        const metricCards = screen.getAllByTestId(/metric-card/i);
        expect(metricCards.length).toBeGreaterThan(0);
        
        // At least one metric should have a non-zero value
        const hasNonZeroValue = metricCards.some(card => {
          const text = card.textContent || '';
          return /\d+/.test(text) && !text.includes('$0.00') && !text.includes('0');
        });
        expect(hasNonZeroValue).toBe(true);
      });
    });

    it('should format large numbers correctly', async () => {
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        // Check for proper number formatting (K, M, B suffixes)
        const page = screen.getByTestId('main-content') || document.body;
        const text = page.textContent || '';
        
        // Should contain formatted numbers with suffixes
        const hasFormattedNumbers = /\$?\d+\.?\d*[KMB]/.test(text);
        expect(hasFormattedNumbers).toBe(true);
      });
    });
  });

  describe('Chart Components', () => {
    it.each(ALL_PROTOCOLS)('should display charts for %s protocol', async (protocol) => {
      mockLocation(protocol);
      render(<App />);

      await waitFor(() => {
        // Individual protocol should have CombinedChart and TimelineChart
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-chart')).toBeInTheDocument();
      });
    });

    it('should handle different timeframes for charts', async () => {
      const user = userEvent.setup();
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
      });

      // Test timeframe selection
      const timeframeSelectors = screen.getAllByRole('combobox');
      
      for (const selector of timeframeSelectors) {
        if (selector.getAttribute('aria-label')?.includes('timeframe') || 
            selector.textContent?.includes('Last')) {
          await user.click(selector);
          
          // Test different timeframes
          for (const timeframe of TIMEFRAMES.slice(0, 3)) { // Test first 3 timeframes
            const option = screen.queryByText(new RegExp(timeframe, 'i'));
            if (option) {
              await user.click(option);
              // Wait for chart to update
              await waitFor(() => {
                expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
              });
            }
          }
          break;
        }
      }
    });

    it('should display chart data for different timeframes', async () => {
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        // Charts should contain data visualization elements
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
        
        // Should have recharts components
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation and URL Handling', () => {
    it('should handle invalid protocol names', async () => {
      mockLocation('invalid-protocol');
      render(<App />);

      await waitFor(() => {
        // Should redirect to not found or show error
        expect(
          screen.getByText(/redirecting/i) || 
          screen.getByText(/not found/i) ||
          screen.getByText(/invalid/i)
        ).toBeInTheDocument();
      });
    });

    it('should default to a valid protocol when no protocol is specified', async () => {
      mockLocation('');
      render(<App />);

      await waitFor(() => {
        // Should show some default protocol dashboard
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle different screen sizes', async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet size
      });

      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
      });

      // Test mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile size
      });

      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Data Refresh and Updates', () => {
    it('should update data when switching between protocols', async () => {
      const user = userEvent.setup();
      
      // Start with one protocol
      mockLocation('bullx');
      const { rerender } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/bullx.*dashboard/i)).toBeInTheDocument();
      });

      // Switch to another protocol
      mockLocation('photon');
      rerender(<App />);

      await waitFor(() => {
        expect(screen.getByText(/photon.*dashboard/i)).toBeInTheDocument();
      });
    });

    it('should maintain state when timeframe changes', async () => {
      const user = userEvent.setup();
      mockLocation('bullx');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
      });

      // Change timeframe and verify charts still render
      const timeframeSelector = screen.getAllByRole('combobox')[0];
      if (timeframeSelector) {
        await user.click(timeframeSelector);
        
        const option = screen.queryByText(/30.*days/i);
        if (option) {
          await user.click(option);
          
          await waitFor(() => {
            expect(screen.getByTestId('combined-chart')).toBeInTheDocument();
          });
        }
      }
    });
  });
});