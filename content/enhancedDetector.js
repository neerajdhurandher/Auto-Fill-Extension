/**
 * Enhanced Content Script with Advanced Detection and Auto-Fill
 * Integrates advanced field detection, intelligent auto-fill, and user control
 */

// Global state
let detectedFields = [];
let portalConfig = null;
let isInitialized = false;
let advancedDetector = null;
let autoFillEngine = null;
let isAdvancedMode = true;
let debugMode = true; // Enable debug logging

// Debug logging function
function debugLog(message, ...args) {
  if (debugMode) {
    console.log('Auto-Fill Debug:', message, ...args);
  }
}

// Import utilities
async function loadUtilities() {
  try {
    // Wait a bit for scripts to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load advanced detector
    if (typeof window.advancedFieldDetector !== 'undefined') {
      advancedDetector = window.advancedFieldDetector;
      console.log('Auto-Fill: Advanced detector loaded');
    } else {
      console.warn('Auto-Fill: Advanced detector not available');
    }
    
    // Load auto-fill engine
    if (typeof window.autoFillEngine !== 'undefined') {
      autoFillEngine = window.autoFillEngine;
      console.log('Auto-Fill: Auto-fill engine loaded');
    } else {
      console.warn('Auto-Fill: Auto-fill engine not available');
    }
    
    if (advancedDetector && autoFillEngine) {
      await advancedDetector.initialize();
      await autoFillEngine.initialize();
      isAdvancedMode = true;
      console.log('Auto-Fill: Advanced utilities initialized successfully');
    } else {
      console.log('Auto-Fill: Running in basic mode - advanced utilities not available');
      isAdvancedMode = false;
    }
  } catch (error) {
    console.error('Auto-Fill: Failed to load advanced utilities:', error);
    isAdvancedMode = false;
  }
}

// Field type mappings (fallback for basic mode)
const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  TEL: 'tel',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  FILE: 'file'
};

