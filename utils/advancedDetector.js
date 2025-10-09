/**
 * Advanced Field Detector with Fuzzy Matching
 * Enhanced field detection using machine learning patterns and fuzzy search
 */

/**
 * Advanced Field Detector Class
 * Provides intelligent field detection with learning capabilities
 */
class AdvancedFieldDetector {
  constructor() {
    this.fuse = null;
    this.fieldDatabase = [];
    this.learningData = new Map();
    this.confidenceThreshold = 0.6;
    this.isInitialized = false;
  }

  /**
   * Initialize the advanced detector
   */
  async initialize() {
    try {
      await this.loadFieldDatabase();
      await this.initializeFuseSearch();
      await this.loadLearningData();
      this.isInitialized = true;
      console.log('Advanced field detector initialized');
    } catch (error) {
      console.error('Failed to initialize advanced detector:', error);
    }
  }

  /**
   * Load comprehensive field database
   */
  async loadFieldDatabase() {
    this.fieldDatabase = [
      // Name variations
      { field: 'firstName', keywords: ['first', 'fname', 'given', 'forename', 'christian'], weight: 10 },
      { field: 'lastName', keywords: ['last', 'lname', 'family', 'surname', 'lastname'], weight: 10 },
      { field: 'fullName', keywords: ['name', 'full', 'complete', 'applicant', 'candidate'], weight: 9 },
      
      // Email variations
      { field: 'email', keywords: ['email', 'mail', 'electronic', 'contact', 'e-mail'], weight: 9 },
      
      // Phone variations
      { field: 'phoneNumber', keywords: ['phone', 'tel', 'mobile', 'cell', 'contact', 'number'], weight: 8 },
      { field: 'phoneCountryCode', keywords: ['country', 'code', 'dial', 'area', 'prefix'], weight: 7 },
      
      // Address variations
      { field: 'addressLine1', keywords: ['address', 'street', 'line1', 'addr1', 'location'], weight: 7 },
      { field: 'addressLine2', keywords: ['line2', 'addr2', 'apartment', 'apt', 'suite', 'unit'], weight: 6 },
      { field: 'city', keywords: ['city', 'town', 'locality', 'municipality'], weight: 7 },
      { field: 'postalCode', keywords: ['postal', 'zip', 'postcode', 'pincode', 'zipcode'], weight: 7 },
      { field: 'country', keywords: ['country', 'nation', 'nationality', 'region'], weight: 7 },
      
      // Professional variations
      { field: 'jobTitle', keywords: ['title', 'position', 'role', 'designation', 'job'], weight: 6 },
      { field: 'company', keywords: ['company', 'employer', 'organization', 'firm', 'workplace'], weight: 6 },
      { field: 'jobDescription', keywords: ['description', 'responsibilities', 'duties', 'experience'], weight: 5 },
      { field: 'skills', keywords: ['skills', 'technologies', 'expertise', 'competencies'], weight: 5 },
      
      // Date variations
      { field: 'startDate', keywords: ['start', 'from', 'begin', 'commenced', 'joined'], weight: 5 },
      { field: 'endDate', keywords: ['end', 'to', 'until', 'finished', 'left'], weight: 5 },
    ];
  }

  /**
   * Initialize Fuse.js for fuzzy search
   */
  async initializeFuseSearch() {
    // Create search index for fuzzy matching
    const searchData = this.fieldDatabase.flatMap(item => 
      item.keywords.map(keyword => ({
        field: item.field,
        keyword: keyword,
        weight: item.weight
      }))
    );

    // Configure Fuse.js options
    const options = {
      keys: ['keyword'],
      threshold: 0.4, // Lower = more strict matching
      distance: 100,
      includeScore: true,
      includeMatches: true
    };

    // Initialize Fuse (would need to load the library)
    this.searchData = searchData;
    console.log('Fuzzy search initialized with', searchData.length, 'patterns');
  }

