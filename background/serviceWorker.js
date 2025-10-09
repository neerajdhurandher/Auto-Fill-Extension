/**
 * Background Service Worker for Auto-Fill Extension
 * Handles extension lifecycle, message passing, and coordination
 */

// Extension lifecycle events
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onStartup.addListener(handleStartup);

// Message handling
chrome.runtime.onMessage.addListener(handleMessage);

// Tab events for content script injection
chrome.tabs.onUpdated.addListener(handleTabUpdate);

/**
 * Handle extension installation
 * @param {Object} details - Installation details
 */
async function handleInstall(details) {
  console.log('Auto-Fill Extension installed:', details.reason);
  
  try {
    // Initialize default settings
    await initializeDefaultSettings();
    
    // Set up initial state
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ffe600' });
    
    // Show welcome message on first install
    if (details.reason === 'install') {
      await showWelcomeNotification();
    }
  } catch (error) {
    console.error('Error during installation:', error);
  }
}

/**
 * Handle extension startup
 */
async function handleStartup() {
  console.log('Auto-Fill Extension started');
  
  try {
    // Clear any temporary data
    await clearTemporaryData();
    
    // Reset badge
    await chrome.action.setBadgeText({ text: '' });
  } catch (error) {
    console.error('Error during startup:', error);
  }
}

/**
 * Initialize default extension settings
 */
async function initializeDefaultSettings() {
  const defaultSettings = {
    version: '1.0.0',
    autoFillEnabled: true,
    securityTimeout: 3600000, // 1 hour in milliseconds
    detectionSensitivity: 'medium',
    supportedPortals: [
      'linkedin.com',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com'
    ],
    fieldMappings: {
      name: ['name', 'full-name', 'fullname', 'applicant-name'],
      email: ['email', 'email-address', 'e-mail'],
      phone: ['phone', 'telephone', 'mobile', 'phone-number'],
      address: ['address', 'street-address', 'location'],
      experience: ['experience', 'work-experience', 'years-experience'],
      skills: ['skills', 'technical-skills', 'expertise']
    }
  };
  
  try {
    const result = await chrome.storage.local.get('extensionSettings');
    if (!result.extensionSettings) {
      await chrome.storage.local.set({ extensionSettings: defaultSettings });
      console.log('Default settings initialized');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}

/**
 * Handle messages from popup and content scripts
 * @param {Object} message - Message object
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 */
function handleMessage(message, sender, sendResponse) {
  console.log('Received message:', message.action, 'from:', sender.tab?.url || 'popup');
  
  switch (message.action) {
    case 'getSettings':
      handleGetSettings(sendResponse);
      break;
      
    case 'updateSettings':
      handleUpdateSettings(message.settings, sendResponse);
      break;
      
    case 'clearData':
      handleClearData(sendResponse);
      break;
      
    case 'reportFieldDetection':
      handleFieldDetectionReport(message, sender, sendResponse);
      break;
      
    case 'reportFillSuccess':
      handleFillSuccessReport(message, sender, sendResponse);
      break;
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  // Return true to indicate async response
  return true;
}

/**
 * Handle get settings request
 * @param {Function} sendResponse - Response callback
 */
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.local.get('extensionSettings');
    sendResponse({ 
      success: true, 
      settings: result.extensionSettings || {} 
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle update settings request
 * @param {Object} settings - New settings
 * @param {Function} sendResponse - Response callback
 */
async function handleUpdateSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set({ extensionSettings: settings });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle clear data request
 * @param {Function} sendResponse - Response callback
 */
async function handleClearData(sendResponse) {
  try {
    // Clear all stored data except settings
    const result = await chrome.storage.local.get('extensionSettings');
    await chrome.storage.local.clear();
    
    // Restore settings
    if (result.extensionSettings) {
      await chrome.storage.local.set({ 
        extensionSettings: result.extensionSettings 
      });
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle field detection report from content script
 * @param {Object} message - Message containing detection data
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 */
async function handleFieldDetectionReport(message, sender, sendResponse) {
  try {
    const { fieldsCount, portal } = message;
    
    // Update badge with field count
    if (fieldsCount > 0) {
      await chrome.action.setBadgeText({ 
        text: fieldsCount.toString(),
        tabId: sender.tab.id 
      });
      await chrome.action.setBadgeBackgroundColor({ 
        color: '#44ff44' // Success green
      });
    } else {
      await chrome.action.setBadgeText({ 
        text: '',
        tabId: sender.tab.id 
      });
    }
    
    // Log analytics (could be extended for usage tracking)
    console.log(`Fields detected on ${portal}: ${fieldsCount}`);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling field detection report:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle fill success report from content script
 * @param {Object} message - Message containing fill data
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 */
async function handleFillSuccessReport(message, sender, sendResponse) {
  try {
    const { fieldsFilledCount } = message;
    
    // Update badge to show success
    await chrome.action.setBadgeText({ 
      text: '✓',
      tabId: sender.tab.id 
    });
    await chrome.action.setBadgeBackgroundColor({ 
      color: '#ffe600' // Success yellow
    });
    
    // Clear badge after 3 seconds
    setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ 
          text: '',
          tabId: sender.tab.id 
        });
      } catch (error) {
        // Tab might be closed, ignore error
      }
    }, 3000);
    
    console.log(`Form filled successfully: ${fieldsFilledCount} fields`);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling fill success report:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle tab updates for content script injection
 * @param {number} tabId - Tab ID
 * @param {Object} changeInfo - Change information
 * @param {Object} tab - Tab object
 */
async function handleTabUpdate(tabId, changeInfo, tab) {
  // Only act on complete page loads
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }
  
  try {
    // Check if this is a supported job portal
    const isJobPortal = await checkIfJobPortal(tab.url);
    
    if (isJobPortal) {
      // Inject content script if not already present
      await ensureContentScriptInjected(tabId);
      
      // Reset badge for new page
      await chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
}

/**
 * Check if URL is a supported job portal
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL is a job portal
 */
async function checkIfJobPortal(url) {
  try {
    const result = await chrome.storage.local.get('extensionSettings');
    const settings = result.extensionSettings || {};
    const supportedPortals = settings.supportedPortals || [];
    
    return supportedPortals.some(portal => url.includes(portal));
  } catch (error) {
    console.error('Error checking job portal:', error);
    return false;
  }
}

/**
 * Ensure content script is injected in tab
 * @param {number} tabId - Tab ID
 */
async function ensureContentScriptInjected(tabId) {
  try {
    // Try to ping existing content script
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    
    if (!response) {
      // Content script not present, inject it
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/detector.js']
      });
      
      console.log('Content script injected into tab:', tabId);
    }
  } catch (error) {
    // Content script probably not present, try to inject
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/detector.js']
      });
      
      console.log('Content script injected into tab:', tabId);
    } catch (injectionError) {
      console.error('Error injecting content script:', injectionError);
    }
  }
}

/**
 * Show welcome notification on first install
 */
async function showWelcomeNotification() {
  try {
    // Open options page for first-time setup
    await chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Error showing welcome:', error);
  }
}

/**
 * Clear temporary data on startup
 */
async function clearTemporaryData() {
  try {
    // Remove temporary detection results older than 1 hour
    const result = await chrome.storage.local.get('lastDetection');
    
    if (result.lastDetection) {
      const oneHourAgo = Date.now() - 3600000; // 1 hour
      
      if (result.lastDetection.timestamp < oneHourAgo) {
        await chrome.storage.local.remove('lastDetection');
        console.log('Cleared old detection data');
      }
    }
  } catch (error) {
    console.error('Error clearing temporary data:', error);
  }
}