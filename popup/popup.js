/**
 * Auto-Fill Extension Popup Script
 * Handles popup UI interactions and communication with content scripts
 */

// Constants
const POPUP_STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  EXTENSION_SETTINGS: 'extensionSettings',
  LAST_DETECTION: 'lastDetection'
};

const MESSAGES = {
  DETECT_FIELDS: 'detectFields',
  FILL_FORM: 'fillForm',
  GET_FORM_DATA: 'getFormData'
};

// DOM Elements
let elements = {};
let storageManager = null;

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeStorageManager();
  initializeElements();
  await loadProfileStatus();
  await checkCurrentPageForm();
  setupEventListeners();
});

/**
 * Initialize storage manager
 */
async function initializeStorageManager() {
  try {
    // Wait for storage manager to be available
    await new Promise(resolve => {
      if (window.storageManager) {
        resolve();
      } else {
        setTimeout(resolve, 100);
      }
    });

    storageManager = window.storageManager;
    if (storageManager) {
      await storageManager.initialize();
      console.log('Storage manager initialized in popup');
    } else {
      console.warn('Storage manager not available, using direct chrome.storage');
    }
  } catch (error) {
    console.error('Failed to initialize storage manager:', error);
  }
}

/**
 * Cache DOM elements for better performance
 */
function initializeElements() {
  elements = {
    fillFormBtn: document.getElementById('fillFormBtn'),
    detectFieldsBtn: document.getElementById('detectFieldsBtn'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusDot: document.querySelector('.popup__status-dot'),
    statusText: document.querySelector('.popup__status-text'),
    detectionResults: document.getElementById('detectionResults'),
    fieldCount: document.getElementById('fieldCount'),
    fieldTypes: document.getElementById('fieldTypes'),
    profileStatus: document.getElementById('profileStatus'),
    setupProfileBtn: document.getElementById('setupProfileBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn')
  };
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
  elements.detectFieldsBtn.addEventListener('click', handleDetectFields);
  elements.fillFormBtn.addEventListener('click', handleFillForm);
  elements.setupProfileBtn.addEventListener('click', handleSetupProfile);
  elements.settingsBtn.addEventListener('click', handleOpenSettings);
  elements.helpBtn.addEventListener('click', handleShowHelp);
}

/**
 * Load and display user profile status
 */
async function loadProfileStatus() {
  try {
    let profileData = null;

    // Try to use storage manager for encrypted data
    if (storageManager) {
      profileData = await storageManager.getUserProfile();
    } else {
      // Fallback to direct chrome storage
      const result = await chrome.storage.local.get(POPUP_STORAGE_KEYS.USER_PROFILE);
      profileData = result[POPUP_STORAGE_KEYS.USER_PROFILE];
    }

    const hasProfile = profileData &&
      profileData.personal &&
      (profileData.personal.firstName ||
        profileData.personal.email);

    updateProfileDisplay(hasProfile);
  } catch (error) {
    console.error('Error loading profile status:', error);
    updateProfileDisplay(false);
  }
}

/**
 * Update profile status display
 * @param {boolean} hasProfile - Whether user has a configured profile
 */
function updateProfileDisplay(hasProfile) {
  const profileIcon = elements.profileStatus.querySelector('.profile-status__icon');
  const profileText = elements.profileStatus.querySelector('.profile-status__text');
  const profileAction = elements.setupProfileBtn;

  if (hasProfile) {
    profileIcon.textContent = '✅';
    profileText.textContent = 'Profile configured';
    profileAction.textContent = 'Edit profile';
    profileAction.style.display = 'inline';
  } else {
    profileIcon.textContent = '👤';
    profileText.textContent = 'No profile configured';
    profileAction.textContent = 'Set up profile';
    profileAction.style.display = 'inline';
  }
}

/**
 * Check current page for form fields
 */
async function checkCurrentPageForm() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !isJobPortal(tab.url)) {
      updateStatusDisplay('inactive', 'Not on job portal');
      return;
    }

    updateStatusDisplay('active', 'Job portal detected');

    // Try to get cached detection results
    const result = await chrome.storage.local.get(POPUP_STORAGE_KEYS.LAST_DETECTION);
    if (result[POPUP_STORAGE_KEYS.LAST_DETECTION] &&
      result[POPUP_STORAGE_KEYS.LAST_DETECTION].url === tab.url) {
      displayDetectionResults(result[POPUP_STORAGE_KEYS.LAST_DETECTION]);
    }
  } catch (error) {
    console.error('Error checking current page:', error);
    updateStatusDisplay('inactive', 'Error');
  }
}

/**
 * Check if URL is a supported job portal
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL is a job portal
 */
function isJobPortal(url) {
  const jobPortals = [
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    '127.0.0.1',
    'localhost',
    'workday.com'
  ];

  return jobPortals.some(portal => url.includes(portal));
}

/**
 * Ensure content script is injected in the tab
 * @param {number} tabId - Tab ID to inject script into
 */
