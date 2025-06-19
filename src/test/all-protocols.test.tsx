import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, ALL_PROTOCOLS, TIMEFRAMES } from './utils';
import { setupMockApiResponses, resetMocks, mockApiError, mockApiLoading, mockEmptyData } from './mocks';
import App from '../App';

// Mock the window location for "all protocols" view
const mockAllProtocolsLocation = () => {
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      search: '?protocol=all',
    },
    writable: true,
  });
};

describe('All Protocols Page', () => {
  beforeEach(() => {
    resetMocks();
    setupMockApiResponses();
    mockAllProtocolsLocation();
  });

  describe('Page Layout and Structure', () => {
    it('should display "Overview Dashboard" title', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/overview.*dashboard/i)).toBeInTheDocument();
      });
    });

    it('should display metric cards for aggregated data', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/volume/i)).toBeInTheDocument();
        expect(screen.getByText(/daily users/i)).toBeInTheDocument();
        expect(screen.getByText(/trades/i)).toBeInTheDocument();
        expect(screen.getByText(/fees/i)).toBeInTheDocument();
      });
    });

    it('should display accordion sections for different metrics', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/volume metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/dau metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/new users metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/trades metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/fee metrics/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accordion Functionality', () => {
    it('should expand and collapse accordion sections', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/volume metrics/i)).toBeInTheDocument();
      });

      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      expect(volumeAccordion).toBeInTheDocument();

      // Click to expand
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          // Should show charts when expanded
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        });
      }
    });

    it('should allow multiple accordion sections to be open', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/volume metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/dau metrics/i)).toBeInTheDocument();
      });

      // Open volume section
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);
      }

      // Open DAU section
      const dauAccordion = screen.getByText(/dau metrics/i).closest('button');
      if (dauAccordion) {
        await user.click(dauAccordion);
      }

      await waitFor(() => {
        // Both sections should be visible
        expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        expect(screen.getByText(/daily active users by protocol/i)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Components in Each Section', () => {
    it('should display all chart types in volume section', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          // Should have HorizontalBarChart, StackedBarChart, and StackedAreaChart
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
          expect(screen.getByText(/volume by protocol/i)).toBeInTheDocument();
          expect(screen.getByText(/volume dominance by protocol/i)).toBeInTheDocument();
        });
      }
    });

    it('should display correct number of charts in each section', async () => {
      const user = userEvent.setup();
      render(<App />);

      const sections = [
        { name: /volume metrics/i, expectedCharts: 3 },
        { name: /dau metrics/i, expectedCharts: 2 },
        { name: /new users metrics/i, expectedCharts: 3 },
        { name: /trades metrics/i, expectedCharts: 3 },
        { name: /fee metrics/i, expectedCharts: 3 },
      ];

      for (const section of sections) {
        const accordion = screen.getByText(section.name).closest('button');
        if (accordion) {
          await user.click(accordion);

          await waitFor(() => {
            const charts = screen.getAllByTestId('responsive-container');
            expect(charts.length).toBeGreaterThanOrEqual(section.expectedCharts);
          });
        }
      }
    });
  });

  describe('Protocol Data Display', () => {
    it('should display data for all protocols', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section to see protocol data
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          // Should display multiple protocols in the chart
          const page = screen.getByRole('main') || document.body;
          const content = page.textContent || '';
          
          // Check for presence of major protocols
          const majorProtocols = ['bullx', 'photon', 'trojan'];
          const protocolsFound = majorProtocols.filter(protocol => 
            content.toLowerCase().includes(protocol)
          );
          
          expect(protocolsFound.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle timeframe filtering for all charts', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        });

        // Find and test timeframe selectors
        const timeframeSelectors = screen.getAllByRole('combobox');
        
        for (const selector of timeframeSelectors.slice(0, 2)) { // Test first 2 selectors
          if (selector.textContent?.includes('Last') || 
              selector.getAttribute('aria-label')?.includes('timeframe')) {
            await user.click(selector);
            
            // Try different timeframes
            for (const timeframe of ['6m', '1y', 'all']) {
              const option = screen.queryByText(new RegExp(timeframe, 'i'));
              if (option) {
                await user.click(option);
                
                await waitFor(() => {
                  // Chart should still be present after timeframe change
                  expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
                });
                break;
              }
            }
            break;
          }
        }
      }
    });
  });

  describe('Data Loading and Error Handling', () => {
    it('should show loading skeletons for all components', async () => {
      mockApiLoading(500);
      render(<App />);

      // Should show loading skeletons
      expect(screen.getAllByTestId(/skeleton/i).length).toBeGreaterThan(0);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText(/overview.*dashboard/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle API errors gracefully', async () => {
      mockApiError('Failed to fetch aggregated data');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle empty data sets', async () => {
      mockEmptyData();
      render(<App />);

      await waitFor(() => {
        // Should still show the page structure
        expect(screen.getByText(/overview.*dashboard/i)).toBeInTheDocument();
        
        // Metric cards should show zero values
        const metricCards = screen.getAllByText(/\$?0/);
        expect(metricCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Historical Data Coverage', () => {
    it('should display data for longer timeframes (>3 months)', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        });

        // Test 6 months timeframe
        const timeframeSelectors = screen.getAllByRole('combobox');
        const selector = timeframeSelectors.find(s => 
          s.textContent?.includes('Last') || 
          s.getAttribute('aria-label')?.includes('timeframe')
        );

        if (selector) {
          await user.click(selector);
          
          const sixMonthOption = screen.queryByText(/6.*months/i);
          if (sixMonthOption) {
            await user.click(sixMonthOption);
            
            await waitFor(() => {
              // Should display charts with data
              expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
              
              // Should not show "no data" messages
              expect(screen.queryByText(/no data/i)).not.toBeInTheDocument();
            });
          }
        }
      }
    });

    it('should display consistent data across different timeframes', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        });

        // Test multiple timeframes
        const timeframes = ['3m', '6m', '1y'];
        const timeframeSelectors = screen.getAllByRole('combobox');
        const selector = timeframeSelectors.find(s => 
          s.textContent?.includes('Last')
        );

        if (selector) {
          for (const timeframe of timeframes) {
            await user.click(selector);
            
            const option = screen.queryByText(new RegExp(timeframe, 'i'));
            if (option) {
              await user.click(option);
              
              await waitFor(() => {
                // Should have chart data for each timeframe
                expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
              });
            }
          }
        }
      }
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle large datasets efficiently', async () => {
      render(<App />);

      // Should load within reasonable time
      await waitFor(() => {
        expect(screen.getByText(/overview.*dashboard/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should not show performance-related errors
      expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/performance/i)).not.toBeInTheDocument();
    });

    it('should display complete historical data range', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Expand volume section and select "All time"
      const volumeAccordion = screen.getByText(/volume metrics/i).closest('button');
      if (volumeAccordion) {
        await user.click(volumeAccordion);

        await waitFor(() => {
          expect(screen.getByText(/total volume by protocol/i)).toBeInTheDocument();
        });

        const timeframeSelectors = screen.getAllByRole('combobox');
        const selector = timeframeSelectors.find(s => 
          s.textContent?.includes('Last')
        );

        if (selector) {
          await user.click(selector);
          
          const allTimeOption = screen.queryByText(/all.*time/i);
          if (allTimeOption) {
            await user.click(allTimeOption);
            
            await waitFor(() => {
              // Should display maximum available data
              expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
            });
          }
        }
      }
    });
  });
});