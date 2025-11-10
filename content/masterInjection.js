/**
 * Master Form Injection Engine
 * Handles intelligent form filling with profile data mapping and DOM manipulation
 * Extracted from masterDetector.js for better separation of concerns
 */

console.log('Master Injection Engine: Loading...');

// Prevent multiple initialization
if (window.masterInjectionLoaded) {
  console.log('Master Injection Engine already loaded');
} else {
  window.masterInjectionLoaded = true;
  console.log('Master Injection Engine: First load');
}

// ============================================================================
// FORM FILLING FUNCTIONS
// ============================================================================

/**
 * Main form filling function that orchestrates the entire process
 * @param {Object} profileData - User profile data to fill into form
 * @param {Array} detectedFields - Array of detected form fields (optional, will detect if not provided)
 * @returns {Object} Fill results with count and details
 */
function fillFormWithProfileData(profileData, detectedFields = null) {
  console.log('Master Injection: Starting intelligent form filling...');
  console.log('Profile data received:', profileData);
  console.log('Profile data structure (detailed):', JSON.stringify(profileData, null, 2));
  
  // Use provided fields or get from global detectedFields
  const fieldsToFill = detectedFields || (window.detectedFields || []);
  console.log('Available fields for filling:', fieldsToFill.length);
  
  if (fieldsToFill.length === 0) {
    console.warn('WARNING: No fields available for filling!');
    
    // Try to get fields from window.masterDetector if available
    if (window.masterDetector && typeof window.masterDetector.detectFormFields === 'function') {
      console.log('Attempting to detect fields using masterDetector...');
      const newFields = window.masterDetector.detectFormFields();
      fieldsToFill.push(...(newFields || []));
    }
    
    if (fieldsToFill.length === 0) {
      console.error('ERROR: Still no fields available for filling!');
      return { 
        filledCount: 0, 
        fillResults: [], 
        totalFields: 0, 
        error: 'No fields available for filling',
        success: false 
      };
    }
  }
  
  let filledCount = 0;
  const fillResults = [];
  const fillErrors = [];
  
  fieldsToFill.forEach((field, index) => {
    const element = field.element;
    
    console.log(`Processing field ${index}:`, {
      category: field.category,
      confidence: field.confidence,
      methods: field.methods,
      element: element?.tagName + (element?.type ? `[${element.type}]` : ''),
      name: field.name,
      id: field.id
    });
    
    if (!element || element.readOnly || element.disabled) {
      console.log(`Skipping field ${index}: element unavailable or disabled`);
      return;
    }
    
    // Skip low-confidence matches for safety
    if (field.confidence < 0.3) {
      console.log(`Skipping field ${index}: confidence too low (${field.confidence})`);
      return;
    }
    
    // Set current element for validation context
    window.currentProcessingElement = element;
    
    const value = getValueForField(field.category, profileData);
    
    console.log(`Field ${index} (${field.category}):`, {
      requestedCategory: field.category,
      retrievedValue: value,
      valueType: typeof value,
      elementTagName: element.tagName,
      elementType: element.type
    });
    
    if (value) {
      console.log(`Filling field ${index} (${field.category}) with:`, value);
      
      const fillResult = fillFormField(element, value);
      
      if (fillResult.success) {
        // to highlight filled fields
        highlightFields(element, field)
        filledCount++;
        fillResults.push({
          field: field.category,
          value: value,
          confidence: field.confidence,
          methods: field.methods,
          element: element.tagName + (element.type ? `[${element.type}]` : ''),
          actualValue: fillResult.actualValue
        });
        console.log(`Successfully filled field ${index}`);
      } else {
        console.log(`Failed to fill field ${index}:`, fillResult.error);
        fillErrors.push({
          field: field.category,
          error: fillResult.error,
          index: index
        });
      }
    } else {
      console.log(`No value available for field ${index} (${field.category})`);
    }
  });
  
  console.log(`Master Injection: Form filling completed. ${filledCount}/${fieldsToFill.length} fields filled`);
  
  // remove all filled (highlighted) fields after 1 second
  setTimeout(removeHighlights, 3000);
    
  const result = {
    filledCount,
    fillResults,
    totalFields: fieldsToFill.length,
    fillErrors,
    success: filledCount > 0,
    profileDataReceived: !!profileData,
    fieldsProcessed: fieldsToFill.length
  };
  
  return result;
}

