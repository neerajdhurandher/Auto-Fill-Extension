/**
 * Workdays Portal - Field Injection Module
 * Handles auto-filling form fields in Workday job application portals
 */

const WorkdaysInjection = {
  /**
   * Configuration for injection delays and retries
   */
  config: {
    inputDelay: 100,        // Delay between keystrokes (ms)
    dropdownDelay: 300,     // Delay for dropdown interactions (ms)
    fieldDelay: 200,        // Delay between field fills (ms)
    maxRetries: 3,          // Max retry attempts for failed injections
    simulateTyping: true    // Simulate human typing behavior
  },

  /**
   * Main injection entry point
   * @param {Object} detectedFields - Fields detected by WorkdaysDetector
   * @param {Object} profileData - User profile data from storage
   */
  async fillForm(detectedFields, profileData) {
    if (!detectedFields || !detectedFields.fields) {
      console.error('[Workdays Injection] No detected fields provided');
      return { success: false, error: 'No detected fields' };
    }

    console.log('[Workdays Injection] Starting form fill...');
    const results = {
      success: true,
      filled: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // Map profile data to Workdays fields
    const fieldMapping = this.mapProfileToWorkdaysFields(profileData);

    // Fill fields in optimal order
    const fillOrder = this.getOptimalFillOrder(detectedFields.fields);

    for (const fieldKey of fillOrder) {
      const fieldData = detectedFields.fields[fieldKey];
      const value = fieldMapping[fieldKey];

      if (!value || value === '') {
        console.log(`[Workdays Injection] Skipping ${fieldKey} - no data available`);
        results.skipped++;
        continue;
      }

      try {
        const fillResult = await this.fillField(fieldData, value);
        
        if (fillResult.success) {
          results.filled++;
          results.details.push({ field: fieldKey, status: 'success' });
          console.log(`[Workdays Injection] ✓ Filled: ${fieldKey}`);
        } else {
          results.failed++;
          results.details.push({ field: fieldKey, status: 'failed', error: fillResult.error });
          console.warn(`[Workdays Injection] ✗ Failed: ${fieldKey} - ${fillResult.error}`);
        }

        // Delay between fields
        await this.delay(this.config.fieldDelay);
      } catch (error) {
        results.failed++;
        results.details.push({ field: fieldKey, status: 'error', error: error.message });
        console.error(`[Workdays Injection] Error filling ${fieldKey}:`, error);
      }
    }

    console.log(`[Workdays Injection] Fill complete. Filled: ${results.filled}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
    return results;
  },

  /**
   * Maps profile data to Workdays-specific field names
   */
  mapProfileToWorkdaysFields(profileData) {
    return {
      // Name fields
      firstName: profileData.personal?.firstName || '',
      lastName: profileData.personal?.lastName || '',
      localFirstName: profileData.personal?.localFirstName || '',
      localLastName: profileData.personal?.localLastName || '',
      
      // Address fields
      addressLine1: profileData.personal?.addressLine1 || profileData.personal?.address || '',
      addressLine2: profileData.personal?.addressLine2 || '',
      city: profileData.personal?.city || '',
      postalCode: profileData.personal?.postalCode || profileData.personal?.zipCode || '',
      state: profileData.personal?.state || '',
      country: profileData.personal?.country || '',
      
      // Contact fields
      phoneNumber: profileData.personal?.phone || profileData.personal?.phoneNumber || '',
      phoneType: 'Mobile', // Default to Mobile
      countryPhoneCode: profileData.personal?.countryCode || '+91',
      phoneExtension: profileData.personal?.phoneExtension || '',
      email: profileData.personal?.email || ''
    };
  },

  /**
   * Determines optimal fill order (required fields first, then optional)
   */
  getOptimalFillOrder(fields) {
    const required = [];
    const optional = [];

    for (const [fieldKey, fieldData] of Object.entries(fields)) {
      if (fieldData.isRequired) {
        required.push(fieldKey);
      } else {
        optional.push(fieldKey);
      }
    }

    return [...required, ...optional];
  },

  /**
   * Fills a single field based on its type
   */
  async fillField(fieldData, value) {
    if (!fieldData.element || !fieldData.isVisible) {
      return { success: false, error: 'Element not visible or not found' };
    }

    switch (fieldData.type) {
      case 'text':
        return await this.fillTextField(fieldData.element, value);
      
      case 'dropdown':
        return await this.fillDropdown(fieldData.element, value);
      
      case 'multiselect':
        return await this.fillMultiSelect(fieldData.element, value);
      
      default:
        return { success: false, error: 'Unknown field type' };
    }
  },

  /**
   * Fills a text input field with typing simulation
   */
  async fillTextField(element, value) {
    try {
      // Focus the element
      element.focus();
      await this.delay(50);

      // Clear existing value
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      if (this.config.simulateTyping) {
        // Simulate typing character by character
        for (let i = 0; i < value.length; i++) {
          element.value += value[i];
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await this.delay(this.config.inputDelay);
        }
      } else {
        // Fill instantly
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Trigger change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Fills a dropdown field (Workdays uses button-based dropdowns)
   */
  async fillDropdown(element, value) {
    try {
      // Click the dropdown button to open menu
      element.click();
      await this.delay(this.config.dropdownDelay);

      // Find the dropdown menu options
      // Workdays renders dropdown options dynamically after click
      const optionContainer = document.querySelector('[role="listbox"], [role="menu"]');
      
      if (!optionContainer) {
        return { success: false, error: 'Dropdown menu not found' };
      }

      // Search for matching option
      const options = optionContainer.querySelectorAll('[role="option"], [role="menuitem"]');
      let matchedOption = null;

      for (const option of options) {
        const optionText = option.textContent.trim();
        if (optionText.toLowerCase() === value.toLowerCase() || 
            optionText.toLowerCase().includes(value.toLowerCase())) {
          matchedOption = option;
          break;
        }
      }

      if (matchedOption) {
        matchedOption.click();
        await this.delay(100);
        return { success: true };
      } else {
        // Close dropdown if no match found
        element.click();
        return { success: false, error: 'Option not found in dropdown' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Fills a multi-select field (Workdays custom component)
   */
  async fillMultiSelect(element, value) {
    try {
      // Find the input field within multiselect container
      const input = element.querySelector('input[data-uxi-widget-type="selectinput"]');
      
      if (!input) {
        return { success: false, error: 'MultiSelect input not found' };
      }

      // Focus and type to trigger search
      input.focus();
      await this.delay(100);
      
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(this.config.dropdownDelay);

      // Find and click matching option
      const optionsList = document.querySelector('[data-automation-id="menuList"]');
      if (optionsList) {
        const options = optionsList.querySelectorAll('[role="option"]');
        
        for (const option of options) {
          if (option.textContent.includes(value)) {
            option.click();
            await this.delay(100);
            return { success: true };
          }
        }
      }

      return { success: false, error: 'No matching option found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Validates filled data before submission
   */
  validateFilledData(detectedFields) {
    const validation = {
      isValid: true,
      missingRequired: [],
      warnings: []
    };

    for (const [fieldKey, fieldData] of Object.entries(detectedFields.fields)) {
      if (fieldData.isRequired) {
        const currentValue = this.getElementValue(fieldData.element, fieldData.type);
        if (!currentValue || currentValue.trim() === '') {
          validation.isValid = false;
          validation.missingRequired.push(fieldKey);
        }
      }
    }

    return validation;
  },

  /**
   * Gets current value from element (helper for validation)
   */
  getElementValue(element, type) {
    switch (type) {
      case 'text':
        return element.value || '';
      case 'dropdown':
        return element.textContent || '';
      case 'multiselect':
        const selectedPill = element.querySelector('[data-automation-id="selectedItem"]');
        return selectedPill ? selectedPill.textContent : '';
      default:
        return '';
    }
  }
};

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkdaysInjection;
}
