/**
 * Workdays Portal - Field Detection Module
 * Detects form fields specific to Workday job application portals
 */

const WorkdaysDetector = {
  /**
   * Workdays-specific field selectors and patterns
   */
  fieldPatterns: {
    // Name fields
    firstName: {
      selectors: [
        'input[id*="legalName--firstName"]',
        'input[name*="legalName--firstName"]',
        'input[data-automation-id*="legalName--firstName"]'
      ],
      type: 'text'
    },
    lastName: {
      selectors: [
        'input[id*="legalName--lastName"]',
        'input[name*="legalName--lastName"]',
        'input[data-automation-id*="legalName--lastName"]'
      ],
      type: 'text'
    },
    localFirstName: {
      selectors: [
        'input[id*="legalName--firstNameLocal"]',
        'input[name*="legalName--firstNameLocal"]'
      ],
      type: 'text'
    },
    localLastName: {
      selectors: [
        'input[id*="legalName--lastNameLocal"]',
        'input[name*="legalName--lastNameLocal"]'
      ],
      type: 'text'
    },
    
    // Address fields
    addressLine1: {
      selectors: [
        'input[id*="addressLine1"]',
        'input[name="addressLine1"]',
        'input[data-automation-id*="addressLine1"]'
      ],
      type: 'text'
    },
    addressLine2: {
      selectors: [
        'input[id*="addressLine2"]',
        'input[name="addressLine2"]',
        'input[data-automation-id*="addressLine2"]'
      ],
      type: 'text'
    },
    city: {
      selectors: [
        'input[id*="city"]',
        'input[name="city"]',
        'input[data-automation-id*="city"]'
      ],
      type: 'text'
    },
    postalCode: {
      selectors: [
        'input[id*="postalCode"]',
        'input[name="postalCode"]',
        'input[data-automation-id*="postalCode"]'
      ],
      type: 'text'
    },
    state: {
      selectors: [
        'button[id*="countryRegion"]',
        'button[name="countryRegion"]',
        'input[type="text"][class*="css-77hcv"]' // Hidden input for dropdown
      ],
      type: 'dropdown'
    },
    country: {
      selectors: [
        'button[id*="country--country"]',
        'button[name="country"]'
      ],
      type: 'dropdown'
    },
    
    // Phone fields
    phoneNumber: {
      selectors: [
        'input[id*="phoneNumber--phoneNumber"]',
        'input[name="phoneNumber"]',
        'input[data-automation-id*="phoneNumber"]'
      ],
      type: 'text'
    },
    phoneType: {
      selectors: [
        'button[id*="phoneType"]',
        'button[name="phoneType"]'
      ],
      type: 'dropdown'
    },
    countryPhoneCode: {
      selectors: [
        'input[id*="countryPhoneCode"]',
        'div[data-automation-id="multiSelectContainer"][id*="countryPhoneCode"]'
      ],
      type: 'multiselect'
    },
    phoneExtension: {
      selectors: [
        'input[id*="extension"]',
        'input[name="extension"]'
      ],
      type: 'text'
    },
    
    // Email field (usually read-only in Workdays)
    email: {
      selectors: [
        'span[id="emailAddress"]',
        'input[id*="emailAddress"]',
        'input[name*="email"]'
      ],
      type: 'text'
    },
    
    // Source/Referral
    source: {
      selectors: [
        'input[id*="source--source"]',
        'div[data-automation-id="multiSelectContainer"]'
      ],
      type: 'multiselect'
    }
  },

  /**
   * Detects if current page is a Workdays application form
   */
  isWorkdaysForm() {
    const indicators = [
      document.querySelector('[data-automation-id="applyFlowPage"]'),
      document.querySelector('[data-automation-id="applyFlowMyInfoPage"]'),
      document.querySelector('[data-automation-id="formField-legalName--firstName"]'),
      window.location.hostname.includes('myworkdayjobs.com'),
      window.location.hostname.includes('wd5.myworkdayjobs')
    ];
    
    return indicators.some(indicator => indicator);
  },

  /**
   * Detects all form fields on the page
   * @returns {Object} Detected fields with metadata
   */
  detectFields() {
    if (!this.isWorkdaysForm()) {
      console.log('[Workdays Detector] Not a Workdays form, skipping detection');
      return null;
    }

    console.log('[Workdays Detector] Starting field detection...');
    const detectedFields = {};
    let fieldCount = 0;

    // Iterate through field patterns
    for (const [fieldKey, fieldConfig] of Object.entries(this.fieldPatterns)) {
      for (const selector of fieldConfig.selectors) {
        const element = document.querySelector(selector);
        
        if (element) {
          detectedFields[fieldKey] = {
            element: element,
            type: fieldConfig.type,
            selector: selector,
            currentValue: this.getElementValue(element, fieldConfig.type),
            isRequired: this.isFieldRequired(element),
            isVisible: this.isFieldVisible(element),
            label: this.getFieldLabel(element)
          };
          
          fieldCount++;
          console.log(`[Workdays Detector] Found: ${fieldKey} (${fieldConfig.type})`);
          break; // Stop after first match
        }
      }
    }

    console.log(`[Workdays Detector] Detection complete. Found ${fieldCount} fields.`);
    
    return {
      portalType: 'workdays',
      detectionTimestamp: new Date().toISOString(),
      url: window.location.href,
      fieldCount: fieldCount,
      fields: detectedFields
    };
  },

  /**
   * Gets the current value of an element based on type
   */
  getElementValue(element, type) {
    switch (type) {
      case 'text':
        return element.value || element.textContent || '';
      case 'dropdown':
        return element.textContent || element.value || '';
      case 'multiselect':
        const selectedPill = element.querySelector('[data-automation-id="selectedItem"]');
        return selectedPill ? selectedPill.textContent : '';
      default:
        return '';
    }
  },

  /**
   * Checks if field is required
   */
  isFieldRequired(element) {
    return element.hasAttribute('aria-required') && 
           element.getAttribute('aria-required') === 'true' ||
           element.closest('[data-automation-id^="formField"]')?.querySelector('abbr[aria-hidden="true"]') !== null;
  },

  /**
   * Checks if field is visible
   */
  isFieldVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  },

  /**
   * Gets the label text for a field
   */
  getFieldLabel(element) {
    // Try to find label by 'for' attribute
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent.replace(/\*/g, '').trim();
      }
    }
    
    // Try to find label in parent container
    const container = element.closest('[data-automation-id^="formField"]');
    if (container) {
      const label = container.querySelector('label');
      if (label) {
        return label.textContent.replace(/\*/g, '').trim();
      }
    }
    
    return '';
  },

  /**
   * Detects multi-step form progress
   */
  getFormProgress() {
    const progressBar = document.querySelector('[data-automation-id="progressBar"]');
    if (!progressBar) return null;

    const steps = progressBar.querySelectorAll('li[data-automation-id^="progressBar"]');
    const activeStep = progressBar.querySelector('[data-automation-id="progressBarActiveStep"]');
    
    let currentStepIndex = 0;
    let currentStepName = '';
    
    if (activeStep) {
      const stepLabel = activeStep.querySelector('label.css-1uso8fp, label.css-vv2f43');
      currentStepName = stepLabel ? stepLabel.textContent : '';
      currentStepIndex = Array.from(steps).indexOf(activeStep) + 1;
    }

    return {
      currentStep: currentStepIndex,
      totalSteps: steps.length,
      currentStepName: currentStepName,
      steps: Array.from(steps).map(step => {
        const label = step.querySelector('label.css-1uso8fp, label.css-1u51z1n');
        return label ? label.textContent : '';
      })
    };
  },

  /**
   * Main detection entry point
   */
  detect() {
    const formProgress = this.getFormProgress();
    const fields = this.detectFields();
    
    if (!fields) {
      return null;
    }

    return {
      ...fields,
      formProgress: formProgress,
      detectionMethod: 'workdays-specific'
    };
  }
};

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkdaysDetector;
}