  /**
   * Load machine learning data from previous detections
   */
  async loadLearningData() {
    try {
      const result = await chrome.storage.local.get('fieldLearningData');
      if (result.fieldLearningData) {
        this.learningData = new Map(result.fieldLearningData);
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  }

  /**
   * Save learning data for future improvements
   */
  async saveLearningData() {
    try {
      await chrome.storage.local.set({
        fieldLearningData: Array.from(this.learningData.entries())
      });
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }

  /**
   * Advanced field detection with multiple algorithms
   * @param {HTMLElement} element - Form element to analyze
   * @returns {Object|null} Field detection result
   */
  async detectField(element) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const detectionResults = await Promise.all([
      this.directAttributeMatching(element),
      this.fuzzyKeywordMatching(element),
      this.contextAnalysis(element),
      this.semanticAnalysis(element),
      this.learningBasedDetection(element)
    ]);

    // Combine results with weighted scoring
    return this.combineDetectionResults(element, detectionResults);
  }

  /**
   * Direct attribute matching (highest priority)
   * @param {HTMLElement} element - Form element
   * @returns {Object} Detection result
   */
  async directAttributeMatching(element) {
    const attributes = this.getElementAttributes(element);
    const results = [];

    for (const [attrName, attrValue] of Object.entries(attributes)) {
      if (!attrValue) continue;

      const normalizedValue = attrValue.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const item of this.fieldDatabase) {
        for (const keyword of item.keywords) {
          if (normalizedValue.includes(keyword)) {
            results.push({
              field: item.field,
              confidence: 0.9,
              method: 'direct',
              source: `${attrName}:${keyword}`,
              weight: item.weight
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Fuzzy keyword matching using similarity algorithms
   * @param {HTMLElement} element - Form element
   * @returns {Object} Detection result
   */
  async fuzzyKeywordMatching(element) {
    const attributes = this.getElementAttributes(element);
    const allText = Object.values(attributes).join(' ').toLowerCase();
    const results = [];

    // Simple fuzzy matching implementation
    for (const searchItem of this.searchData) {
      const similarity = this.calculateStringSimilarity(allText, searchItem.keyword);
      
      if (similarity > 0.7) {
        results.push({
          field: searchItem.field,
          confidence: similarity * 0.8, // Reduce confidence for fuzzy matches
          method: 'fuzzy',
          source: `fuzzy:${searchItem.keyword}`,
          weight: searchItem.weight
        });
      }
    }

    return results;
  }

  /**
   * Context analysis based on surrounding elements
   * @param {HTMLElement} element - Form element
   * @returns {Array} Detection results
   */
  async contextAnalysis(element) {
    const results = [];
    const contextText = this.getContextualText(element);
    
    if (contextText) {
      const normalizedContext = contextText.toLowerCase();
      
      for (const item of this.fieldDatabase) {
        for (const keyword of item.keywords) {
          if (normalizedContext.includes(keyword)) {
            results.push({
              field: item.field,
              confidence: 0.7,
              method: 'context',
              source: `context:${keyword}`,
              weight: item.weight * 0.8
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Semantic analysis using field position and form structure
   * @param {HTMLElement} element - Form element
   * @returns {Array} Detection results
   */
  async semanticAnalysis(element) {
    const results = [];
    const formStructure = this.analyzeFormStructure(element);
    
    // Analyze field position patterns
    if (formStructure.isFirstNameField) {
      results.push({
        field: 'firstName',
        confidence: 0.8,
        method: 'semantic',
        source: 'position:first-name',
        weight: 8
      });
    }
    
    if (formStructure.isLastNameField) {
      results.push({
        field: 'lastName',
        confidence: 0.8,
        method: 'semantic',
        source: 'position:last-name',
        weight: 8
      });
    }
    
    return results;
  }

  /**
   * Learning-based detection using historical data
   * @param {HTMLElement} element - Form element
   * @returns {Array} Detection results
   */
  async learningBasedDetection(element) {
    const results = [];
    const elementSignature = this.createElementSignature(element);
    
    if (this.learningData.has(elementSignature)) {
      const learnedData = this.learningData.get(elementSignature);
      results.push({
        field: learnedData.field,
        confidence: Math.min(learnedData.confidence + 0.1, 0.95),
        method: 'learning',
        source: 'historical',
        weight: learnedData.weight
      });
    }
    
    return results;
  }

  /**
   * Combine detection results using weighted scoring
   * @param {HTMLElement} element - Form element
   * @param {Array} resultSets - Array of detection result arrays
   * @returns {Object|null} Final detection result
   */
  combineDetectionResults(element, resultSets) {
    const allResults = resultSets.flat();
    
    if (allResults.length === 0) {
      return null;
    }

    // Group by field type
    const fieldScores = new Map();
    
    for (const result of allResults) {
      const currentScore = fieldScores.get(result.field) || { total: 0, count: 0, methods: [] };
      
      currentScore.total += result.confidence * result.weight;
      currentScore.count += 1;
      currentScore.methods.push(result.method);
      
      fieldScores.set(result.field, currentScore);
    }

    // Find best match
    let bestField = null;
    let bestScore = 0;
    
    for (const [field, score] of fieldScores.entries()) {
      const normalizedScore = score.total / score.count;
      
      if (normalizedScore > bestScore && normalizedScore > this.confidenceThreshold) {
        bestScore = normalizedScore;
        bestField = field;
      }
    }

    if (bestField) {
      const fieldData = fieldScores.get(bestField);
      
      // Store learning data
      this.storeDetectionLearning(element, bestField, bestScore);
      
      return {
        element: element,
        category: bestField,
        confidence: Math.min(bestScore, 1.0),
        methods: [...new Set(fieldData.methods)],
        priority: this.getFieldPriority(bestField)
      };
    }

    return null;
  }

  /**
   * Store successful detection for learning
   * @param {HTMLElement} element - Form element
   * @param {string} field - Detected field type
   * @param {number} confidence - Detection confidence
   */
  storeDetectionLearning(element, field, confidence) {
    const signature = this.createElementSignature(element);
    
    this.learningData.set(signature, {
      field: field,
      confidence: confidence,
      weight: this.getFieldWeight(field),
      timestamp: Date.now()
    });
    
    // Save periodically
    if (this.learningData.size % 10 === 0) {
      this.saveLearningData();
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Get element attributes for analysis
   * @param {HTMLElement} element - Form element
   * @returns {Object} Attributes object
   */
  getElementAttributes(element) {
    const attributes = {};
    const attrNames = ['name', 'id', 'class', 'placeholder', 'aria-label', 'title', 'type'];
    
    for (const attr of attrNames) {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    }
    
    return attributes;
  }

  /**
   * Get contextual text around element
   * @param {HTMLElement} element - Form element
   * @returns {string} Contextual text
   */
  getContextualText(element) {
    const contexts = [];
    
    // Check for associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) contexts.push(label.textContent);
    }
    
    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel) contexts.push(parentLabel.textContent);
    
    // Check surrounding text
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      
      if (index > 0) {
        contexts.push(siblings[index - 1].textContent);
      }
    }
    
    return contexts.join(' ').trim();
  }

  /**
   * Analyze form structure for semantic clues
   * @param {HTMLElement} element - Form element
   * @returns {Object} Structure analysis
   */
  analyzeFormStructure(element) {
    const form = element.closest('form') || document;
    const allInputs = Array.from(form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]'));
    const currentIndex = allInputs.indexOf(element);
    
    return {
      isFirstNameField: currentIndex === 0 && allInputs.length > 1,
      isLastNameField: currentIndex === 1 && allInputs.length > 1,
      totalFields: allInputs.length,
      position: currentIndex
    };
  }

  /**
   * Create unique signature for element
   * @param {HTMLElement} element - Form element
   * @returns {string} Element signature
   */
  createElementSignature(element) {
    const attributes = this.getElementAttributes(element);
    const signature = [
      attributes.name || '',
      attributes.id || '',
      attributes.class || '',
      element.tagName,
      element.type || ''
    ].join('|');
    
    return btoa(signature).substring(0, 16);
  }

  /**
   * Get field priority for sorting
   * @param {string} field - Field type
   * @returns {number} Priority value
   */
  getFieldPriority(field) {
    const priorities = {
      firstName: 10, lastName: 10, fullName: 9, email: 9,
      phoneNumber: 8, addressLine1: 7, city: 7, country: 7,
      jobTitle: 6, company: 6, skills: 5
    };
    
    return priorities[field] || 1;
  }

  /**
   * Get field weight for learning
   * @param {string} field - Field type
   * @returns {number} Weight value
   */
  getFieldWeight(field) {
    const item = this.fieldDatabase.find(item => item.field === field);
    return item ? item.weight : 1;
  }
}

// Create global instance
const advancedFieldDetector = new AdvancedFieldDetector();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.advancedFieldDetector = advancedFieldDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedFieldDetector, advancedFieldDetector };
}