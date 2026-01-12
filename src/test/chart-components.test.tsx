import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, generateMockProtocolStats, generateMockAggregatedData, TIMEFRAMES } from './utils';
import { setupMockApiResponses, resetMocks } from './mocks';

// Import chart components
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart';
import { StackedBarChart } from '../components/charts/StackedBarChart';
import { StackedAreaChart } from '../components/charts/StackedAreaChart';
import { CombinedChart } from '../components/charts/CombinedChart';
import { TimelineChart } from '../components/charts/TimelineChart';

describe('Chart Components Integration', () => {
  beforeEach(() => {
    resetMocks();
    setupMockApiResponses();
  });

  describe('HorizontalBarChart', () => {
    const mockData = [
      {
        name: 'BullX',
        value: 1000000,
        color: '#ff6b6b',
        values: [
          { value: 500000, date: '2025-06-19' },
          { value: 300000, date: '2025-06-18' },
          { value: 200000, date: '2025-06-17' },
        ],
      },
      {
        name: 'Photon',
        value: 800000,
        color: '#4ecdc4',
        values: [
          { value: 400000, date: '2025-06-19' },
          { value: 250000, date: '2025-06-18' },
          { value: 150000, date: '2025-06-17' },
        ],
      },
    ];

    it('should render with data', async () => {
      render(
        <HorizontalBarChart
          title="Test Chart"
          data={mockData}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton when loading', () => {
      render(
        <HorizontalBarChart
          title="Test Chart"
          data={[]}
          loading={true}
        />
      );

      expect(screen.getByTestId('horizontal-bar-chart-skeleton')).toBeInTheDocument();
    });

    it('should handle timeframe changes', async () => {
      const user = userEvent.setup();
      render(
        <HorizontalBarChart
          title="Test Chart"
          data={mockData}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chart')).toBeInTheDocument();
      });

      // Find timeframe selector
      const timeframeSelector = screen.getByRole('combobox');
      await user.click(timeframeSelector);

      // Select different timeframe
      const option = screen.getByText('Last 30 days');
      await user.click(option);

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should filter data correctly by timeframe', async () => {
      const user = userEvent.setup();
      const extendedData = [
        {
          name: 'BullX',
          value: 1000000,
          color: '#ff6b6b',
          values: [
            { value: 100000, date: '2025-06-19' },
            { value: 100000, date: '2025-05-19' },
            { value: 100000, date: '2025-04-19' },
            { value: 100000, date: '2025-03-19' },
            { value: 100000, date: '2025-02-19' },
            { value: 100000, date: '2024-12-19' },
          ],
        },
      ];

      render(
        <HorizontalBarChart
          title="Test Chart"
          data={extendedData}
          loading={false}
        />
      );

      // Test different timeframes
      const timeframes = ['7d', '30d', '3m', '6m', '1y'];
      
      for (const timeframe of timeframes) {
        const selector = screen.getByRole('combobox');
        await user.click(selector);
        
        const option = screen.queryByText(new RegExp(timeframe, 'i'));
        if (option) {
          await user.click(option);
          
          await waitFor(() => {
            expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
          });
        }
      }
    });

    it('should format values correctly', async () => {
      const dataWithLargeValues = [
        {
          name: 'BullX',
          value: 1500000000, // 1.5B
          color: '#ff6b6b',
          values: [{ value: 1500000000, date: '2025-06-19' }],
        },
      ];

      render(
        <HorizontalBarChart
          title="Test Chart"
          data={dataWithLargeValues}
          loading={false}
          valueFormatter={(value) => `$${(value / 1e9).toFixed(2)}B`}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        // Should format large numbers with B suffix
        expect(screen.getByText(/\$.*B/)).toBeInTheDocument();
      });
    });
  });

  describe('StackedBarChart', () => {
    const mockStackedData = generateMockAggregatedData(30);

    it('should render with stacked data', async () => {
      render(
        <StackedBarChart
          title="Stacked Test"
          data={mockStackedData}
          dataKeys={['bullx_volume', 'photon_volume', 'trojanonsolana_volume']}
          labels={['BullX', 'Photon', 'Trojan']}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Stacked Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle timeframe filtering', async () => {
      const user = userEvent.setup();
      render(
        <StackedBarChart
          title="Stacked Test"
          data={mockStackedData}
          dataKeys={['bullx_volume', 'photon_volume']}
          labels={['BullX', 'Photon']}
          loading={false}
        />
      );

      const timeframeSelector = screen.getByRole('combobox');
      await user.click(timeframeSelector);

      const option = screen.getByText('Last 7 days');
      await user.click(option);

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton', () => {
      render(
        <StackedBarChart
          title="Stacked Test"
          data={[]}
          dataKeys={['bullx_volume']}
          labels={['BullX']}
          loading={true}
        />
      );

      expect(screen.getByTestId('stacked-bar-chart-skeleton')).toBeInTheDocument();
    });
  });

  describe('StackedAreaChart', () => {
    const mockAreaData = generateMockAggregatedData(30);

    it('should render area chart', async () => {
      render(
        <StackedAreaChart
          title="Area Test"
          data={mockAreaData}
          keys={['bullx_dominance', 'photon_dominance']}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Area Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle dominance data (percentage values)', async () => {
      const dominanceData = [
        {
          formattedDay: '19-06-2025',
          bullx_dominance: 0.6,
          photon_dominance: 0.4,
        },
        {
          formattedDay: '18-06-2025',
          bullx_dominance: 0.55,
          photon_dominance: 0.45,
        },
      ];

      render(
        <StackedAreaChart
          title="Dominance Test"
          data={dominanceData}
          keys={['bullx_dominance', 'photon_dominance']}
          valueFormatter={(value) => `${(value * 100).toFixed(1)}%`}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Dominance Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton', () => {
      render(
        <StackedAreaChart
          title="Area Test"
          data={[]}
          keys={['test_key']}
          loading={true}
        />
      );

      expect(screen.getByTestId('stacked-area-chart-skeleton')).toBeInTheDocument();
    });
  });

  describe('CombinedChart', () => {
    const mockCombinedData = generateMockProtocolStats('bullx', 30);

    it('should render combined chart with volume and fees', async () => {
      render(
        <CombinedChart
          title="Combined Test"
          data={mockCombinedData}
          volumeKey="volume_usd"
          feesKey="fees_usd"
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Combined Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle custom labels for different metrics', async () => {
      render(
        <CombinedChart
          title="Custom Labels Test"
          data={mockCombinedData}
          volumeKey="daily_users"
          feesKey="new_users"
          barChartLabel="Daily Users"
          lineChartLabel="New Users"
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Labels Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton', () => {
      render(
        <CombinedChart
          title="Combined Test"
          data={[]}
          volumeKey="volume_usd"
          feesKey="fees_usd"
          loading={true}
        />
      );

      expect(screen.getByTestId('combined-chart-skeleton')).toBeInTheDocument();
    });
  });

  describe('TimelineChart', () => {
    const mockTimelineData = generateMockProtocolStats('bullx', 30);

    it('should render timeline chart', async () => {
      render(
        <TimelineChart
          title="Timeline Test"
          data={mockTimelineData}
          dataKey="trades"
          color="#ff6b6b"
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Timeline Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle different data keys', async () => {
      render(
        <TimelineChart
          title="Volume Timeline"
          data={mockTimelineData}
          dataKey="volume_usd"
          color="#4ecdc4"
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Volume Timeline')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton', () => {
      render(
        <TimelineChart
          title="Timeline Test"
          data={[]}
          dataKey="trades"
          color="#ff6b6b"
          loading={true}
        />
      );

      expect(screen.getByTestId('timeline-chart-skeleton')).toBeInTheDocument();
    });
  });

  describe('Chart Responsiveness', () => {
    it('should handle different screen sizes', async () => {
      // Mock different viewport sizes
      const originalInnerWidth = window.innerWidth;
      
      // Test mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <HorizontalBarChart
          title="Responsive Test"
          data={[{
            name: 'Test',
            value: 1000,
            values: [{ value: 1000, date: '2025-06-19' }],
          }]}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });

      // Test desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });

      // Restore original
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });
  });

  describe('Chart Data Validation', () => {
    it('should handle empty data gracefully', async () => {
      render(
        <HorizontalBarChart
          title="Empty Data Test"
          data={[]}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Empty Data Test')).toBeInTheDocument();
        // Should still render chart container
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = [
        {
          name: 'Invalid',
          value: null,
          values: [{ value: undefined, date: 'invalid-date' }],
        },
      ];

      render(
        <HorizontalBarChart
          title="Invalid Data Test"
          data={invalidData as any}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid Data Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should handle missing required props', async () => {
      render(
        <StackedBarChart
          title="Missing Props Test"
          data={[]}
          dataKeys={[]}
          labels={[]}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Missing Props Test')).toBeInTheDocument();
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Interactions', () => {
    it('should handle tooltip interactions', async () => {
      const user = userEvent.setup();
      render(
        <HorizontalBarChart
          title="Tooltip Test"
          data={[{
            name: 'Test Protocol',
            value: 1000000,
            values: [{ value: 1000000, date: '2025-06-19' }],
          }]}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });

      // Charts should render without errors when interacted with
      const chartContainer = screen.getByTestId('responsive-container');
      await user.hover(chartContainer);

      expect(chartContainer).toBeInTheDocument();
    });

    it('should handle legend interactions', async () => {
      const user = userEvent.setup();
      render(
        <StackedBarChart
          title="Legend Test"
          data={generateMockAggregatedData(10)}
          dataKeys={['bullx_volume', 'photon_volume']}
          labels={['BullX', 'Photon']}
          loading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });

      // Should handle legend interactions without errors
      const chartContainer = screen.getByTestId('responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});