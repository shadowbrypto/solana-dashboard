# Test Suite Documentation

## Overview

This comprehensive test suite provides thorough testing coverage for the Sol Analytics Dashboard application. The tests ensure reliability, performance, and correctness across all major features and user interactions.

## Test Structure

```
src/test/
├── setup.ts                    # Test configuration and global mocks
├── utils.ts                    # Test utilities and helpers
├── mocks.ts                    # API mocks and data generators
├── individual-protocol.test.tsx # Tests for individual protocol pages
├── all-protocols.test.tsx      # Tests for "All Protocols" overview page
├── daily-metrics.test.tsx      # Tests for daily metrics reporting
└── chart-components.test.tsx   # Integration tests for chart components
```

## Test Categories

### 1. Individual Protocol Pages (`individual-protocol.test.tsx`)

**What it tests:**
- Data loading for all 14 supported protocols
- Metric cards display and values
- Chart rendering and timeframe filtering
- Error handling and loading states
- Navigation and URL handling
- Responsive design

**Key test scenarios:**
- ✅ Data loads correctly for each protocol (bullx, photon, trojan, etc.)
- ✅ All metric types display (Volume, Users, Trades, Fees)
- ✅ Charts work with all timeframes (7d, 30d, 3m, 6m, 1y, all)
- ✅ Loading skeletons appear during data fetch
- ✅ API errors are handled gracefully
- ✅ Invalid protocol names redirect properly
- ✅ Charts render on different screen sizes

### 2. All Protocols Page (`all-protocols.test.tsx`)

**What it tests:**
- Overview dashboard layout and structure
- Accordion functionality for metric sections
- Chart components within each section
- Historical data coverage (>3 months)
- Pagination and performance
- Aggregated data display

**Key test scenarios:**
- ✅ "Overview Dashboard" title displays
- ✅ All metric sections present (Volume, DAU, New Users, Trades, Fees)
- ✅ Accordion sections expand/collapse correctly
- ✅ Each section contains correct number of charts
- ✅ Timeframe filtering works for all charts
- ✅ Historical data loads for 6m, 1y, and "all time"
- ✅ Performance with large datasets (749+ records)
- ✅ Empty data states handled properly

### 3. Daily Metrics Report (`daily-metrics.test.tsx`)

**What it tests:**
- Daily metrics table rendering
- Date picker functionality
- Protocol data display
- Column functionality and sorting
- Category grouping
- Error handling and performance

**Key test scenarios:**
- ✅ Table renders with protocol data
- ✅ Date picker allows date selection
- ✅ Data updates when date changes
- ✅ Multiple random date selections work
- ✅ All protocols display with metrics
- ✅ Numerical values formatted correctly
- ✅ Column reordering and sorting
- ✅ Category grouping and expansion
- ✅ API errors handled gracefully
- ✅ Performance with large protocol lists

### 4. Chart Components (`chart-components.test.tsx`)

**What it tests:**
- Individual chart component functionality
- Data visualization accuracy
- Timeframe filtering logic
- Loading states and error handling
- Responsiveness and interactions
- Data validation

**Components tested:**
- ✅ **HorizontalBarChart**: Protocol ranking charts
- ✅ **StackedBarChart**: Daily metrics by protocol
- ✅ **StackedAreaChart**: Protocol dominance over time
- ✅ **CombinedChart**: Volume & fees comparison
- ✅ **TimelineChart**: Single metric trends

**Key test scenarios:**
- ✅ All chart types render with data
- ✅ Loading skeletons display during load
- ✅ Timeframe filtering works correctly
- ✅ Large number formatting (K, M, B suffixes)
- ✅ Empty and invalid data handled
- ✅ Responsive design on different screen sizes
- ✅ Tooltip and legend interactions

## Test Utilities

### Mock Data Generators
- `generateMockProtocolStats()`: Creates realistic protocol data
- `generateMockAggregatedData()`: Creates multi-protocol daily data
- `generateMockMetrics()`: Creates metric summary data
- `generateMockDailyMetrics()`: Creates daily data for specific dates

