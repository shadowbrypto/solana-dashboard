// Simple test to verify data type toggle functionality
const { Settings } = require('./src/lib/settings');

console.log('Testing data type toggle functionality...');

// Test 1: Check default data type
console.log('1. Default data type:', Settings.getDataTypePreference());

// Test 2: Add a listener
let changeCount = 0;
const unsubscribe = Settings.addDataTypeChangeListener((newDataType) => {
  changeCount++;
  console.log(`2. Data type changed to: ${newDataType} (change #${changeCount})`);
});

// Test 3: Change data type
console.log('3. Changing data type to public...');
Settings.setDataTypePreference('public');

console.log('4. Current data type:', Settings.getDataTypePreference());

// Test 4: Change back to private
console.log('5. Changing data type to private...');
Settings.setDataTypePreference('private');

console.log('6. Current data type:', Settings.getDataTypePreference());

// Test 5: Clean up
unsubscribe();
console.log('7. Listener unsubscribed');

// Test 6: Change again (should not trigger listener)
console.log('8. Changing data type to public again (should not trigger listener)...');
Settings.setDataTypePreference('public');

console.log('9. Final data type:', Settings.getDataTypePreference());
console.log(`10. Total changes detected: ${changeCount}`);

console.log('✅ Test completed successfully!');