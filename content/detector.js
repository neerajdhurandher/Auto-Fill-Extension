/**
 * Content Script for Field Detection and Auto-Fill
 * Detects form fields on job portal pages and handles auto-filling
 */

// Global state
let detectedFields = [];
let portalConfig = null;
let isInitialized = false;

// Field type mappings
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

// Common field patterns for job applications
const FIELD_PATTERNS = {
  firstName: {
    keywords: ['first-name', 'firstname', 'first_name', 'fname', 'given-name'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 10
  },
  lastName: {
    keywords: ['last-name', 'lastname', 'last_name', 'lname', 'family-name', 'surname'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 10
  },
  fullName: {
    keywords: ['name', 'full-name', 'fullname', 'applicant-name', 'candidate-name'],
    attributes: ['name', 'id', 'class', 'placeholder', 'aria-label'],
    priority: 9
  },
  email: {
    keywords: ['email', 'e-mail', 'email-address', 'contact-email'],
    attributes: ['name', 'id', 'class', 'type', 'placeholder'],
    priority: 9
  },
  phoneNumber: {
    keywords: ['phone', 'telephone', 'mobile', 'cell', 'contact-number', 'phone-number'],
    attributes: ['name', 'id', 'class', 'type', 'placeholder'],
    priority: 8
  },
  phoneCountryCode: {
    keywords: ['country-code', 'country_code', 'phone-country', 'dial-code'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7
  },
  addressLine1: {
    keywords: ['address', 'address-line-1', 'address1', 'street', 'street-address'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7
  },
  addressLine2: {
    keywords: ['address-line-2', 'address2', 'apartment', 'apt', 'suite', 'unit'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6
  },
  city: {
    keywords: ['city', 'town', 'locality'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7
  },
  postalCode: {
    keywords: ['postal', 'zip', 'pincode', 'postcode', 'postal-code'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7
  },
  country: {
    keywords: ['country', 'nation', 'nationality'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 7
  },
  jobTitle: {
    keywords: ['title', 'position', 'job-title', 'role', 'designation'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6
  },
  company: {
    keywords: ['company', 'employer', 'organization', 'workplace', 'firm'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 6
  },
  jobDescription: {
    keywords: ['description', 'job-description', 'responsibilities', 'duties'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  jobLocation: {
    keywords: ['job-location', 'work-location', 'office-location'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  startDate: {
    keywords: ['start-date', 'from-date', 'begin-date', 'employment-start'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  endDate: {
    keywords: ['end-date', 'to-date', 'until-date', 'employment-end'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  currentJob: {
    keywords: ['current', 'present', 'currently-working', 'still-employed'],
    attributes: ['name', 'id', 'class', 'value'],
    priority: 5
  },
  experience: {
    keywords: ['experience', 'years', 'work-experience', 'professional-experience'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  skills: {
    keywords: ['skills', 'technical-skills', 'expertise', 'competencies', 'technologies'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 5
  },
  resume: {
    keywords: ['resume', 'cv', 'curriculum', 'upload', 'file', 'document'],
    attributes: ['name', 'id', 'class', 'accept'],
    priority: 4
  },
  coverLetter: {
    keywords: ['cover-letter', 'coverletter', 'letter', 'motivation', 'message'],
    attributes: ['name', 'id', 'class', 'placeholder'],
    priority: 3
  }
};

/**
 * Initialize content script
 */
function initializeContentScript() {
  if (isInitialized) return;
  
  console.log('Auto-Fill: Initializing content script on', window.location.hostname);
  
  // Load portal-specific configuration
  loadPortalConfiguration();
  
  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Set up mutation observer for dynamic content
  setupMutationObserver();
  
  // Initial field detection
  setTimeout(() => {
    detectFormFields();
  }, 1000); // Wait for page to load
  
  isInitialized = true;
}

/**
 * Load portal-specific configuration
 */
async function loadPortalConfiguration() {
  try {
    const hostname = window.location.hostname;
    const portalName = getPortalName(hostname);
    
    if (portalName) {
      // Load portal config from storage or use defaults
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings'
      });
      
      if (response && response.success) {
        const portalConfigs = response.settings.portalConfigs || getDefaultPortalConfigs();
        portalConfig = portalConfigs[portalName];
      }
    }
  } catch (error) {
    console.error('Error loading portal configuration:', error);
  }
}

/**
 * Get portal name from hostname
 * @param {string} hostname - Website hostname
 * @returns {string|null} Portal name or null
 */
function getPortalName(hostname) {
  const portals = {
    'linkedin.com': 'linkedin',
    'indeed.com': 'indeed',
    'glassdoor.com': 'glassdoor',
    'monster.com': 'monster',
    'ziprecruiter.com': 'ziprecruiter'
  };
  
  for (const [domain, name] of Object.entries(portals)) {
    if (hostname.includes(domain)) {
      return name;
    }
  }
  
  return null;
}

/**
 * Handle messages from popup and background script
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'ping':
      sendResponse({ success: true, status: 'alive' });
      break;
      
    case 'detectFields':
      handleDetectFieldsRequest(sendResponse);
      break;
      
    case 'fillForm':
      handleFillFormRequest(message.profileData, sendResponse);
      break;
      
    case 'getFormData':
      sendResponse({ 
        success: true, 
        fields: detectedFields,
        portal: getPortalName(window.location.hostname)
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Async response
}

/**
 * Handle field detection request from popup
 * @param {Function} sendResponse - Response callback
 */
async function handleDetectFieldsRequest(sendResponse) {
  try {
    await detectFormFields();
    
    // Report detection to background script
    chrome.runtime.sendMessage({
      action: 'reportFieldDetection',
      fieldsCount: detectedFields.length,
      portal: getPortalName(window.location.hostname)
    });
    
    sendResponse({
      success: true,
      fields: detectedFields,
      portal: getPortalName(window.location.hostname)
    });
  } catch (error) {
    console.error('Field detection failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle form filling request from popup
 * @param {Object} profileData - User profile data
 * @param {Function} sendResponse - Response callback
 */
async function handleFillFormRequest(profileData, sendResponse) {
  try {
    const filledCount = await fillFormWithProfile(profileData);
    
    // Report fill success to background script
    chrome.runtime.sendMessage({
      action: 'reportFillSuccess',
      fieldsFilledCount: filledCount
    });
    
    sendResponse({ success: true, fieldsFilledCount: filledCount });
  } catch (error) {
    console.error('Form filling failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Detect form fields on the current page
 */
async function detectFormFields() {
  detectedFields = [];
  
  // Get all input, select, and textarea elements
  const formElements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
  );
  
  console.log(`Auto-Fill: Found ${formElements.length} form elements`);
  
  for (const element of formElements) {
    const fieldInfo = analyzeFormField(element);
    if (fieldInfo) {
      detectedFields.push(fieldInfo);
    }
  }
  
  // Sort by priority (higher priority first)
  detectedFields.sort((a, b) => b.priority - a.priority);
  
  console.log(`Auto-Fill: Detected ${detectedFields.length} relevant fields:`, 
    detectedFields.map(f => `${f.type}:${f.category}`));
  
  return detectedFields;
}

/**
 * Analyze a form field to determine its purpose
 * @param {HTMLElement} element - Form element to analyze
 * @returns {Object|null} Field information or null if not relevant
 */
function analyzeFormField(element) {
  if (!element || !isVisible(element)) {
    return null;
  }
  
  const fieldInfo = {
    element: element,
    tagName: element.tagName.toLowerCase(),
    type: getFieldType(element),
    attributes: getElementAttributes(element),
    category: null,
    priority: 0,
    confidence: 0
  };
  
  // Try portal-specific detection first
  const portalMatch = tryPortalSpecificDetection(element);
  if (portalMatch) {
    fieldInfo.category = portalMatch.category;
    fieldInfo.priority = portalMatch.priority;
    fieldInfo.confidence = portalMatch.confidence;
    return fieldInfo;
  }
  
  // Generic pattern matching
  const patternMatch = matchFieldPatterns(element);
  if (patternMatch) {
    fieldInfo.category = patternMatch.category;
    fieldInfo.priority = patternMatch.priority;
    fieldInfo.confidence = patternMatch.confidence;
    return fieldInfo;
  }
  
  return null;
}

/**
 * Try portal-specific field detection
 * @param {HTMLElement} element - Form element
 * @returns {Object|null} Match result or null
 */
function tryPortalSpecificDetection(element) {
  if (!portalConfig || !portalConfig.selectors) {
    return null;
  }
  
  for (const [category, selectors] of Object.entries(portalConfig.selectors)) {
    for (const selector of selectors) {
      if (element.matches(selector)) {
        return {
          category: category,
          priority: FIELD_PATTERNS[category]?.priority || 1,
          confidence: 0.9
        };
      }
    }
  }
  
  return null;
}

/**
 * Match field against generic patterns
 * @param {HTMLElement} element - Form element
 * @returns {Object|null} Match result or null
 */
function matchFieldPatterns(element) {
  const attributes = getElementAttributes(element);
  const allText = Object.values(attributes).join(' ').toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [category, pattern] of Object.entries(FIELD_PATTERNS)) {
    let score = 0;
    let matchCount = 0;
    
    // Check keywords against all attributes
    for (const keyword of pattern.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        score += 10;
        matchCount++;
      }
    }
    
    // Bonus for email type fields
    if (category === 'email' && element.type === 'email') {
      score += 20;
    }
    
    // Bonus for tel type fields
    if (category === 'phone' && element.type === 'tel') {
      score += 20;
    }
    
    // Bonus for file type fields
    if (category === 'resume' && element.type === 'file') {
      score += 15;
    }
    
    // Bonus for textarea fields
    if ((category === 'experience' || category === 'coverLetter') && 
        element.tagName.toLowerCase() === 'textarea') {
      score += 10;
    }
    
    // Calculate confidence
    const confidence = Math.min(score / 20, 1);
    
    if (score > bestScore && confidence > 0.3) {
      bestScore = score;
      bestMatch = {
        category: category,
        priority: pattern.priority,
        confidence: confidence
      };
    }
  }
  
  return bestMatch;
}

/**
 * Get field type from element
 * @param {HTMLElement} element - Form element
 * @returns {string} Field type
 */
function getFieldType(element) {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'input') {
    return element.type || 'text';
  } else if (tagName === 'select') {
    return 'select';
  } else if (tagName === 'textarea') {
    return 'textarea';
  }
  
  return 'unknown';
}

/**
 * Get all relevant attributes from an element
 * @param {HTMLElement} element - Form element
 * @returns {Object} Attributes object
 */
function getElementAttributes(element) {
  const attributes = {};
  
  // Get common attributes
  const attrNames = ['name', 'id', 'class', 'placeholder', 'aria-label', 'title', 'type'];
  
  for (const attr of attrNames) {
    const value = element.getAttribute(attr);
    if (value) {
      attributes[attr] = value;
    }
  }
  
  // Get surrounding label text
  const label = findAssociatedLabel(element);
  if (label) {
    attributes.label = label;
  }
  
  return attributes;
}

/**
 * Find label associated with form element
 * @param {HTMLElement} element - Form element
 * @returns {string|null} Label text or null
 */
function findAssociatedLabel(element) {
  // Check for explicit label association
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // Check for implicit label association (element inside label)
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.trim();
  }
  
  // Check for nearby text
  const previousElement = element.previousElementSibling;
  if (previousElement && previousElement.textContent) {
    return previousElement.textContent.trim();
  }
  
  return null;
}

/**
 * Check if element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is visible
 */
function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
}

/**
 * Fill form with user profile data
 * @param {Object} profileData - User profile data
 * @returns {number} Number of fields filled
 */
async function fillFormWithProfile(profileData) {
  let filledCount = 0;
  
  for (const field of detectedFields) {
    const value = getValueForField(field, profileData);
    
    if (value && fillField(field.element, value)) {
      filledCount++;
      
      // Add visual feedback
      highlightFilledField(field.element);
      
      // Small delay to make filling visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Auto-Fill: Filled ${filledCount} fields`);
  return filledCount;
}

/**
 * Get value for field from profile data
 * @param {Object} field - Field information
 * @param {Object} profileData - User profile data
 * @returns {string|null} Value to fill or null
 */
function getValueForField(field, profileData) {
  const { category } = field;
  const { personal, professional } = profileData;
  
  switch (category) {
    case 'firstName':
      return personal?.firstName || '';
    
    case 'lastName':
      return personal?.lastName || '';
    
    case 'fullName':
      // Merge first and last name if available
      const firstName = personal?.firstName || '';
      const lastName = personal?.lastName || '';
      return `${firstName} ${lastName}`.trim() || personal?.name || '';
    
    case 'email':
      return personal?.email;
    
    case 'phoneNumber':
      return personal?.phone?.number;
    
    case 'phoneCountryCode':
      return personal?.phone?.countryCode || '+1';
    
    case 'addressLine1':
      return personal?.address?.line1;
    
    case 'addressLine2':
      return personal?.address?.line2;
    
    case 'city':
      return personal?.address?.city;
    
    case 'postalCode':
      return personal?.address?.postalCode;
    
    case 'country':
      return personal?.address?.country;
    
    case 'jobTitle':
      return professional?.experience?.[0]?.jobTitle || '';
    
    case 'company':
      return professional?.experience?.[0]?.company || '';
    
    case 'jobDescription':
      return professional?.experience?.[0]?.description || '';
    
    case 'jobLocation':
      return professional?.experience?.[0]?.location || '';
    
    case 'startDate':
      return professional?.experience?.[0]?.startDate || '';
    
    case 'endDate':
      return professional?.experience?.[0]?.endDate || '';
    
    case 'currentJob':
      return professional?.experience?.[0]?.currentJob ? 'true' : 'false';
    
    case 'experience':
      // Calculate total years or use existing value
      if (professional?.experience?.length > 0) {
        const totalYears = calculateTotalExperience(professional.experience);
        return `${totalYears} years of experience`;
      }
      return professional?.totalYears ? `${professional.totalYears} years` : '';
    
    case 'skills':
      return professional?.skills?.join(', ') || '';
    
    case 'coverLetter':
      return professional?.coverLetter || 
             'I am interested in this position and believe my skills and experience make me a great fit.';
    
    default:
      return null;
  }
}

/**
 * Calculate total years of experience from job history
 * @param {Array} experiences - Array of job experiences
 * @returns {number} Total years of experience
 */
function calculateTotalExperience(experiences) {
  let totalMonths = 0;
  
  for (const job of experiences) {
    if (job.startDate) {
      const startDate = new Date(job.startDate);
      const endDate = job.currentJob ? new Date() : new Date(job.endDate || new Date());
      
      if (startDate && endDate && endDate >= startDate) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
        totalMonths += months;
      }
    }
  }
  
  return Math.round(totalMonths / 12);
}

/**
 * Fill a form field with value
 * @param {HTMLElement} element - Form element
 * @param {string} value - Value to fill
 * @returns {boolean} Whether filling was successful
 */
function fillField(element, value) {
  try {
    if (!value || !element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const fieldType = element.type?.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
      // Set value
      element.value = value;
      
      // Trigger events to notify the page
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    } else if (tagName === 'select') {
      // Try to select matching option
      const options = Array.from(element.options);
      const matchingOption = options.find(option => 
        option.textContent.toLowerCase().includes(value.toLowerCase()) ||
        option.value.toLowerCase().includes(value.toLowerCase())
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error filling field:', error);
    return false;
  }
}

/**
 * Highlight filled field with visual feedback
 * @param {HTMLElement} element - Form element
 */
function highlightFilledField(element) {
  const originalBorder = element.style.border;
  const originalBackgroundColor = element.style.backgroundColor;
  
  // Add highlight
  element.style.border = '2px solid #ffe600';
  element.style.backgroundColor = '#fffbcc';
  
  // Remove highlight after delay
  setTimeout(() => {
    element.style.border = originalBorder;
    element.style.backgroundColor = originalBackgroundColor;
  }, 1500);
}

/**
 * Set up mutation observer for dynamic content
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if new form elements were added
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

/**
 * Get default portal configurations
 * @returns {Object} Default configurations
 */
function getDefaultPortalConfigs() {
  return {
    linkedin: {
      selectors: {
        name: ['input[name*="firstName"]', 'input[name*="lastName"]'],
        email: ['input[name*="email"]', 'input[type="email"]'],
        phone: ['input[name*="phone"]', 'input[type="tel"]']
      }
    },
    indeed: {
      selectors: {
        name: ['input[name="applicant.name"]'],
        email: ['input[name="applicant.emailAddress"]'],
        phone: ['input[name="applicant.phoneNumber"]']
      }
    }
  };
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}