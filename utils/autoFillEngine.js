/**
 * Intelligent Auto-Fill Engine
 * Advanced form filling with user control, confidence scoring, and selective filling
 */

/**
 * Auto-Fill Engine Class
 * Manages intelligent form filling with user approval and confidence analysis
 */
class AutoFillEngine {
  constructor() {
    this.fillResults = new Map();
    this.userPreferences = {};
    this.fillHistory = [];
    this.isInitialized = false;
    this.fillSession = null;
  }

  /**
   * Initialize the auto-fill engine
   */
  async initialize() {
    try {
      await this.loadUserPreferences();
      this.isInitialized = true;
      console.log('Auto-fill engine initialized');
    } catch (error) {
      console.error('Failed to initialize auto-fill engine:', error);
    }
  }

  /**
   * Load user preferences for auto-filling
   */
  async loadUserPreferences() {
    try {
      const result = await chrome.storage.local.get('autoFillPreferences');
      this.userPreferences = result.autoFillPreferences || {
        requireConfirmation: true,
        confidenceThreshold: 0.7,
        autoFillSensitive: false,
        skipFields: ['password', 'ssn', 'creditcard'],
        fillDelay: 100,
        highlightFields: true,
        showPreview: true
      };
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  /**
   * Start intelligent auto-fill process
   * @param {Array} detectedFields - Array of detected field objects
   * @param {Object} profileData - User profile data to fill
   * @returns {Object} Fill session result
   */
  async startAutoFill(detectedFields, profileData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Create new fill session
    this.fillSession = {
      id: this.generateSessionId(),
      timestamp: Date.now(),
      fields: detectedFields,
      profileData: profileData,
      plannedFills: [],
      executedFills: [],
      status: 'planning'
    };

    // Analyze and plan fills
    await this.planAutoFill();

    // Show preview if enabled
    if (this.userPreferences.showPreview) {
      return await this.showFillPreview();
    }

    // Execute fill if no confirmation required
    if (!this.userPreferences.requireConfirmation) {
      return await this.executeFill();
    }

    return this.fillSession;
  }

  /**
   * Plan auto-fill strategy based on detected fields and confidence
   */
  async planAutoFill() {
    const { fields, profileData } = this.fillSession;
    
    for (const fieldData of fields) {
      const fillPlan = await this.createFieldFillPlan(fieldData, profileData);
      
      if (fillPlan) {
        this.fillSession.plannedFills.push(fillPlan);
      }
    }

    // Sort by priority and confidence
    this.fillSession.plannedFills.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });

    this.fillSession.status = 'planned';
  }

  /**
   * Create fill plan for individual field
   * @param {Object} fieldData - Detected field information
   * @param {Object} profileData - User profile data
   * @returns {Object|null} Fill plan object
   */
  async createFieldFillPlan(fieldData, profileData) {
    const { element, category, confidence } = fieldData;
    
    // Skip if confidence too low
    if (confidence < this.userPreferences.confidenceThreshold) {
      return null;
    }

    // Skip sensitive fields if disabled
    if (!this.userPreferences.autoFillSensitive && this.isSensitiveField(category)) {
      return null;
    }

    // Skip explicitly excluded fields
    if (this.userPreferences.skipFields.includes(category)) {
      return null;
    }

    // Get fill value from profile
    const fillValue = this.getProfileValue(category, profileData);
    
    if (!fillValue) {
      return null;
    }

    return {
      element: element,
      category: category,
      fillValue: fillValue,
      confidence: confidence,
      priority: fieldData.priority,
      fillMethod: this.determineFillMethod(element),
      validation: this.validateFillValue(element, fillValue),
      riskLevel: this.assessRiskLevel(category, element)
    };
  }

  /**
   * Show fill preview to user
   * @returns {Object} Preview result
   */
  async showFillPreview() {
    const previewData = {
      sessionId: this.fillSession.id,
      totalFields: this.fillSession.plannedFills.length,
      highConfidence: this.fillSession.plannedFills.filter(f => f.confidence > 0.8).length,
      mediumConfidence: this.fillSession.plannedFills.filter(f => f.confidence > 0.6 && f.confidence <= 0.8).length,
      lowConfidence: this.fillSession.plannedFills.filter(f => f.confidence <= 0.6).length,
      fields: this.fillSession.plannedFills.map(fill => ({
        category: fill.category,
        value: this.maskSensitiveValue(fill.fillValue, fill.category),
        confidence: Math.round(fill.confidence * 100),
        riskLevel: fill.riskLevel
      }))
    };

    // Highlight fields if enabled
    if (this.userPreferences.highlightFields) {
      this.highlightFields();
    }

    return {
      type: 'preview',
      data: previewData,
      actions: ['approve', 'customize', 'cancel']
    };
  }

