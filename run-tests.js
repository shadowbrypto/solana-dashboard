#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Sol Analytics Dashboard
 * 
 * This script runs the complete test suite with reporting and validation.
 * Use this after making significant feature changes to ensure everything works.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(`${title}`, 'bold');
  console.log('='.repeat(60));
}

function logSection(title) {
  console.log('\n' + '-'.repeat(40));
  log(`${title}`, 'cyan');
  console.log('-'.repeat(40));
}

function runCommand(command, description) {
  try {
    log(`▶ ${description}...`, 'blue');
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    log(`✅ ${description} - PASSED`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - FAILED`, 'red');
    console.log(error.stdout);
    console.error(error.stderr);
    return { success: false, error: error.message };
  }
}

async function main() {
  const startTime = Date.now();
  
  logHeader('🧪 SOL ANALYTICS DASHBOARD - COMPREHENSIVE TEST SUITE');
  log('Running complete test validation after feature changes...', 'yellow');

  const testResults = {
    individual: false,
    allProtocols: false,
    dailyMetrics: false,
    chartComponents: false,
    coverage: false,
    build: false
  };

  let allPassed = true;

  // 1. Build validation
  logSection('📦 Build Validation');
  const buildResult = runCommand('npm run build', 'Building application');
  testResults.build = buildResult.success;
  if (!buildResult.success) allPassed = false;

  // 2. Individual Protocol Tests
  logSection('👤 Individual Protocol Pages');
  log('Testing data loading for all 14 protocols...', 'blue');
  log('Validating metric cards, charts, and timeframes...', 'blue');
  const individualResult = runCommand('npm run test:individual', 'Individual protocol tests');
  testResults.individual = individualResult.success;
  if (!individualResult.success) allPassed = false;

  // 3. All Protocols Overview Tests
  logSection('📊 All Protocols Overview Page');
  log('Testing aggregated data display and accordion functionality...', 'blue');
  log('Validating historical data (>3 months) and chart components...', 'blue');
  const allProtocolsResult = runCommand('npm run test:all-protocols', 'All protocols overview tests');
  testResults.allProtocols = allProtocolsResult.success;
  if (!allProtocolsResult.success) allPassed = false;

  // 4. Daily Metrics Report Tests
  logSection('📅 Daily Metrics Report');
  log('Testing date picker functionality and table display...', 'blue');
  log('Validating random date selections and protocol data...', 'blue');
  const dailyMetricsResult = runCommand('npm run test:daily-metrics', 'Daily metrics report tests');
  testResults.dailyMetrics = dailyMetricsResult.success;
  if (!dailyMetricsResult.success) allPassed = false;

  // 5. Chart Components Integration Tests
  logSection('📈 Chart Components');
  log('Testing all chart types: HorizontalBar, StackedBar, StackedArea, Combined, Timeline...', 'blue');
  log('Validating timeframe filtering, data visualization, and interactions...', 'blue');
  const chartsResult = runCommand('npm run test:charts', 'Chart components tests');
  testResults.chartComponents = chartsResult.success;
  if (!chartsResult.success) allPassed = false;

  // 6. Coverage Report
  logSection('📋 Test Coverage Analysis');
  log('Generating comprehensive coverage report...', 'blue');
  const coverageResult = runCommand('npm run test:coverage', 'Test coverage analysis');
  testResults.coverage = coverageResult.success;
  if (!coverageResult.success) allPassed = false;

  // Generate Test Report
  logSection('📝 Test Report Generation');
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    results: testResults,
    summary: {
      total: Object.keys(testResults).length,
      passed: Object.values(testResults).filter(r => r).length,
      failed: Object.values(testResults).filter(r => !r).length,
      success: allPassed
    }
  };

  const reportJson = JSON.stringify(report, null, 2);
  writeFileSync('test-report.json', reportJson);
  log('Test report saved to test-report.json', 'blue');

  // Final Summary
  logHeader('📊 TEST EXECUTION SUMMARY');
  
  const testCategories = [
    { name: 'Build Validation', key: 'build', description: 'Application builds successfully' },
    { name: 'Individual Protocols', key: 'individual', description: '14 protocols × metrics × timeframes' },
    { name: 'All Protocols Overview', key: 'allProtocols', description: 'Aggregated data & accordion sections' },
    { name: 'Daily Metrics Report', key: 'dailyMetrics', description: 'Date picker & table functionality' },
    { name: 'Chart Components', key: 'chartComponents', description: '5 chart types × interactions' },
    { name: 'Coverage Analysis', key: 'coverage', description: 'Code coverage metrics' }
  ];

  testCategories.forEach(test => {
    const status = testResults[test.key] ? '✅ PASS' : '❌ FAIL';
    const color = testResults[test.key] ? 'green' : 'red';
    log(`${status} ${test.name}: ${test.description}`, color);
  });

  console.log('\n' + '='.repeat(60));
  log(`⏱️  Total Execution Time: ${duration} seconds`, 'cyan');
  log(`📈 Tests Passed: ${report.summary.passed}/${report.summary.total}`, 'cyan');
  
  if (allPassed) {
    log('🎉 ALL TESTS PASSED! Application is ready for deployment.', 'green');
    console.log('\n✨ The following functionality has been validated:');
    console.log('   • All 14 protocols load correctly');
    console.log('   • Metric cards display accurate values');
    console.log('   • All timeframes work (7d → all time)');
    console.log('   • Charts render and filter data properly');
    console.log('   • Historical data (>3 months) loads correctly');
    console.log('   • Daily metrics report functions properly');
    console.log('   • Error handling and loading states work');
    console.log('   • Application builds successfully');
  } else {
    log('⚠️  SOME TESTS FAILED! Review the errors above before deployment.', 'red');
    console.log('\n🔍 To debug specific failures:');
    console.log('   • npm run test:ui (visual test interface)');
    console.log('   • npm run test:watch (watch mode)');
    console.log('   • Check test-report.json for details');
  }

  console.log('\n📚 For detailed testing documentation:');
  console.log('   • See TEST_SUITE_DOCUMENTATION.md');
  console.log('   • Run npm run test:ui for interactive debugging');
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log('❌ Unexpected error occurred:', 'red');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled promise rejection:', 'red');
  console.error(reason);
  process.exit(1);
});

// Run the test suite
main().catch(error => {
  log('❌ Test suite execution failed:', 'red');
  console.error(error);
  process.exit(1);
});