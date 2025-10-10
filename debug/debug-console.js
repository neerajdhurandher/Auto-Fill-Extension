/**
 * Debug Console Commands for Auto-Fill Extension
 * 
 * Copy and paste these commands into the browser console (F12) 
 * when on a page with the extension loaded to debug issues.
 */

// Test 1: Check if content script is loaded
console.log('=== Auto-Fill Extension Debug ===');
console.log('1. Checking if content script is loaded...');

if (typeof initializeContentScript === 'function') {
  console.log('✅ Enhanced content script is loaded');
} else {
  console.log('❌ Enhanced content script NOT loaded');
}

// Test 2: Check global variables
console.log('\n2. Checking global variables...');
console.log('detectedFields:', typeof detectedFields !== 'undefined' ? detectedFields.length : 'undefined');
console.log('isInitialized:', typeof isInitialized !== 'undefined' ? isInitialized : 'undefined');
console.log('isAdvancedMode:', typeof isAdvancedMode !== 'undefined' ? isAdvancedMode : 'undefined');

// Test 3: Check utility loading
console.log('\n3. Checking utility availability...');
console.log('advancedFieldDetector:', typeof window.advancedFieldDetector !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
console.log('autoFillEngine:', typeof window.autoFillEngine !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
console.log('performanceMonitor:', typeof window.performanceMonitor !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');

// Test 4: Manual field detection
console.log('\n4. Manual field detection test...');
const formElements = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
console.log('Form elements found:', formElements.length);

if (formElements.length > 0) {
  console.log('Sample elements:');
  Array.from(formElements).slice(0, 5).forEach((el, index) => {
    console.log(`  ${index + 1}. ${el.tagName}[${el.type || 'text'}] - name: "${el.name}", id: "${el.id}", placeholder: "${el.placeholder}"`);
  });
}

// Test 5: Test message sending
console.log('\n5. Testing message handling...');
console.log('Run this command to test field detection:');
console.log('chrome.runtime.sendMessage({action: "detectFields"}, response => console.log("Detection response:", response));');

// Test 6: Manual initialization
console.log('\n6. Manual initialization test...');
console.log('If the extension is not working, try running:');
console.log('initializeContentScript().then(() => console.log("Manual initialization complete"));');

// Test 7: Check for errors
console.log('\n7. Recent console errors (check Console tab for red errors)');
console.log('Look for errors containing "Auto-Fill" in the console');

// Test 8: Extension ID check
console.log('\n8. Extension runtime check...');
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  console.log('✅ Chrome extension runtime available, ID:', chrome.runtime.id);
} else {
  console.log('❌ Chrome extension runtime not available');
}

console.log('\n=== Debug Complete ===');
console.log('If you see any ❌ marks above, that indicates the issue area.');
console.log('Common issues:');
console.log('- Content script not injected: Check manifest.json and reload extension');
console.log('- Utilities not loading: Check file paths in manifest.json');
console.log('- Message handling failed: Check for JavaScript errors in console');