  /**
   * Execute approved auto-fill
   * @param {Array} selectedFields - Fields approved for filling (optional)
   * @returns {Object} Execution result
   */
  async executeFill(selectedFields = null) {
    if (!this.fillSession || this.fillSession.status === 'completed') {
      throw new Error('No active fill session');
    }

    const fieldsToFill = selectedFields || this.fillSession.plannedFills;
    this.fillSession.status = 'executing';

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const fillPlan of fieldsToFill) {
      try {
        const result = await this.fillSingleField(fillPlan);
        
        if (result.success) {
          results.successful++;
          this.fillSession.executedFills.push({
            ...fillPlan,
            fillResult: result,
            timestamp: Date.now()
          });
        } else {
          results.failed++;
          results.errors.push({
            field: fillPlan.category,
            error: result.error
          });
        }

        // Add delay between fills
        if (this.userPreferences.fillDelay > 0) {
          await this.delay(this.userPreferences.fillDelay);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          field: fillPlan.category,
          error: error.message
        });
      }
    }

    this.fillSession.status = 'completed';
    this.fillSession.results = results;

    // Store fill history
    this.fillHistory.push({
      sessionId: this.fillSession.id,
      timestamp: this.fillSession.timestamp,
      url: window.location.href,
      results: results
    });

    // Clean up highlights
    this.removeHighlights();

    return {
      type: 'completed',
      sessionId: this.fillSession.id,
      results: results
    };
  }

  /**
   * Fill individual field
   * @param {Object} fillPlan - Fill plan for the field
   * @returns {Object} Fill result
   */
  async fillSingleField(fillPlan) {
    const { element, fillValue, fillMethod, validation } = fillPlan;

    try {
      // Validate before filling
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Focus element
      element.focus();

      // Clear existing value
      element.value = '';

      // Fill based on method
      switch (fillMethod) {
        case 'value':
          element.value = fillValue;
          break;
        case 'type':
          await this.typeValue(element, fillValue);
          break;
        case 'select':
          await this.selectOption(element, fillValue);
          break;
        default:
          element.value = fillValue;
      }

      // Trigger input events
      this.triggerEvents(element);

      // Verify fill success
      const verificationResult = this.verifyFill(element, fillValue);

      return {
        success: verificationResult.success,
        actualValue: element.value,
        error: verificationResult.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Type value with human-like timing
   * @param {HTMLElement} element - Target element
   * @param {string} value - Value to type
   */
  async typeValue(element, value) {
    for (let i = 0; i < value.length; i++) {
      element.value += value[i];
      
      // Trigger input event for each character
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Random delay between keystrokes
      await this.delay(Math.random() * 50 + 25);
    }
  }

  /**
   * Select option from dropdown
   * @param {HTMLElement} element - Select element
   * @param {string} value - Value to select
   */
  async selectOption(element, value) {
    const options = Array.from(element.options);
    
    // Try exact match first
    let option = options.find(opt => opt.value === value || opt.text === value);
    
    // Try fuzzy match if exact fails
    if (!option) {
      option = options.find(opt => 
        opt.text.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(opt.text.toLowerCase())
      );
    }

    if (option) {
      element.selectedIndex = option.index;
      return true;
    }

    return false;
  }

  /**
   * Trigger necessary events after filling
   * @param {HTMLElement} element - Target element
   */
  triggerEvents(element) {
    const events = ['input', 'change', 'blur'];
    
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
  }

  /**
   * Verify fill was successful
   * @param {HTMLElement} element - Target element
   * @param {string} expectedValue - Expected value
   * @returns {Object} Verification result
   */
  verifyFill(element, expectedValue) {
    const actualValue = element.value;
    
    if (actualValue === expectedValue) {
      return { success: true };
    }

    // Check if close enough for fuzzy matches
    if (this.calculateSimilarity(actualValue, expectedValue) > 0.8) {
      return { success: true };
    }

    return {
      success: false,
      error: `Fill verification failed. Expected: ${expectedValue}, Got: ${actualValue}`
    };
  }

  /**
   * Highlight fields to be filled
   */
  highlightFields() {
    this.fillSession.plannedFills.forEach((fillPlan, index) => {
      const element = fillPlan.element;
      
      // Add highlight style
      element.style.outline = '2px solid #ffe600';
      element.style.outlineOffset = '2px';
      element.style.backgroundColor = 'rgba(255, 230, 0, 0.1)';
      
      // Add data attribute for cleanup
      element.setAttribute('data-autofill-highlight', 'true');
      
      // Add confidence indicator
      const confidence = Math.round(fillPlan.confidence * 100);
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
    });
  }

  /**
   * Remove field highlights
   */
  removeHighlights() {
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

  /**
   * Get profile value for field category
   * @param {string} category - Field category
   * @param {Object} profileData - User profile data
   * @returns {string|null} Profile value
   */
  getProfileValue(category, profileData) {
    const mapping = {
      firstName: profileData.personal?.firstName,
      lastName: profileData.personal?.lastName,
      fullName: `${profileData.personal?.firstName || ''} ${profileData.personal?.lastName || ''}`.trim(),
      email: profileData.personal?.email,
      phoneNumber: profileData.personal?.phone?.full,
      phoneCountryCode: profileData.personal?.phone?.countryCode,
      addressLine1: profileData.personal?.address?.line1,
      addressLine2: profileData.personal?.address?.line2,
      city: profileData.personal?.address?.city,
      postalCode: profileData.personal?.address?.postalCode,
      country: profileData.personal?.address?.country,
      jobTitle: profileData.professional?.experiences?.[0]?.title,
      company: profileData.professional?.experiences?.[0]?.company,
      jobDescription: profileData.professional?.experiences?.[0]?.description,
      skills: profileData.professional?.skills?.join(', ')
    };

    return mapping[category] || null;
  }

  /**
   * Determine fill method for element
   * @param {HTMLElement} element - Target element
   * @returns {string} Fill method
   */
  determineFillMethod(element) {
    if (element.tagName === 'SELECT') {
      return 'select';
    }
    
    if (element.type === 'email' || element.type === 'tel') {
      return 'type';
    }
    
    return 'value';
  }

  /**
   * Validate fill value for element
   * @param {HTMLElement} element - Target element
   * @param {string} value - Value to validate
   * @returns {Object} Validation result
   */
  validateFillValue(element, value) {
    if (!value) {
      return { isValid: false, error: 'No value to fill' };
    }

    // Email validation
    if (element.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { isValid: false, error: 'Invalid email format' };
      }
    }

    // Phone validation
    if (element.type === 'tel') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return { isValid: false, error: 'Invalid phone format' };
      }
    }

    // Length validation
    if (element.maxLength && value.length > element.maxLength) {
      return { isValid: false, error: 'Value too long' };
    }

    return { isValid: true };
  }

  /**
   * Assess risk level for field
   * @param {string} category - Field category
   * @param {HTMLElement} element - Target element
   * @returns {string} Risk level
   */
  assessRiskLevel(category, element) {
    const sensitiveFields = ['password', 'ssn', 'creditcard', 'bank'];
    const mediumRiskFields = ['email', 'phone', 'address'];
    
    if (sensitiveFields.some(field => category.includes(field))) {
      return 'high';
    }
    
    if (mediumRiskFields.some(field => category.includes(field))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if field is sensitive
   * @param {string} category - Field category
   * @returns {boolean} Is sensitive
   */
  isSensitiveField(category) {
    const sensitiveFields = ['password', 'ssn', 'creditcard', 'bank', 'security'];
    return sensitiveFields.some(field => category.toLowerCase().includes(field));
  }

  /**
   * Mask sensitive values for preview
   * @param {string} value - Original value
   * @param {string} category - Field category
   * @returns {string} Masked value
   */
  maskSensitiveValue(value, category) {
    if (this.isSensitiveField(category)) {
      return '*'.repeat(Math.min(value.length, 8));
    }
    
    if (category === 'email') {
      const parts = value.split('@');
      if (parts.length === 2) {
        return parts[0].substring(0, 2) + '***@' + parts[1];
      }
    }
    
    if (category.includes('phone')) {
      return value.replace(/\d(?=\d{4})/g, '*');
    }
    
    return value;
  }

  /**
   * Calculate string similarity
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score
   */
  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLen - distance) / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'fill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get fill history
   * @returns {Array} Fill history
   */
  getFillHistory() {
    return this.fillHistory;
  }

  /**
   * Clear fill history
   */
  clearFillHistory() {
    this.fillHistory = [];
  }

  /**
   * Update user preferences
   * @param {Object} newPreferences - New preference values
   */
  async updatePreferences(newPreferences) {
    this.userPreferences = { ...this.userPreferences, ...newPreferences };
    
    try {
      await chrome.storage.local.set({
        autoFillPreferences: this.userPreferences
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }
}

// Create global instance
const autoFillEngine = new AutoFillEngine();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.autoFillEngine = autoFillEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutoFillEngine, autoFillEngine };
}