/**
 * Validates field mapping and corrects misdetected fields
 * @param {string} category - Detected field category
 * @param {Object} profileData - Profile data object
 * @returns {string|null} Corrected value or null to continue with standard mapping
 */
function validateAndCorrectFieldMapping(category, profileData) {
  // Get current element being processed (from call stack context)
  const currentElement = getCurrentProcessingElement();
  
  // Only handle misdetected firstName/lastName fields, NOT fullName fields
  if (category === 'fullName' && currentElement) {
    const fieldContext = analyzeElementForNameType(currentElement);
    
    console.log(`🔍 Validation check for fullName field:`, {
      elementName: currentElement.name,
      elementId: currentElement.id,
      isActuallyFirstName: fieldContext.isActuallyFirstName,
      isActuallyLastName: fieldContext.isActuallyLastName
    });
    
    // Only correct if this is clearly a firstName field misdetected as fullName
    if (fieldContext.isActuallyFirstName) {
      const firstName = getNestedProfileValue('personal.firstName', profileData) || getNestedProfileValue('firstName', profileData);
      if (firstName) {
        console.log(`🔧 Correcting misdetected fullName → firstName: "${firstName}"`);
        return firstName;
      }
    }
    
    // Only correct if this is clearly a lastName field misdetected as fullName  
    if (fieldContext.isActuallyLastName) {
      const lastName = getNestedProfileValue('personal.lastName', profileData) || getNestedProfileValue('lastName', profileData);
      if (lastName) {
        console.log(`🔧 Correcting misdetected fullName → lastName: "${lastName}"`);
        return lastName;
      }
    }
    
    // For legitimate fullName fields, let the standard mapping handle it
    console.log(`✅ Legitimate fullName field - using standard mapping`);
  }
  
  return null; // Continue with standard mapping
}

/**
 * Get current processing element from global context
 */
function getCurrentProcessingElement() {
  return window.currentProcessingElement || null;
}

/**
 * Analyze element to determine actual name field type
 * @param {HTMLElement} element - Element to analyze
 * @returns {Object} Analysis result
 */
function analyzeElementForNameType(element) {
  if (!element) return { isActuallyFirstName: false, isActuallyLastName: false };
  
  const attributes = [
    element.name || '',
    element.id || '', 
    element.placeholder || '',
    element.className || ''
  ].join(' ').toLowerCase();
  
  const labels = getSurroundingText(element).toLowerCase();
  const allText = `${attributes} ${labels}`;
  
  console.log(`🔍 Analyzing element for name type: "${allText}"`);
  
  // Be very conservative - only flag as misdetected if there are CLEAR indicators
  const hasStrongFirstIndicators = /first|fname|given|forename/.test(allText) && !/last|surname|family/.test(allText);
  const hasStrongLastIndicators = /last|lname|surname|family/.test(allText) && !/first|given|forename/.test(allText);
  
  return {
    isActuallyFirstName: hasStrongFirstIndicators,
    isActuallyLastName: hasStrongLastIndicators
  };
}

/**
 * Get surrounding text for context
 */
function getSurroundingText(element) {
  let text = '';
  
  // Get label text using existing function
  const labelText = findAssociatedLabel ? findAssociatedLabel(element) : '';
  text += labelText + ' ';
  
  // Get placeholder
  text += element.placeholder || '';
  
  // Get parent element text
  const parent = element.parentElement;
  if (parent) {
    text += ' ' + parent.textContent.replace(element.value || '', '').trim();
  }
  
  return text.trim();
}

/**
 * Get full name value from profile data
 */
function getFullNameValue(profileData) {
  // Try to get existing full name or construct it
  const existingFullName = getNestedProfileValue('personal.fullName', profileData) || getNestedProfileValue('fullName', profileData);
  if (existingFullName) return existingFullName;
  
  const firstName = getNestedProfileValue('personal.firstName', profileData) || getNestedProfileValue('firstName', profileData) || '';
  const lastName = getNestedProfileValue('personal.lastName', profileData) || getNestedProfileValue('lastName', profileData) || '';
  
  return `${firstName} ${lastName}`.trim();
}

