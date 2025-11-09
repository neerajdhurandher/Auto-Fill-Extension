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
 * Maps profile data categories to actual values using nested object navigation
 * @param {string} category - Field category (e.g., 'firstName', 'email')
 * @param {Object} profileData - User profile data object
 * @returns {string|null} The mapped value or null if not found
 */
function getValueForField(category, profileData) {
  console.log(`getValueForField called for category: ${category}`);
  console.log('Profile data keys:', Object.keys(profileData || {}));
  
  if (!profileData) {
    console.warn('No profile data provided to getValueForField');
    return null;
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
  
  const mappings = {
    // Personal Information
    firstName: getValue('personal.firstName') || getValue('firstName'),
    lastName: getValue('personal.lastName') || getValue('lastName'),
    fullName: `${getValue('personal.firstName') || getValue('firstName') || ''} ${getValue('personal.lastName') || getValue('lastName') || ''}`.trim(),
    email: getValue('personal.email') || getValue('email'),
    phone: getValue('personal.phone.full') || getValue('personal.phone.number') || getValue('phone'),
    phoneNumber: getValue('personal.phone.full') || getValue('personal.phone.number') || getValue('phoneNumber'),
    
    // Address Information
    addressLine1: getValue('personal.address.line1') || getValue('addressLine1'),
    addressLine2: getValue('personal.address.line2') || getValue('addressLine2'),
    address: getValue('personal.address.line1') || getValue('address'),
    city: getValue('personal.address.city') || getValue('city'),
    state: getValue('personal.address.state') || getValue('state'),
    postalCode: getValue('personal.address.postalCode') || getValue('postalCode'),
    zipCode: getValue('personal.address.postalCode') || getValue('zipCode'),
    country: getValue('personal.address.country') || getValue('country'),
    currentLocation: getValue('personal.currentLocation') || getValue('currentLocation'),
    willingToRelocate: getValue('personal.willingToRelocate') || getValue('willingToRelocate'),
    
    // Professional Information
    jobTitle: getValue('professional.experiences.0.title') || getValue('professional.currentTitle') || getValue('jobTitle'),
    currentTitle: getValue('professional.experiences.0.title') || getValue('professional.currentTitle') || getValue('currentTitle'),
    company: getValue('professional.experiences.0.company') || getValue('professional.currentCompany') || getValue('company'),
    currentCompany: getValue('professional.experiences.0.company') || getValue('professional.currentCompany') || getValue('currentCompany'),
    totalExperience: getValue('professional.totalExperience') || getValue('totalExperience'),
    experience: getValue('professional.totalExperience') || getValue('experience'),
    currentSalary: getValue('professional.currentSalary') || getValue('currentSalary'),
    expectedSalary: getValue('professional.expectedSalary') || getValue('expectedSalary'),
    salary: getValue('professional.expectedSalary') || getValue('professional.currentSalary') || getValue('salary'),
    noticePeriod: getValue('professional.noticePeriod') || getValue('noticePeriod'),
    
    // Social/Professional Links
    linkedinUrl: getValue('professional.linkedinUrl') || getValue('linkedinUrl'),
    linkedin: getValue('professional.linkedinUrl') || getValue('linkedin'),
    githubUrl: getValue('professional.githubUrl') || getValue('githubUrl'),
    github: getValue('professional.githubUrl') || getValue('github'),
    portfolioUrl: getValue('professional.portfolioUrl') || getValue('portfolioUrl'),
    portfolio: getValue('professional.portfolioUrl') || getValue('portfolio'),
    website: getValue('professional.portfolioUrl') || getValue('professional.websiteUrl') || getValue('website'),
    
    // Skills and Education
    skills: getValue('professional.skills') ? (Array.isArray(getValue('professional.skills')) ? getValue('professional.skills').join(', ') : getValue('professional.skills')) : getValue('skills'),
    education: getValue('education.degree') || getValue('education.school') || getValue('education'),
    degree: getValue('education.degree') || getValue('degree'),
    school: getValue('education.school') || getValue('education.university') || getValue('school'),
    university: getValue('education.university') || getValue('education.school') || getValue('university'),
    
    // Cover Letter and Additional
    coverLetter: getValue('professional.coverLetter') || getValue('coverLetter'),
    summary: getValue('professional.summary') || getValue('summary'),
    objective: getValue('professional.objective') || getValue('objective')
  };
  
  const result = mappings[category] || null;
  console.log(`getValueForField result for '${category}':`, result);
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