// Enhanced field patterns
const FIELD_PATTERNS = {
  firstName: {
    keywords: ['first-name', 'firstname', 'first_name', 'fname', 'given-name', 'given_name'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 10,
    variations: ['first', 'f_name', 'givenname', 'forename']
  },
  lastName: {
    keywords: ['last-name', 'lastname', 'last_name', 'lname', 'family-name', 'surname'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 10,
    variations: ['last', 'l_name', 'familyname', 'sur_name']
  },
  fullName: {
    keywords: ['name', 'full-name', 'fullname', 'applicant-name', 'candidate-name', 'full_name'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 9,
    variations: ['complete_name', 'display_name', 'user_name']
  },
  email: {
    keywords: ['email', 'e-mail', 'email-address', 'contact-email', 'email_address'],
    attributes: ['name', 'id', 'class', 'type', 'placeholder'],
    priority: 9,
    variations: ['e_mail', 'mail', 'emailaddr', 'email_id']
  },
  phoneNumber: {
    keywords: ['phone', 'telephone', 'mobile', 'cell', 'contact-number', 'phone-number', 'phone_number'],
    attributes: ['name', 'id', 'class', 'type', 'placeholder'],
    priority: 8,
    variations: ['tel', 'contact_phone', 'mobile_number', 'cellphone']
  },
  phoneCountryCode: {
    keywords: ['country-code', 'country_code', 'phone-country', 'dial-code', 'area_code'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7,
    variations: ['cc', 'prefix', 'dial_code']
  },
  addressLine1: {
    keywords: ['address', 'street', 'address-line-1', 'addr1', 'street-address', 'address_line_1'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7,
    variations: ['address1', 'street_address', 'addr_line1']
  },
  addressLine2: {
    keywords: ['address-line-2', 'addr2', 'apartment', 'apt', 'suite', 'unit', 'address_line_2'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6,
    variations: ['address2', 'apt_number', 'suite_number']
  },
  city: {
    keywords: ['city', 'town', 'locality', 'municipality'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7,
    variations: ['city_name', 'town_name', 'locale']
  },
  postalCode: {
    keywords: ['postal', 'zip', 'postcode', 'pincode', 'zipcode', 'postal_code', 'zip_code'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7,
    variations: ['pin', 'postal_zip', 'zip_postal']
  },
  country: {
    keywords: ['country', 'nation', 'nationality', 'region'],
    attributes: ['name', 'id', 'class'],
    priority: 7,
    variations: ['country_name', 'nation_name']
  },
  jobTitle: {
    keywords: ['title', 'position', 'role', 'designation', 'job-title', 'job_title'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6,
    variations: ['job_position', 'work_title', 'position_title']
  },
  company: {
    keywords: ['company', 'employer', 'organization', 'firm', 'workplace', 'company_name'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6,
    variations: ['org', 'employer_name', 'organization_name']
  },
  jobDescription: {
    keywords: ['description', 'responsibilities', 'duties', 'experience', 'job_description'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5,
    variations: ['job_duties', 'work_description', 'role_description']
  },
  skills: {
    keywords: ['skills', 'technologies', 'expertise', 'competencies', 'technical_skills'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5,
    variations: ['skill_set', 'tech_skills', 'abilities']
  },
  startDate: {
    keywords: ['start', 'from', 'begin', 'commenced', 'joined', 'start_date'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5,
    variations: ['date_started', 'begin_date', 'employment_start']
  },
  endDate: {
    keywords: ['end', 'to', 'until', 'finished', 'left', 'end_date'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5,
    variations: ['date_ended', 'finish_date', 'employment_end']
  }
};

/**
 * Initialize the enhanced content script
 */
async function initializeContentScript() {
  if (isInitialized) {
    debugLog('Already initialized, skipping...');
    return;
  }
  
  debugLog('Initializing enhanced content script...');
  
  try {
    // Load utilities first
    debugLog('Loading utilities...');
    await loadUtilities();
    
    // Identify portal
    portalConfig = identifyJobPortal();
    debugLog('Portal identified:', portalConfig ? portalConfig.name : 'generic');
    
    // Initial field detection
    debugLog('Starting initial field detection...');
    await detectFormFields();
    
    // Set up message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      handleMessage(request, sender, sendResponse);
      return true; // Required for async response
    });
    
    // Set up mutation observer for dynamic content
    setupMutationObserver();
    
    isInitialized = true;
    console.log('Auto-Fill: Enhanced content script initialized successfully');
    debugLog('Initialization complete. Detected fields:', detectedFields.length);
    
    // Notify test page that extension is ready
    window.autoFillExtensionActive = true;
    document.dispatchEvent(new CustomEvent('autoFillExtensionReady', {
      detail: { 
        fieldsDetected: detectedFields.length,
        portal: portalConfig?.name || 'generic',
        advancedMode: isAdvancedMode
      }
    }));
    
  } catch (error) {
    console.error('Auto-Fill: Failed to initialize content script:', error);
    debugLog('Initialization failed:', error);
  }
}

/**
 * Enhanced field detection using advanced algorithms
 */
async function detectFormFields() {
  try {
    debugLog('Starting field detection...');
    const formElements = getFormElements();
    debugLog(`Found ${formElements.length} form elements`);
    
    if (formElements.length === 0) {
      detectedFields = [];
      debugLog('No form elements found, clearing detected fields');
      return;
    }

    // Use advanced detection if available
    if (isAdvancedMode && advancedDetector) {
      debugLog('Using advanced detection mode');
      detectedFields = await detectFieldsAdvanced(formElements);
    } else {
      debugLog('Using basic detection mode');
      detectedFields = await detectFieldsBasic(formElements);
    }
    
    console.log(`Auto-Fill: Detected ${detectedFields.length} mappable fields`);
    debugLog('Detected fields:', detectedFields.map(f => ({ category: f.category, confidence: f.confidence })));
    
    // Notify test page about field detection
    document.dispatchEvent(new CustomEvent('autoFillFieldsDetected', {
      detail: { 
        count: detectedFields.length,
        portal: portalConfig?.name || 'generic',
        fields: detectedFields.map(f => f.category)
      }
    }));
    
    // Notify background script (optional)
    try {
      chrome.runtime.sendMessage({
        type: 'FIELDS_DETECTED',
        data: {
          url: window.location.href,
          portal: portalConfig?.name || 'unknown',
          fieldCount: detectedFields.length,
          fields: detectedFields.map(field => ({
            category: field.category,
            confidence: field.confidence,
            element: field.element?.tagName + (field.element?.type ? `[${field.element.type}]` : '')
          }))
        }
      }).catch(error => {
        console.warn('Auto-Fill: Failed to notify background script:', error);
      });
    } catch (error) {
      console.warn('Auto-Fill: Background message failed:', error);
    }
    
  } catch (error) {
    console.error('Auto-Fill: Field detection failed:', error);
    debugLog('Field detection error:', error);
    detectedFields = []; // Ensure we have a fallback
  }
}

/**
 * Advanced field detection using machine learning
 * @param {Array} formElements - Form elements to analyze
 * @returns {Array} Detected fields
 */
async function detectFieldsAdvanced(formElements) {
  const detectedFields = [];
  
  try {
    for (const element of formElements) {
      try {
        const fieldData = await advancedDetector.detectField(element);
        
        if (fieldData && fieldData.confidence > 0.6) {
          detectedFields.push(fieldData);
        }
      } catch (error) {
        console.error('Advanced detection failed for element:', error);
        // Fallback to basic detection for this element
        const basicResult = detectFieldBasic(element);
        if (basicResult) {
          detectedFields.push(basicResult);
        }
      }
    }
    
    // Sort by confidence and priority
    return detectedFields.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });
  } catch (error) {
    console.error('Advanced field detection failed:', error);
    // Fallback to basic detection
    return await detectFieldsBasic(formElements);
  }
}

/**
 * Basic field detection (fallback)
 * @param {Array} formElements - Form elements to analyze
 * @returns {Array} Detected fields
 */
async function detectFieldsBasic(formElements) {
  const detectedFields = [];
  
  try {
    for (const element of formElements) {
      try {
        const fieldData = detectFieldBasic(element);
        if (fieldData) {
          detectedFields.push(fieldData);
        }
      } catch (error) {
        console.warn('Basic detection failed for element:', error);
      }
    }
    
    return detectedFields.sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error('Basic field detection failed:', error);
    return []; // Return empty array on failure
  }
}

/**
 * Basic field detection for single element
 * @param {HTMLElement} element - Form element
 * @returns {Object|null} Field data
 */
function detectFieldBasic(element) {
  const attributes = getElementAttributes(element);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [fieldType, pattern] of Object.entries(FIELD_PATTERNS)) {
    const score = calculateFieldScore(attributes, pattern);
    
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = {
        element: element,
        category: fieldType,
        confidence: Math.min(score, 0.9),
        priority: pattern.priority,
        method: 'basic'
      };
    }
  }
  
  return bestMatch;
}

/**
 * Calculate field matching score
 * @param {Object} attributes - Element attributes
 * @param {Object} pattern - Field pattern
 * @returns {number} Score (0-1)
 */
function calculateFieldScore(attributes, pattern) {
  let score = 0;
  const totalKeywords = pattern.keywords.length + (pattern.variations?.length || 0);
  
  for (const attr of pattern.attributes) {
    const value = attributes[attr];
    if (!value) continue;
    
    const normalizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check main keywords
    for (const keyword of pattern.keywords) {
      if (normalizedValue.includes(keyword.replace(/[^a-z0-9]/g, ''))) {
        score += 1.0 / totalKeywords;
      }
    }
    
    // Check variations
    if (pattern.variations) {
      for (const variation of pattern.variations) {
        if (normalizedValue.includes(variation.replace(/[^a-z0-9]/g, ''))) {
          score += 0.8 / totalKeywords;
        }
      }
    }
  }
  
  return Math.min(score, 1.0);
}

/**
 * Get form elements from page
 * @returns {Array} Form elements
 */
function getFormElements() {
  try {
    const selectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input[type="search"]',
      'input:not([type])',
      'textarea',
      'select'
    ];
    
    const elements = [];
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
        debugLog(`Found ${found.length} elements with selector: ${selector}`);
      } catch (error) {
        debugLog(`Error with selector ${selector}:`, error);
      }
    }
    
    // Filter out hidden/disabled elements
    const visibleElements = elements.filter(element => {
      try {
        const isVisible = element.offsetParent !== null && 
                         !element.disabled && 
                         !element.readOnly &&
                         element.type !== 'hidden' &&
                         !element.style.display?.includes('none') &&
                         !element.style.visibility?.includes('hidden');
        return isVisible;
      } catch (error) {
        debugLog('Error checking element visibility:', error);
        return false;
      }
    });
    
    debugLog(`Total elements found: ${elements.length}, Visible: ${visibleElements.length}`);
    return visibleElements;
    
  } catch (error) {
    console.error('Error getting form elements:', error);
    debugLog('getFormElements error:', error);
    return [];
  }
}

/**
 * Get element attributes for analysis
 * @param {HTMLElement} element - Form element
 * @returns {Object} Attributes
 */
function getElementAttributes(element) {
  const attributes = {};
  const attrNames = ['name', 'id', 'class', 'placeholder', 'aria-label', 'title', 'type'];
  
  for (const attr of attrNames) {
    const value = element.getAttribute(attr);
    if (value) {
      attributes[attr] = value;
    }
  }
  
  // Add label text if available
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      attributes.labelText = label.textContent.trim();
    }
  }
  
  return attributes;
}

/**
 * Handle messages from popup/background
 * @param {Object} request - Message request
 * @param {Object} sender - Message sender
 * @param {Function} sendResponse - Response function
 */
async function handleMessage(request, sender, sendResponse) {
  const messageType = request.action || request.type;
  debugLog('Received message:', messageType, request);
  
  try {
    // Handle both action and type properties for compatibility
    
    switch (messageType) {
      case 'ping':
        // Simple ping response to check if content script is active
        sendResponse({ success: true, status: 'ready' });
        return;
        
      case 'detectFields':
      case 'GET_FIELDS':
        debugLog('Processing field detection request...');
        debugLog('Current detected fields:', detectedFields.length);
        
        // If no fields detected yet, try detection now
        if (detectedFields.length === 0) {
          debugLog('No fields cached, running detection now...');
          await detectFormFields();
        }
        
        const fieldResponse = {
          success: true,
          fields: detectedFields.map(field => ({
            category: field.category,
            confidence: Math.round(field.confidence * 100),
            method: field.method || 'basic',
            priority: field.priority
          }))
        };
        
        debugLog('Sending field response:', fieldResponse);
        sendResponse(fieldResponse);
        break;
        
      case 'fillForm':
      case 'FILL_FIELDS':
        debugLog('Processing fill form request...');
        const result = await fillFormFields(request.profileData || request.data);
        debugLog('Fill result:', result);
        sendResponse(result);
        break;
        
      case 'START_SMART_FILL':
        debugLog('Processing smart fill request...');
        if (isAdvancedMode && autoFillEngine) {
          const smartResult = await autoFillEngine.startAutoFill(detectedFields, request.data.profileData);
          sendResponse({ success: true, result: smartResult });
        } else {
          // Fallback to basic fill
          const basicResult = await fillFormFields(request.data);
          sendResponse(basicResult);
        }
        break;
        
      case 'EXECUTE_FILL':
        if (isAdvancedMode && autoFillEngine) {
          const execResult = await autoFillEngine.executeFill(request.data.selectedFields);
          sendResponse({ success: true, result: execResult });
        } else {
          sendResponse({ success: false, error: 'Advanced mode not available' });
        }
        break;
        
      case 'REFRESH_DETECTION':
        debugLog('Refreshing field detection...');
        await detectFormFields();
        sendResponse({ success: true, fieldCount: detectedFields.length });
        break;
        
      default:
        console.warn('Auto-Fill: Unknown message type:', messageType);
        sendResponse({ success: false, error: 'Unknown message type: ' + messageType });
    }
  } catch (error) {
    console.error('Auto-Fill: Message handling error:', error);
    debugLog('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Fill form fields with profile data
 * @param {Object} profileData - User profile data
 * @returns {Object} Fill result
 */
async function fillFormFields(profileData) {
  const results = {
    filled: 0,
    failed: 0,
    total: detectedFields.length,
    errors: []
  };
  
  for (const fieldData of detectedFields) {
    try {
      const value = getFieldValue(fieldData.category, profileData);
      
      if (value && fieldData.element) {
        const success = await fillField(fieldData.element, value);
        
        if (success) {
          results.filled++;
        } else {
          results.failed++;
          results.errors.push(`Failed to fill ${fieldData.category}`);
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error filling ${fieldData.category}: ${error.message}`);
    }
  }
  
  return {
    success: results.failed === 0,
    results: results
  };
}

/**
 * Get field value from profile data
 * @param {string} category - Field category
 * @param {Object} profileData - Profile data
 * @returns {string|null} Field value
 */
function getFieldValue(category, profileData) {
  // Handle name fields with proper logic
  switch (category) {
    case 'firstName':
      return profileData.personal?.firstName || null;
      
    case 'lastName':
      return profileData.personal?.lastName || null;
      
    case 'fullName':
      // Only combine names if both exist, otherwise return single name
      const firstName = profileData.personal?.firstName || '';
      const lastName = profileData.personal?.lastName || '';
      return `${firstName} ${lastName}`.trim() || null;
      
    case 'email':
      return profileData.personal?.email || null;
      
    case 'phoneNumber':
      return profileData.personal?.phone?.full || null;
      
    case 'phoneCountryCode':
      return profileData.personal?.phone?.countryCode || null;
      
    case 'addressLine1':
      return profileData.personal?.address?.line1 || null;
      
    case 'addressLine2':
      return profileData.personal?.address?.line2 || null;
      
    case 'city':
      return profileData.personal?.address?.city || null;
      
    case 'postalCode':
      return profileData.personal?.address?.postalCode || null;
      
    case 'country':
      return profileData.personal?.address?.country || null;
      
    case 'jobTitle':
      return profileData.professional?.experiences?.[0]?.title || null;
      
    case 'company':
      return profileData.professional?.experiences?.[0]?.company || null;
      
    case 'jobDescription':
      return profileData.professional?.experiences?.[0]?.description || null;
      
    case 'skills':
      return profileData.professional?.skills?.join(', ') || null;
      
    default:
      return null;
  }
}

/**
 * Fill individual form field
 * @param {HTMLElement} element - Form element
 * @param {string} value - Value to fill
 * @returns {boolean} Success status
 */
async function fillField(element, value) {
  try {
    // Focus the element
    element.focus();
    
    // Clear existing value
    element.value = '';
    
    // Fill based on element type
    if (element.tagName === 'SELECT') {
      return selectOption(element, value);
    } else {
      element.value = value;
    }
    
    // Trigger events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error('Fill field error:', error);
    return false;
  }
}

/**
 * Select option in dropdown
 * @param {HTMLSelectElement} selectElement - Select element
 * @param {string} value - Value to select
 * @returns {boolean} Success status
 */
function selectOption(selectElement, value) {
  const options = Array.from(selectElement.options);
  
  // Try exact match
  let option = options.find(opt => opt.value === value || opt.text === value);
  
  // Try partial match
  if (!option) {
    option = options.find(opt => 
      opt.text.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(opt.text.toLowerCase())
    );
  }
  
  if (option) {
    selectElement.selectedIndex = option.index;
    return true;
  }
  
  return false;
}

/**
 * Identify job portal
 * @returns {Object|null} Portal configuration
 */
function identifyJobPortal() {
  const hostname = window.location.hostname.toLowerCase();
  const fullUrl = window.location.href.toLowerCase();
  
  const portals = {
    'linkedin.com': { name: 'LinkedIn', type: 'professional' },
    'indeed.com': { name: 'Indeed', type: 'job_board' },
    'glassdoor.com': { name: 'Glassdoor', type: 'job_board' },
    'monster.com': { name: 'Monster', type: 'job_board' },
    'ziprecruiter.com': { name: 'ZipRecruiter', type: 'job_board' },
    'careerbuilder.com': { name: 'CareerBuilder', type: 'job_board' },
    'jobs.com': { name: 'Jobs.com', type: 'job_board' },
    '127.0.0.1': { name: 'Test Portal', type: 'test_portal' },
    'localhost': { name: 'Test Portal', type: 'test_portal' }
  };
  
  // Check for test portal specifically
  if (fullUrl.includes('job-portal-test.html') || 
      hostname === '127.0.0.1' || 
      hostname === 'localhost') {
    return { name: 'Test Portal', type: 'test_portal' };
  }
  
  for (const [domain, config] of Object.entries(portals)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  
  return null;
}

/**
 * Set up mutation observer for dynamic content
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const hasFormElements = node.matches?.('input, select, textarea') ||
                                  node.querySelector?.('input, select, textarea');
            
            if (hasFormElements) {
              shouldRedetect = true;
            }
          }
        });
      }
    });
    
    if (shouldRedetect) {
      console.log('Auto-Fill: New form elements detected, re-scanning...');
      setTimeout(() => detectFormFields(), 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeContentScript, 100); // Small delay to ensure all scripts are loaded
  });
} else {
  // DOM already loaded
  setTimeout(initializeContentScript, 100);
}