/**
 * Intelligent name splitter
 * @param {string} fullName - Full name to split
 * @returns {Object} Object with firstName and lastName
 */
function splitFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  
  // Handle middle names: First [Middle...] Last
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1]
  };
}

/**
 * Helper function to get nested values
 */
function getNestedProfileValue(path, profileData) {
  const keys = path.split('.');
  let value = profileData;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  return value;
}

/**
 * Maps profile data categories to actual values using nested object navigation
 * @param {string} category - Field category (e.g., 'firstName', 'email')
 * @param {Object} profileData - User profile data object
 * @returns {string|null} The mapped value or null if not found
 */
function getValueForField(category, profileData) {
  console.log(`🎯 getValueForField called for category: ${category}`);
  console.log('Profile data keys:', Object.keys(profileData || {}));
  
  if (!profileData) {
    console.warn('No profile data provided to getValueForField');
    return null;
  }
  
  // Apply validation and correction for misdetected fields (skip for fullName to keep it simple)
  if (category !== 'fullName') {
    const correctedValue = validateAndCorrectFieldMapping(category, profileData);
    if (correctedValue !== null) {
      return correctedValue;
    }
  }
  
  // Support both nested and flat profile structures
  const getValue = (path) => {
    const keys = path.split('.');
    let value = profileData;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    console.log(`  getValue('${path}') = ${value}`);
    return value;
  };

  // Field mapping with keyword lists for value lookup
  const fieldMappings = {
    // Personal Information
    firstName: ['personal.firstName', 'firstName'],
    lastName: ['personal.lastName', 'lastName'],
    fullName: ['personal.fullName', 'fullName'], // Will be handled specially
    email: ['personal.email', 'email'],
    phone: ['personal.phone.full', 'personal.phone.number', 'phone'],
    phoneNumber: ['personal.phone.full', 'personal.phone.number', 'phoneNumber'],
    
    // Address Information
    addressLine1: ['personal.address.line1', 'addressLine1'],
    addressLine2: ['personal.address.line2', 'addressLine2'],
    address: ['personal.address.line1', 'address'],
    city: ['personal.address.city', 'city'],
    state: ['personal.address.state', 'state'],
    postalCode: ['personal.address.postalCode', 'postalCode'],
    zipCode: ['personal.address.postalCode', 'zipCode'],
    country: ['personal.address.country', 'country'],
    currentLocation: ['personal.currentLocation', 'currentLocation'],
    willingToRelocate: ['personal.willingToRelocate', 'willingToRelocate'],
    
    // Professional Information
    jobTitle: ['professional.experiences.0.title', 'professional.currentTitle', 'jobTitle'],
    currentTitle: ['professional.experiences.0.title', 'professional.currentTitle', 'currentTitle'],
    company: ['professional.experiences.0.company', 'professional.currentCompany', 'company'],
    currentCompany: ['professional.experiences.0.company', 'professional.currentCompany', 'currentCompany'],
    totalExperience: ['professional.totalExperience', 'totalExperience'],
    experience: ['professional.totalExperience', 'experience'],
    currentSalary: ['professional.currentSalary', 'currentSalary'],
    expectedSalary: ['professional.expectedSalary', 'expectedSalary'],
    salary: ['professional.expectedSalary', 'professional.currentSalary', 'salary'],
    noticePeriod: ['professional.noticePeriod', 'noticePeriod'],
    
    // Social/Professional Links
    linkedinUrl: ['professional.linkedinUrl', 'linkedinUrl'],
    linkedin: ['professional.linkedinUrl', 'linkedin'],
    githubUrl: ['professional.githubUrl', 'githubUrl'],
    github: ['professional.githubUrl', 'github'],
    portfolioUrl: ['professional.portfolioUrl', 'portfolioUrl'],
    portfolio: ['professional.portfolioUrl', 'portfolio'],
    website: ['professional.portfolioUrl', 'professional.websiteUrl', 'website'],
    
    // Skills and Education
    skills: ['professional.skills', 'skills'],
    education: ['education.degree', 'education.school', 'education'],
    degree: ['education.degree', 'degree'],
    school: ['education.school', 'education.university', 'school'],
    university: ['education.university', 'education.school', 'university'],
    
    // Cover Letter and Additional
    coverLetter: ['professional.coverLetter', 'coverLetter'],
    summary: ['professional.summary', 'summary'],
    objective: ['professional.objective', 'objective']
  };

  // Function to get value using keyword list
  const getValueFromKeywords = (keywords) => {
    for (const keyword of keywords) {
      const value = getValue(keyword);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  };

  const keywordsForCategory = fieldMappings[category] || [];

  let categoryValue = null;

  if (category === 'fullName') {
    // Special handling for fullName - always use constructed value
    let firstName = getValueFromKeywords(fieldMappings['firstName']);
    let lastName = getValueFromKeywords(fieldMappings['lastName']);
    let fullNameValue = `${firstName} ${lastName}`.trim();
    categoryValue = fullNameValue;
  } else if (category === 'skills') {
    // Special handling for skills array
    const skillsValue = getValueFromKeywords(keywordsForCategory);
    categoryValue = skillsValue ? (Array.isArray(skillsValue) ? skillsValue.join(', ') : skillsValue) : null;
  } else {
    // Standard keyword-based lookup
    categoryValue = getValueFromKeywords(keywordsForCategory);
  }
  
  const result = categoryValue || null;
  console.log(`🎯 getValueForField result for '${category}':`, result);
  
  return result;
}

/**
 * Fills a single form field with the provided value
 * Handles different input types and triggers appropriate events
 * @param {HTMLElement} element - The form element to fill
 * @param {string|boolean} value - The value to fill
 * @returns {Object} Result object with success status and details
 */
function fillFormField(element, value) {
  console.log(`fillFormField called:`, {
    element: element.tagName + (element.type ? `[${element.type}]` : ''),
    elementId: element.id,
    elementName: element.name,
    currentValue: element.value,
    newValue: value,
    readOnly: element.readOnly,
    disabled: element.disabled
  });
  
  try {
    // Validate element and value
    if (!element) {
      return { success: false, error: 'No element provided' };
    }
    
    if (element.readOnly) {
      return { success: false, error: 'Element is read-only' };
    }
    
    if (element.disabled) {
      return { success: false, error: 'Element is disabled' };
    }
    
    if (value === null || value === undefined) {
      return { success: false, error: 'No value provided' };
    }
    
    // Convert value to string for most inputs
    const stringValue = String(value);
    
    // Handle different field types
    if (element.tagName === 'SELECT') {
      // Handle dropdown selections
      const options = Array.from(element.options);
      
      // Try exact value match first
      let matchingOption = options.find(option => 
        option.value === stringValue || option.value === value
      );
      
      // Try exact text match
      if (!matchingOption) {
        matchingOption = options.find(option => 
          option.text === stringValue || option.text === value
        );
      }
      
      // Try case-insensitive matches
      if (!matchingOption) {
        const lowerValue = stringValue.toLowerCase();
        matchingOption = options.find(option => 
          option.value.toLowerCase() === lowerValue ||
          option.text.toLowerCase() === lowerValue
        );
      }
      
      // Try partial matches for experience, salary ranges, etc.
      if (!matchingOption) {
        matchingOption = options.find(option => 
          option.text.toLowerCase().includes(lowerValue) ||
          lowerValue.includes(option.text.toLowerCase())
        );
      }
      
      if (matchingOption) {
        element.selectedIndex = matchingOption.index;
        element.value = matchingOption.value;
      } else {
        console.warn(`No matching option found for value: ${stringValue}`);
        return { 
          success: false, 
          error: `No matching option found for value: ${stringValue}`,
          availableOptions: options.map(opt => ({ value: opt.value, text: opt.text }))
        };
      }
      
    } else if (element.type === 'checkbox') {
      // Handle checkbox fields
      const booleanValue = ['true', '1', 'yes', 'on', 'checked'].includes(stringValue.toLowerCase()) || value === true;
      element.checked = booleanValue;
      
    } else if (element.type === 'radio') {
      // Handle radio button fields
      const booleanValue = ['true', '1', 'yes', 'on', 'checked'].includes(stringValue.toLowerCase()) || value === true;
      element.checked = booleanValue;
      
    } else if (element.type === 'file') {
      // Skip file inputs for security reasons
      return { success: false, error: 'File inputs not supported for security reasons' };
      
    } else {
      // Handle regular text inputs, textareas, email, tel, etc.
      element.value = stringValue;
    }
    
    // Trigger events for framework compatibility (React, Vue, Angular)
    const events = [
      'input',    // For real-time validation
      'change',   // For form state updates  
      'keyup',    // For some event listeners
      'blur'      // For field validation
    ];
    
    events.forEach(eventType => {
      const event = new Event(eventType, { 
        bubbles: true, 
        cancelable: true 
      });
      element.dispatchEvent(event);
    });
    
    // Special handling for React/Vue frameworks that track input values
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }
    
    // Additional React handling
    if (element.__reactInternalInstance || element._reactInternalFiber) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(element, stringValue);
      
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
    }
    
    // Verify the fill was successful
    const actualValue = element.type === 'checkbox' || element.type === 'radio' 
      ? element.checked 
      : element.value;
    
    console.log(`fillFormField completed successfully. Final value: "${actualValue}"`);
    
    return { 
      success: true, 
      actualValue: actualValue,
      expectedValue: element.type === 'checkbox' || element.type === 'radio' ? value : stringValue,
      element: element.tagName + (element.type ? `[${element.type}]` : '')
    };
    
  } catch (error) {
    console.error('Error filling field:', error);
    return { 
      success: false, 
      error: error.message,
      element: element.tagName + (element.type ? `[${element.type}]` : '')
    };
  }
}