### API Mocking
- `setupMockApiResponses()`: Sets up standard API responses
- `mockApiError()`: Simulates API failures
- `mockApiLoading()`: Simulates slow API responses
- `mockEmptyData()`: Simulates empty datasets

### Test Helpers
- `customRender()`: Renders components with providers
- `waitForLoadingToFinish()`: Waits for async operations
- `mockApiResponse()`: Creates delayed API responses

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Watch mode for development
npm run test:watch

# Visual test UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Specific Test Suites
```bash
# Test individual protocol pages
npm run test:individual

# Test all protocols overview
npm run test:all-protocols

# Test daily metrics functionality
npm run test:daily-metrics

# Test chart components
npm run test:charts
```

## Coverage Goals

The test suite aims for comprehensive coverage:

- **Component Coverage**: All major components tested
- **Feature Coverage**: All user-facing features tested
- **Error Coverage**: Error scenarios and edge cases covered
- **Performance Coverage**: Large datasets and rapid interactions tested
- **Accessibility Coverage**: Screen reader and keyboard navigation tested

## Test Data

### Protocol Coverage
Tests cover all 14 supported protocols:
- bullx, photon, trojan, axiom, gmgnai, bloom
- bonkbot, nova, soltradingbot, maestro, banana
- padre, moonshot, vector

### Timeframe Coverage
All timeframe options tested:
- 7 days, 30 days, 3 months, 6 months, 1 year, all time

### Data Scenarios
- ✅ Normal data loads
- ✅ Large datasets (749+ records)
- ✅ Empty datasets
- ✅ Invalid/corrupted data
- ✅ API errors and timeouts
- ✅ Slow network conditions

## Continuous Integration

### Pre-commit Hooks
Add to `.github/workflows/test.yml`:
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage should be >80%
- ✅ No console errors during tests
- ✅ Performance tests complete within timeout

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
```bash
# Ensure dependencies are installed
npm install
```

**Chart tests fail with rendering errors**
```bash
# Charts use mocked recharts components
# Check src/test/setup.ts for proper mocks
```

**API tests fail unexpectedly**
```bash
# Reset mocks between tests
# Check setupMockApiResponses() is called in beforeEach
```

**Timeout errors on slow machines**
```bash
# Increase timeout in vitest.config.ts
# Or use npm run test:ui for better debugging
```

### Debugging Tests

1. **Use test UI**: `npm run test:ui` for visual debugging
2. **Add console logs**: Debug failing tests with console.log
3. **Isolate tests**: Use `.only()` to run specific tests
4. **Check mocks**: Verify mock data matches expected format

## Best Practices

### Writing New Tests
1. **Follow naming convention**: `feature.test.tsx`
2. **Use descriptive test names**: Clearly state what is being tested
3. **Test user behavior**: Focus on user interactions, not implementation
4. **Mock external dependencies**: Keep tests isolated
5. **Test error scenarios**: Include negative test cases
6. **Keep tests fast**: Avoid unnecessary delays

### Maintaining Tests
1. **Update when features change**: Keep tests in sync with code
2. **Review test coverage**: Ensure new features are tested
3. **Refactor test utilities**: Keep test code DRY
4. **Document complex scenarios**: Add comments for complex test logic

## Performance Benchmarks

### Expected Test Performance
- ✅ Full test suite: < 30 seconds
- ✅ Individual test files: < 10 seconds
- ✅ Chart rendering tests: < 5 seconds
- ✅ API mock responses: < 100ms

### Performance Tests Include
- Large dataset handling (749+ records)
- Rapid user interactions (timeframe changes)
- Multiple protocol switching
- Chart re-rendering performance
- Memory leak detection

## Future Enhancements

### Planned Additions
- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance monitoring integration
- [ ] Accessibility testing automation
- [ ] Cross-browser testing matrix

### Test Data Expansion
- [ ] Historical data spanning multiple years
- [ ] Edge case scenarios (holidays, outages)
- [ ] Stress testing with extreme values
- [ ] Multi-timezone data handling

This test suite provides a solid foundation for maintaining code quality and ensuring reliable application behavior across all user scenarios and edge cases.