async function ensureContentScriptInjected(tabId) {
  try {
    console.log('=== Starting Content Script Injection Process ===');
    console.log('Tab ID:', tabId);
    
    // Get tab info for debugging
    try {
      const tab = await chrome.tabs.get(tabId);
      console.log('Tab URL:', tab.url);
      console.log('Tab status:', tab.status);
    } catch (tabError) {
      console.warn('Could not get tab info:', tabError);
    }
    
    // Try to ping the content script first
    try {
      console.log('Testing existing content script...');
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      if (response && response.success) {
        console.log('Content script already loaded and responding:', response);
        return;
      }
    } catch (pingError) {
      // Content script not loaded, need to inject it
      console.log('Content script not loaded, will inject. Error was:', pingError.message);
    }

    console.log('Starting script injection process...');
    
    // Try injecting masterInjection.js first (optional dependency)
    try {
      console.log('Attempting to inject masterInjection.js...');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/masterInjection.js']
      });
      console.log('✅ masterInjection.js injected successfully');
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (injectionError) {
      console.warn('⚠️ Failed to inject masterInjection.js (will use fallback):', injectionError);
      console.warn('Error details:', {
        message: injectionError.message,
        stack: injectionError.stack
      });
    }

    // Inject masterDetector.js (required) to detect fields
    try {
      console.log('Attempting to inject masterDetector.js...');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/masterDetector.js']
      });
      console.log('✅ masterDetector.js injected successfully');
    } catch (detectorError) {
      console.error('❌ CRITICAL: Failed to inject masterDetector.js:', detectorError);
      console.error('Error details:', {
        message: detectorError.message,
        stack: detectorError.stack,
        name: detectorError.name
      });
      throw new Error('Critical: Cannot inject main detector script - ' + detectorError.message);
    }

    console.log('All scripts injected, waiting for initialization...');

    // Wait longer for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the injection worked
    try {
      console.log('Verifying content script is responding...');
      const verifyResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      if (!verifyResponse || !verifyResponse.success) {
        throw new Error('Content script not responding after injection');
      }
      console.log('✅ Content script injection verified successfully:', verifyResponse);
    } catch (verifyError) {
      console.error('❌ Content script verification failed:', verifyError);
      throw new Error('Content script failed to initialize: ' + verifyError.message);
    }

  } catch (error) {
    console.error('❌ Failed to inject content script:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      tabId: tabId,
      name: error.name
    });
    throw new Error('Cannot inject content script on this page: ' + error.message);
  }
}

/**
 * Update status indicator display
 * @param {string} status - Status type ('active', 'inactive', 'working')
 * @param {string} text - Status text to display
 */
function updateStatusDisplay(status, text) {
  elements.statusDot.className = `popup__status-dot popup__status-dot--${status}`;
  elements.statusText.textContent = text;
}

/**
 * Handle detect fields button click
 */
async function handleDetectFields() {
  try {
    updateStatusDisplay('working', 'Detecting...');
    elements.detectFieldsBtn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Check if tab URL is supported
    if (!isJobPortal(tab.url)) {
      updateStatusDisplay('inactive', 'Not a supported job portal');
      return;
    }

    // Try to inject content script if not already present
    try {
      await ensureContentScriptInjected(tab.id);
    } catch (injectionError) {
      console.error('Content script injection failed:', injectionError);
      updateStatusDisplay('inactive', 'Failed to load on this page');
      return;
    }

    // Wait a moment for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send message to content script to detect fields
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: MESSAGES.DETECT_FIELDS
    });

    if (response && response.success) {
      await saveDetectionResults(tab.url, response.fields);
      displayDetectionResults(response);
      updateStatusDisplay('active', 'Fields detected');

      // Enable fill button if profile exists
      let profileData = null;
      if (storageManager) {
        profileData = await storageManager.getUserProfile();
      } else {
        const profileResult = await chrome.storage.local.get(POPUP_STORAGE_KEYS.USER_PROFILE);
        profileData = profileResult[POPUP_STORAGE_KEYS.USER_PROFILE];
      }

      if (profileData) {
        elements.fillFormBtn.disabled = false;
      }
    } else {
      updateStatusDisplay('inactive', 'No fields found');
      hideDetectionResults();
    }
  } catch (error) {
    console.error('Error detecting fields:', error);

    if (error.message.includes('Could not establish connection')) {
      updateStatusDisplay('inactive', 'Content script not loaded');
    } else if (error.message.includes('Cannot access')) {
      updateStatusDisplay('inactive', 'Cannot access this page');
    } else {
      updateStatusDisplay('inactive', 'Detection failed');
    }

    hideDetectionResults();
  } finally {
    elements.detectFieldsBtn.disabled = false;
  }
}

/**
 * Handle fill form button click
 */