/**
 * Validates that a field can be filled before attempting to fill it
 * @param {HTMLElement} element - The form element to validate
 * @param {string} value - The value to validate
 * @returns {Object} Validation result
 */
function validateFieldForFilling(element, value) {
  if (!element) {
    return { valid: false, error: 'No element provided' };
  }
  
  if (element.readOnly) {
    return { valid: false, error: 'Element is read-only' };
  }
  
  if (element.disabled) {
    return { valid: false, error: 'Element is disabled' };
  }
  
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'No value provided' };
  }
  
  // Email validation
  if (element.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }
  
  // URL validation for URL inputs
  if (element.type === 'url') {
    try {
      new URL(value);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
  
  // Length validation
  if (element.maxLength && String(value).length > element.maxLength) {
    return { valid: false, error: `Value too long (max: ${element.maxLength})` };
  }
  
  return { valid: true };
}

/**
 * Utility function to safely get nested object properties
 * @param {Object} obj - Object to search in
 * @param {string} path - Dot-separated path (e.g., 'personal.address.city')
 * @returns {any} The value at the path or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================================================
// EXPORTS AND INITIALIZATION
// ============================================================================

// Export functions for use by other scripts
if (typeof window !== 'undefined') {
  window.masterInjection = {
    fillFormWithProfileData,
    getValueForField,
    fillFormField,
    validateFieldForFilling,
    getNestedValue
  };

  console.log('Master Injection Engine: Loaded and ready');
}

/**
 * Highlight fields to be filled
 */
function highlightFields(element, fieldData) {

    if(element == undefined)
        return

    // Add highlight style
    element.style.outline = '2px solid #ffe600';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(255, 230, 0, 0.1)';
    
    // Add data attribute for cleanup
    element.setAttribute('data-autofill-highlight', 'true');
    
    // Add confidence indicator
    const confidence = Math.round((fieldData?.confidence ?? 0.8) * 100);
    const indicator = document.createElement('div');
    indicator.textContent = `${confidence}%`;
    indicator.style.cssText = `
      position: absolute;
      background: #ffe600;
      color: #1b1a1a;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
    `;
    
    // Position indicator
    const rect = element.getBoundingClientRect();
    indicator.style.top = (window.scrollY + rect.top - 25) + 'px';
    indicator.style.left = (window.scrollX + rect.left) + 'px';
    
    indicator.setAttribute('data-autofill-indicator', 'true');
    document.body.appendChild(indicator);
  
}


/**
 * Remove field highlights
 */
function removeHighlights() {
  // Remove element highlights
  const highlightedElements = document.querySelectorAll('[data-autofill-highlight]');
  highlightedElements.forEach(element => {
    element.style.outline = '';
    element.style.outlineOffset = '';
    element.style.backgroundColor = '';
    element.removeAttribute('data-autofill-highlight');
  });

  // Remove confidence indicators
  const indicators = document.querySelectorAll('[data-autofill-indicator]');
  indicators.forEach(indicator => indicator.remove());
}