async function handleFillForm() {
  try {
    updateStatusDisplay('working', 'Filling form...');
    elements.fillFormBtn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Get user profile data (decrypt if needed)
    let profileData = null;

    if (storageManager) {
      // Use storage manager to get decrypted profile data
      console.log('Using storage manager to fetch and decrypt profile data');
      profileData = await storageManager.getUserProfile();
    } else {
      // Fallback to direct chrome storage (unencrypted)
      console.log('Using direct chrome storage (fallback)');
      const profileResult = await chrome.storage.local.get(POPUP_STORAGE_KEYS.USER_PROFILE);
      profileData = profileResult[POPUP_STORAGE_KEYS.USER_PROFILE];
    }

    console.log('Profile data retrieved:', profileData ? 'Found' : 'Not found');
    if (profileData) {
      console.log('Profile data keys:', Object.keys(profileData));
      console.log('Profile data details:', JSON.stringify(profileData, null, 2));
    } else {
      console.warn('Profile data is null/undefined');
    }

    if (!profileData || Object.keys(profileData).length === 0) {
      updateStatusDisplay('inactive', 'No profile found - please set up your profile first');
      console.error('ERROR: No profile data available. User needs to set up profile.');
      return;
    }

    // Ensure content script is available
    try {
      await ensureContentScriptInjected(tab.id);
    } catch (injectionError) {
      console.error('Content script injection failed:', injectionError);
      updateStatusDisplay('inactive', 'Failed to load on this page');
      return;
    }

    // Force field detection before filling to ensure detectedFields is populated
    console.log('Triggering field detection before filling...');
    const detectionResponse = await chrome.tabs.sendMessage(tab.id, {
      action: MESSAGES.DETECT_FIELDS
    });
    
    if (!detectionResponse || !detectionResponse.success || !detectionResponse.fields || detectionResponse.fields.length === 0) {
      updateStatusDisplay('inactive', 'No fields detected');
      return;
    }
    
    console.log(`${detectionResponse.fields.length} fields detected, proceeding with fill...`);

    // Send message to content script to fill form
    console.log('Sending fillForm message with profile data...');
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: MESSAGES.FILL_FORM,
      profileData: profileData  // Now using decrypted data
    });

    console.log('Fill form response:', response);

    if (response && response.success) {
      const filledCount = response.filledFields || 0;
      const totalFields = response.totalFields || 0;
      updateStatusDisplay('active', `Form filled: ${filledCount}/${totalFields} fields`);
      
      if (response.fillErrors && response.fillErrors.length > 0) {
        console.warn('Some fields failed to fill:', response.fillErrors);
      }
    } else {
      const errorDetail = response?.error || response?.fillErrors || 'Unknown error';
      updateStatusDisplay('inactive', `Fill failed: ${errorDetail}`);
      console.error('Fill failed. Response:', response);
    }
  } catch (error) {
    console.error('Error filling form:', error);

    if (error.message.includes('Could not establish connection')) {
      updateStatusDisplay('inactive', 'Content script not loaded');
    } else if (error.message.includes('Cannot access')) {
      updateStatusDisplay('inactive', 'Cannot access this page');
    } else {
      updateStatusDisplay('inactive', 'Fill error');
    }
  } finally {
    elements.fillFormBtn.disabled = false;
  }
}

/**
 * Save detection results to storage
 * @param {string} url - Current page URL
 * @param {Array} fields - Detected fields
 */
async function saveDetectionResults(url, fields) {
  try {
    await chrome.storage.local.set({
      [POPUP_STORAGE_KEYS.LAST_DETECTION]: {
        url,
        fields,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error saving detection results:', error);
  }
}

/**
 * Display field detection results
 * @param {Object} detection - Detection results
 */
function displayDetectionResults(detection) {
  const { fields } = detection;

  // Update field count
  const countNumber = elements.fieldCount.querySelector('.field-count__number');
  const countText = elements.fieldCount.querySelector('.field-count__text');

  countNumber.textContent = fields.length;
  countText.textContent = fields.length === 1 ? 'field found' : 'fields found';

  // Update field types
  const fieldTypeMap = {};
  fields.forEach(field => {
    const type = field.type || 'text';
    fieldTypeMap[type] = (fieldTypeMap[type] || 0) + 1;
  });

  elements.fieldTypes.innerHTML = '';
  Object.entries(fieldTypeMap).forEach(([type, count]) => {
    const tag = document.createElement('span');
    tag.className = 'field-type-tag';
    tag.textContent = `${type} (${count})`;
    elements.fieldTypes.appendChild(tag);
  });

  // Show results
  elements.detectionResults.classList.remove('info-card--hidden');
}

/**
 * Hide detection results
 */
function hideDetectionResults() {
  elements.detectionResults.classList.add('info-card--hidden');
  elements.fillFormBtn.disabled = true;
}

/**
 * Handle setup profile button click
 */
function handleSetupProfile() {
  chrome.runtime.openOptionsPage();
}

/**
 * Handle settings button click
 */
function handleOpenSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Handle help button click
 */
function handleShowHelp() {
  const helpUrl = 'https://github.com/neerajdhurandher/Auto-Fill-Extension#help';
  chrome.tabs.create({ url: helpUrl });
}