/**
 * Master Field Detector - Unified Self-Contained Auto-Fill Solution
 * Combines the best features from all detector implementations:
 * - quickDetector.js: Immediate response reliability
 * - detector.js: Comprehensive field patterns
 * - enhancedDetector.js: Portal-specific optimizations  
 * - advancedDetector.js: Fuzzy matching and ML-like algorithms
 * 
 * NO EXTERNAL DEPENDENCIES - Everything included in this file
 */

console.log('Auto-Fill: Master detector starting...');

// Prevent multiple message listeners
if (window.masterDetectorLoaded) {
  console.log('Master Detector already loaded, skipping...');
  // Exit early if already loaded
} else {
  window.masterDetectorLoaded = true;
  console.log('Master Detector: First initialization');

// ============================================================================
// IMMEDIATE PING RESPONSE SETUP (from quickDetector reliability)
// ============================================================================

let isInitialized = false;
let detectedFields = [];
let portalConfig = null;
let debugMode = true;
let learningData = new Map(); // Store learning patterns locally

// Set up immediate ping response - FIRST PRIORITY for reliability
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Master detector received message:', request);
  
  // Handle ping immediately, even before full initialization
  if (request.action === 'ping' || request.type === 'ping') {
    console.log('Ping received, responding immediately');
    sendResponse({ 
      success: true, 
      status: 'ready', 
      initialized: isInitialized,
      detectorType: 'master',
      version: '1.0.0'
    });
    return true;
  }
  
  // For other messages, delegate to the main handler
  if (isInitialized) {
    handleMessage(request, sender, sendResponse);
    return true;
  } else {
    // If not initialized yet, return status
    sendResponse({ 
      success: false, 
      error: 'Master detector still initializing',
      status: 'initializing',
      progress: 'Loading field databases...'
    });
    return true;
  }
});

// ============================================================================
// COMPREHENSIVE FIELD DATABASE (unified from all detectors)
// ============================================================================

const MASTER_FIELD_DATABASE = {
  // Personal Information Fields
  firstName: {
    keywords: ['first', 'fname', 'given', 'forename', 'christian', 'first-name', 'firstname', 'first_name', 'applicant_first', 'candidate_first'],
    priority: 10,
    specificity: 'high',
    variations: ['applicant_first', 'candidate_first', 'user_first'],
    contextKeywords: ['first', 'given', 'christian', 'forename'],
    platformKeywords: {
      linkedin: ['firstName', 'given-name'],
      indeed: ['applicant.firstName', 'first'],
      glassdoor: ['firstname', 'given'],
      workday: ['givenName', 'firstName']
    }
  },
  
  lastName: {
    keywords: ['last', 'lname', 'family', 'surname', 'lastname', 'last-name', 'last_name', 'applicant_last', 'candidate_last'],
    priority: 10,
    specificity: 'high',
    variations: ['applicant_last', 'candidate_last', 'user_last'],
    contextKeywords: ['last', 'family', 'surname'],
    platformKeywords: {
      linkedin: ['lastName', 'family-name'],
      indeed: ['applicant.lastName', 'surname'],
      glassdoor: ['lastname', 'family'],
      workday: ['familyName', 'lastName']
    }
  },
  
  fullName: {
    keywords: ['fullname', 'full_name', 'complete_name', 'applicant_name', 'candidate_name'], 
    priority: 12,
    specificity: 'low',
    variations: ['applicant_name', 'candidate_name', 'user_name', 'complete_name'],
    contextKeywords: ['full', 'complete', 'entire']
  },
  
  email: {
    keywords: ['email', 'mail', 'electronic', 'contact', 'e-mail', 'email-address', 'contact-email'],
    priority: 9,
    variations: ['email_address', 'contact_email', 'user_email'],
    contextKeywords: ['email', 'electronic', 'contact']
  },
  
  phone: {
    keywords: ['phone', 'telephone', 'mobile', 'cell', 'contact', 'phone-number', 'contact-number'],
    priority: 8,
    variations: ['phone_number', 'mobile_number', 'contact_phone'],
    contextKeywords: ['phone', 'mobile', 'telephone', 'cell']
  },
  
  // Address Fields
  addressLine1: {
    keywords: ['address', 'street', 'line1', 'addr1', 'location', 'address-line-1', 'street-address'],
    priority: 7,
    variations: ['address_line_1', 'street_address'],
    contextKeywords: ['address', 'street', 'location']
  },
  
  addressLine2: {
    keywords: ['line2', 'addr2', 'apartment', 'apt', 'suite', 'unit', 'address-line-2'],
    priority: 6,
    variations: ['address_line_2', 'apt_number'],
    contextKeywords: ['apartment', 'suite', 'unit']
  },
  
  city: {
    keywords: ['city', 'town', 'locality', 'municipality'],
    priority: 7,
    variations: ['city_name', 'town_name'],
    contextKeywords: ['city', 'town', 'locality']
  },
  
  state: {
    keywords: ['state', 'province', 'region', 'territory'],
    priority: 7,
    variations: ['state_name', 'province_name'],
    contextKeywords: ['state', 'province', 'region']
  },
  
  postalCode: {
    keywords: ['postal', 'zip', 'postcode', 'pincode', 'zipcode', 'postal-code'],
    priority: 7,
    variations: ['zip_code', 'postal_code'],
    contextKeywords: ['postal', 'zip', 'pin']
  },
  
  country: {
    keywords: ['country', 'nation', 'nationality', 'region'],
    priority: 7,
    variations: ['country_name', 'nationality'],
    contextKeywords: ['country', 'nation']
  },
  
  currentLocation: {
    keywords: ['current', 'location', 'present', 'residing', 'based', 'current-location'],
    priority: 6,
    variations: ['current_location', 'present_location'],
    contextKeywords: ['current', 'present', 'residing']
  },
  
  // Professional Fields
  jobTitle: {
    keywords: ['title', 'position', 'role', 'designation', 'job', 'job-title'],
    priority: 6,
    variations: ['job_title', 'position_title'],
    contextKeywords: ['title', 'position', 'role']
  },
  
  company: {
    keywords: ['company', 'employer', 'organization', 'firm', 'workplace'],
    priority: 6,
    variations: ['company_name', 'employer_name'],
    contextKeywords: ['company', 'employer', 'organization']
  },
  
  totalExperience: {
    keywords: ['total', 'experience', 'years', 'overall', 'work', 'professional'],
    priority: 6,
    variations: ['total_experience', 'years_experience', 'work_experience'],
    contextKeywords: ['experience', 'years', 'total']
  },
  
  currentSalary: {
    keywords: ['current', 'current-ctc', 'compensation', 'pay', 'current-salary'],
    priority: 6,
    variations: ['current_salary', 'current_ctc'],
    contextKeywords: ['current', 'salary', 'compensation']
  },
  
  expectedSalary: {
    keywords: ['expected', 'expected-ctc', 'desired', 'target', 'expected-salary'],
    priority: 6,
    variations: ['expected_salary', 'desired_salary'],
    contextKeywords: ['expected', 'desired', 'target']
  },
  
  noticePeriod: {
    keywords: ['notice', 'period', 'availability', 'joining', 'start', 'notice-period'],
    priority: 6,
    variations: ['notice_period', 'joining_period'],
    contextKeywords: ['notice', 'availability', 'joining']
  },
  
  // Professional Links
  linkedinUrl: {
    keywords: ['linkedin', 'profile', 'professional', 'network', 'linkedin-url'],
    priority: 6,
    variations: ['linkedin_url', 'linkedin_profile'],
    contextKeywords: ['linkedin', 'professional', 'profile']
  },
  
  githubUrl: {
    keywords: ['github', 'git', 'repository', 'github-url'],
    priority: 6,
    variations: ['github_url', 'github_profile'],
    contextKeywords: ['github', 'git']
  },
  
  portfolioUrl: {
    keywords: ['portfolio', 'website', 'personal', 'blog', 'site', 'portfolio-url'],
    priority: 6,
    variations: ['portfolio_url', 'personal_website'],
    contextKeywords: ['portfolio', 'website', 'personal']
  },
  
  // Skills and Education
  skills: {
    keywords: ['skills', 'technologies', 'expertise', 'competencies', 'technical'],
    priority: 5,
    variations: ['technical_skills', 'key_skills'],
    contextKeywords: ['skills', 'technologies', 'expertise']
  },
  
  education: {
    keywords: ['education', 'degree', 'qualification', 'university', 'college'],
    priority: 5,
    variations: ['educational_background', 'qualifications'],
    contextKeywords: ['education', 'degree', 'qualification']
  },
  
  // Date Fields
  startDate: {
    keywords: ['start', 'from', 'begin', 'commenced', 'joined', 'start-date'],
    priority: 5,
    variations: ['start_date', 'from_date'],
    contextKeywords: ['start', 'from', 'begin']
  },
  
  endDate: {
    keywords: ['end', 'to', 'until', 'finished', 'left', 'end-date'],
    priority: 5,
    variations: ['end_date', 'to_date'],
    contextKeywords: ['end', 'to', 'until']
  }
};

// ============================================================================
// PORTAL CONFIGURATIONS (enhanced from all detectors)
// ============================================================================

const PORTAL_CONFIGS = {
  linkedin: {
    name: 'LinkedIn',
    domain: 'linkedin.com',
    priority: 10,
    specificSelectors: {
      firstName: [
        '#single-line-text-form-component-firstName',
        'input[name*="firstName"]',
        'input[id*="firstName"]',
        'input[aria-label*="First name"]',
        'input[placeholder*="First name"]'
      ],
      lastName: [
        '#single-line-text-form-component-lastName', 
        'input[name*="lastName"]',
        'input[id*="lastName"]',
        'input[aria-label*="Last name"]',
        'input[placeholder*="Last name"]'
      ],
      email: ['input[name*="email"]', '#email-address'],
      phone: ['input[name*="phone"]', '#phone-number'],
      linkedinUrl: ['input[name*="linkedinUrl"]', 'input[name*="linkedin"]']
    },
    excludePatterns: ['hidden', 'csrf', 'token'],
    dynamicContent: true
  },
  
  indeed: {
    name: 'Indeed',
    domain: 'indeed.com',
    priority: 9,
    specificSelectors: {
      firstName: [
        'input[name="applicant.firstName"]',
        'input[name*="firstName"]',
        'input[name*="first"]',
        'input[id*="firstName"]',
        'input[placeholder*="First name"]'
      ],
      lastName: [
        'input[name="applicant.lastName"]',
        'input[name*="lastName"]', 
        'input[name*="last"]',
        'input[id*="lastName"]',
        'input[placeholder*="Last name"]'
      ],
      email: ['input[name="applicant.email"]', 'input[name*="email"]'],
      phone: ['input[name="applicant.phone"]', 'input[name*="phone"]']
    },
    excludePatterns: ['recaptcha', 'hidden'],
    dynamicContent: true
  },
  
  glassdoor: {
    name: 'Glassdoor',
    domain: 'glassdoor.com',
    priority: 8,
    specificSelectors: {
      firstName: [
        'input[name*="firstName"]', 
        '#firstName',
        'input[name*="first"]',
        'input[id*="first"]'
      ],
      lastName: [
        'input[name*="lastName"]', 
        '#lastName',
        'input[name*="last"]',
        'input[id*="last"]'
      ],
      email: ['input[name*="email"]', '#email'],
      phone: ['input[name*="phone"]', '#phone']
    },
    excludePatterns: ['password', 'hidden'],
    dynamicContent: false
  },
  
  monster: {
    name: 'Monster',
    domain: 'monster.com',
    priority: 7,
    specificSelectors: {
      firstName: [
        'input[name*="first"]', 
        '#firstname',
        'input[id*="firstName"]'
      ],
      lastName: [
        'input[name*="last"]', 
        '#lastname',
        'input[id*="lastName"]'
      ],
      email: ['input[name*="email"]'],
      phone: ['input[name*="phone"]']
    },
    excludePatterns: ['hidden', 'captcha'],
    dynamicContent: true
  },
  
  workday: {
    name: 'Workday',
    domain: 'workday.com',
    priority: 9,
    specificSelectors: {
      firstName: [
        'input[name*="givenName"]',
        'input[name*="firstName"]',
        'input[data-automation-id*="firstName"]'
      ],
      lastName: [
        'input[name*="familyName"]',
        'input[name*="lastName"]', 
        'input[data-automation-id*="lastName"]'
      ]
    },
    excludePatterns: ['hidden', 'token'],
    dynamicContent: true
  }
};

// ============================================================================
// UTILITY FUNCTIONS (self-contained)
// ============================================================================

function debugLog(...args) {
  if (debugMode) {
    console.log('Master Detector:', ...args);
  }
}

// Levenshtein distance algorithm for fuzzy matching
function calculateLevenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calculate similarity score (0-1) using Levenshtein distance
function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = calculateLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

// Normalize string for comparison
function normalizeString(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Get element attributes for analysis
function getElementAttributes(element) {
  return {
    name: element.name || '',
    id: element.id || '',
    className: element.className || '',
    placeholder: element.placeholder || '',
    type: element.type || 'text',
    'aria-label': element.getAttribute('aria-label') || '',
    'data-testid': element.getAttribute('data-testid') || '',
    title: element.title || ''
  };
}

// Find associated label text
function findAssociatedLabel(element) {
  // Try explicit label association
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Try parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.replace(element.value || '', '').trim();
  }
  
  // Try sibling labels
  const siblings = Array.from(element.parentNode?.children || []);
  for (const sibling of siblings) {
    if (sibling.tagName === 'LABEL') {
      return sibling.textContent.trim();
    }
  }
  
  // Try preceding text nodes
  let current = element.previousSibling;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE && current.textContent.trim()) {
      return current.textContent.trim();
    }
    if (current.nodeType === Node.ELEMENT_NODE && current.textContent.trim()) {
      return current.textContent.trim();
    }
    current = current.previousSibling;
  }
  
  return '';
}

// ============================================================================
// PORTAL IDENTIFICATION (enhanced)
// ============================================================================

function identifyJobPortal() {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const fullUrl = window.location.href.toLowerCase();
  
  for (const [key, config] of Object.entries(PORTAL_CONFIGS)) {
    if (hostname.includes(config.domain)) {
      debugLog('Portal identified:', config.name);
      return config;
    }
  }
  
  // Check for job-related keywords in URL for unknown portals
  const jobKeywords = ['job', 'career', 'apply', 'application', 'hiring', 'recruit'];
  const hasJobKeywords = jobKeywords.some(keyword => 
    hostname.includes(keyword) || pathname.includes(keyword)
  );
  
  if (hasJobKeywords) {
    debugLog('Generic job portal detected');
    return {
      name: 'Generic Job Portal',
      domain: hostname,
      priority: 5,
      specificSelectors: {},
      excludePatterns: ['hidden', 'password', 'csrf'],
      dynamicContent: true
    };
  }
  
  debugLog('Using generic portal configuration');
  return null;
}

// ============================================================================
// ADVANCED FIELD DETECTION (unified algorithms)
// ============================================================================

async function detectFieldAdvanced(element) {
  console.log("Start Field data detection for : "+ element.name)
  const results = await Promise.all([
    directAttributeMatching(element),
    fuzzyKeywordMatching(element),
    contextualAnalysis(element),
    semanticAnalysis(element),
    portalSpecificMatching(element),
    learningBasedDetection(element)
  ]);
  const combinedResults = combineDetectionResults(element, results);
  console.log("End Field data detection for : "+ element.name)
  return combinedResults;
}

// Direct attribute matching (highest confidence)
function directAttributeMatching(element) {
  const attributes = getElementAttributes(element);
  const results = [];
  
  for (const [fieldType, config] of Object.entries(MASTER_FIELD_DATABASE)) {
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      if (!attrValue) continue;
      
      const normalizedValue = normalizeString(attrValue);
      
      for (const keyword of config.keywords) {
        let confidenceLevel = undefined;

        const keywordNormalizeString = normalizeString(keyword);

        if (normalizedValue === keywordNormalizeString ){
          confidenceLevel = 0.95;
        }else if (normalizedValue.includes(keywordNormalizeString)) {
          confidenceLevel = 0.70;
        }

        if (confidenceLevel) {
          results.push({
            field: fieldType,
            confidence: confidenceLevel,
            method: 'direct',
            source: `${attrName}:${keyword}`,
            priority: config.priority
          });
        }
      }
    }
  }
  
  return results;
}

// Fuzzy keyword matching with similarity scoring
function fuzzyKeywordMatching(element) {
  const attributes = getElementAttributes(element);
  const allText = Object.values(attributes).join(' ');
  const results = [];
  
  for (const [fieldType, config] of Object.entries(MASTER_FIELD_DATABASE)) {
    for (const keyword of config.keywords) {
      for (const [attrName, attrValue] of Object.entries(attributes)) {
        if (!attrValue) continue;
        
        const similarity = calculateSimilarity(attrValue, keyword);
        
        if (similarity > 0.7) { // 70% similarity threshold
          results.push({
            field: fieldType,
            confidence: similarity * 0.8, // Slightly lower than direct match
            method: 'fuzzy',
            source: `${attrName}~${keyword}`,
            priority: config.priority,
            similarity: similarity
          });
        }
      }
    }
  }
  
  return results;
}

// Contextual analysis using surrounding elements
function contextualAnalysis(element) {
  const labelText = findAssociatedLabel(element);
  const results = [];
  
  if (!labelText) return results;
  
  const normalizedLabel = normalizeString(labelText);
  
  for (const [fieldType, config] of Object.entries(MASTER_FIELD_DATABASE)) {
    for (const contextKeyword of config.contextKeywords || []) {
      if (normalizedLabel.includes(normalizeString(contextKeyword))) {
        results.push({
          field: fieldType,
          confidence: 0.75,
          method: 'contextual',
          source: `label:${contextKeyword}`,
          priority: config.priority,
          labelText: labelText
        });
      }
    }
  }
  
  return results;
}

// Semantic analysis for meaning-based detection
function semanticAnalysis(element) {
  const attributes = getElementAttributes(element);
  const labelText = findAssociatedLabel(element);
  const combinedText = (Object.values(attributes).join(' ') + ' ' + labelText).toLowerCase();
  const results = [];
  
  // Semantic patterns for better understanding
  const semanticPatterns = {
    firstName: ['given name', 'christian name', 'forename'],
    lastName: ['family name', 'surname', 'last name'],
    email: ['email address', 'electronic mail', 'contact email'],
    phone: ['phone number', 'telephone number', 'mobile number', 'contact number'],
    linkedinUrl: ['linkedin profile', 'professional profile', 'linkedin url'],
    githubUrl: ['github profile', 'github url', 'repository url'],
    totalExperience: ['years of experience', 'work experience', 'professional experience'],
    currentSalary: ['current salary', 'current compensation', 'present salary'],
    expectedSalary: ['expected salary', 'desired salary', 'salary expectation']
  };
  
  for (const [fieldType, patterns] of Object.entries(semanticPatterns)) {
    for (const pattern of patterns) {
      if (combinedText.includes(pattern)) {
        const config = MASTER_FIELD_DATABASE[fieldType];
        if (config) {
          results.push({
            field: fieldType,
            confidence: 0.85,
            method: 'semantic',
            source: `pattern:${pattern}`,
            priority: config.priority,
            pattern: pattern
          });
        }
      }
    }
  }
  
  return results;
}

// Portal-specific matching using known selectors
function portalSpecificMatching(element) {
  if (!portalConfig || !portalConfig.specificSelectors) return [];
  
  const results = [];
  
  for (const [fieldType, selectors] of Object.entries(portalConfig.specificSelectors)) {
    for (const selector of selectors) {
      try {
        if (element.matches(selector)) {
          const config = MASTER_FIELD_DATABASE[fieldType];
          if (config) {
            results.push({
              field: fieldType,
              confidence: 0.98, // Very high confidence for portal-specific
              method: 'portal-specific',
              source: `selector:${selector}`,
              priority: config.priority + 2, // Boost priority
              portal: portalConfig.name
            });
          }
        }
      } catch (error) {
        // Invalid selector, skip
      }
    }
  }
  
  return results;
}

// Learning-based detection using stored patterns
function learningBasedDetection(element) {
  const results = [];
  const attributes = getElementAttributes(element);
  const fingerprint = `${attributes.name}|${attributes.id}|${attributes.className}`;
  
  if (learningData.has(fingerprint)) {
    const learnedData = learningData.get(fingerprint);
    const config = MASTER_FIELD_DATABASE[learnedData.fieldType];
    
    if (config) {
      results.push({
        field: learnedData.fieldType,
        confidence: Math.min(learnedData.confidence + 0.1, 0.95), // Boost learned patterns
        method: 'learning',
        source: `learned:${fingerprint}`,
        priority: config.priority,
        learnedFrom: learnedData.portal || 'unknown'
      });
    }
  }
  
  return results;
}

// Combine detection results with weighted scoring
function combineDetectionResults(element, resultSets) {
  const allResults = resultSets.flat();
  
  if (allResults.length === 0) {
    return null;
  }
  
  // Group by field type and calculate weighted scores
  const fieldScores = new Map();
  
  for (const result of allResults) {
    const currentScore = fieldScores.get(result.field) || { 
      total: 0, 
      count: 0, 
      methods: [], 
      maxConfidence: 0,
      priority: result.priority || 5
    };
    
    // Weight the confidence by method reliability
    const methodWeights = {
      'portal-specific': 1.0,
      'direct': 0.9,
      'semantic': 0.8,
      'contextual': 0.7,
      'learning': 0.85,
      'fuzzy': 0.6
    };
    
    const weight = methodWeights[result.method] || 0.5;
    const weightedConfidence = result.confidence * weight;
    
    currentScore.total += weightedConfidence;
    currentScore.count += 1;
    currentScore.methods.push(result.method);
    currentScore.maxConfidence = Math.max(currentScore.maxConfidence, result.confidence);
    
    fieldScores.set(result.field, currentScore);
  }
  
  // Find best match with minimum confidence threshold
  let bestField = null;
  let bestScore = 0;
  const confidenceThreshold = 0.5;
  
  for (const [field, score] of fieldScores.entries()) {
    const normalizedScore = score.total / score.count;
    
    if (normalizedScore > bestScore && 
        normalizedScore > confidenceThreshold &&
        score.maxConfidence > confidenceThreshold) {
      bestScore = normalizedScore;
      bestField = field;
    }
  }
  
  if (bestField) {
    const fieldData = fieldScores.get(bestField);
    
    // Store for learning (with portal context)
    storeDetectionLearning(element, bestField, bestScore);
    
    return {
      element: element,
      category: bestField,
      confidence: bestScore,
      maxConfidence: fieldData.maxConfidence,
      methods: [...new Set(fieldData.methods)], // Unique methods
      priority: fieldData.priority,
      detectionData: MASTER_FIELD_DATABASE[bestField]
    };
  }
  
  return null;
}

// Store successful detection for learning
function storeDetectionLearning(element, fieldType, confidence) {
  const attributes = getElementAttributes(element);
  const fingerprint = `${attributes.name}|${attributes.id}|${attributes.className}`;
  
  learningData.set(fingerprint, {
    fieldType: fieldType,
    confidence: confidence,
    portal: portalConfig?.name || 'unknown',
    timestamp: Date.now(),
    url: window.location.hostname
  });
  
  // Limit learning data size (keep last 1000 entries)
  if (learningData.size > 1000) {
    const firstKey = learningData.keys().next().value;
    learningData.delete(firstKey);
  }
}

// ============================================================================
// FIELD DETECTION ORCHESTRATOR
// ============================================================================

async function detectFormFields() {
  debugLog('Starting comprehensive field detection...');
  
  const fields = [];
  const formElements = document.querySelectorAll('input, select, textarea');
  
  debugLog(`Found ${formElements.length} form elements`);

  for (const [index, element] of formElements.entries()) {
    // Skip hidden, disabled, or excluded elements
    if (isElementExcluded(element)) {
      continue;
    }

    //  This is for testing in 'job-portal-test.html' file
    // if element baseURI contains 'job-portal-test.html' and its index is less then 27 then skip this iteration
    if (element.baseURI && element.baseURI.includes('job-portal-test.html') && index < 27) {
      continue;
    }
    
    // Use advanced detection for each element
    const detectionResult = await detectFieldAdvanced(element);
    
    if (detectionResult) {
      fields.push({
        element: element,
        category: detectionResult.category,
        confidence: detectionResult.confidence,
        methods: detectionResult.methods,
        priority: detectionResult.priority,
        
        // Keep basic info for compatibility
        type: element.type || 'text',
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        className: element.className || '',
        
        // Enhanced info
        detectionData: detectionResult.detectionData,
        portal: portalConfig?.name || 'unknown',
        index: index
      });
    } else {
      // Store unmatched fields for potential manual mapping
      fields.push({
        element: element,
        category: 'unknown',
        confidence: 0,
        methods: ['none'],
        priority: 0,
        
        type: element.type || 'text',
        name: element.name || '',
        id: element.id || '',
        placeholder: element.placeholder || '',
        className: element.className || '',
        
        detectionData: null,
        portal: portalConfig?.name || 'unknown',
        index: index
      });
    }
  }
  
  // Sort by confidence and priority
  fields.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence; // Higher confidence first
    }
    return b.priority - a.priority; // Higher priority first
  });
  
  detectedFields = fields;
  debugLog(`Field detection completed: ${fields.length} total, ${fields.filter(f => f.confidence > 0.5).length} high-confidence matches`);
  
  // Detect experience cards within the same flow
  try {
    const experienceResults = await detectExperienceCards();
    console.log('Experience Cards Detection Results:', experienceResults);
    console.log(`Found ${experienceResults.totalCards} experience cards using ${experienceResults.detectionMethod} method`);
    
    // Create field entries for experience card fields and add to main fields array
    if (experienceResults.totalCards > 0) {
      experienceResults.cards.forEach((card, cardArrayIndex) => {
        console.log(`Experience Card ${card.cardIndex}:`, {
          confidence: card.detectionConfidence,
          fields: Object.keys(card.fields).filter(key => card.fields[key]).join(', ')
        });
        
        // Add each field from the experience card to the main fields array
        Object.entries(card.fields).forEach(([fieldType, fieldElement]) => {
          if (fieldElement) { // Only add if field element exists
            const experienceFieldEntry = {
              // Core field information
              element: fieldElement,
              category: `experience_${fieldType}`, // e.g., "experience_jobTitle", "experience_company"
              confidence: card.detectionConfidence / 100, // Convert percentage to 0-1 scale
              methods: ['experience-card-detection'],
              priority: 8, // High priority for experience fields
              
              // Basic element info for compatibility
              type: fieldElement.type || 'text',
              name: fieldElement.name || '',
              id: fieldElement.id || '',
              placeholder: fieldElement.placeholder || '',
              className: fieldElement.className || '',
              
              // Enhanced info
              detectionData: {
                keywords: [fieldType, 'experience', 'job'],
                priority: 8,
                specificity: 'high'
              },
              portal: portalConfig?.name || 'unknown',
              index: fields.length + Object.keys(card.fields).indexOf(fieldType), // Unique index
              
              // Experience-specific metadata
              customType: 'jobExperience',
              cardIndex: card.cardIndex,
              cardElement: card.container,
              cardParentElement: experienceResults.parentContainer,
              experienceFieldType: fieldType, // jobTitle, company, startDate, etc.
              cardDetectionMethod: experienceResults.detectionMethod,
              cardDetectionConfidence: card.detectionConfidence,
              totalCardsFound: experienceResults.totalCards,
              fieldPosition: Object.keys(card.fields).indexOf(fieldType) + 1,
              isExperienceField: true,
              experienceCardData: {
                totalFieldsInCard: Object.keys(card.fields).filter(key => card.fields[key]).length,
                availableFieldTypes: Object.keys(card.fields).filter(key => card.fields[key]),
                cardElementTag: card.container?.tagName || 'unknown',
                cardElementClasses: card.container?.className || '',
                cardElementId: card.container?.id || ''
              }
            };
            
            // Add to main fields array
            fields.push(experienceFieldEntry);
            
          }
        });
      });
      
      // Log summary of added experience fields
      const experienceFieldsAdded = fields.filter(f => f.customType === 'jobExperience');
      console.log(`Experience Fields Dataset Summary:`, {
        totalExperienceFields: experienceFieldsAdded.length,
        totalCards: experienceResults.totalCards,
        detectionMethod: experienceResults.detectionMethod,
        fieldsByCard: experienceFieldsAdded.reduce((acc, field) => {
          acc[field.cardIndex] = (acc[field.cardIndex] || 0) + 1;
          return acc;
        }, {}),
        fieldTypes: [...new Set(experienceFieldsAdded.map(f => f.experienceFieldType))]
      });
      
      // Print complete experience fields dataset
      console.log('Complete Experience Fields Dataset:', experienceFieldsAdded.map(field => ({
        category: field.category,
        customType: field.customType,
        cardIndex: field.cardIndex,
        experienceFieldType: field.experienceFieldType,
        elementInfo: {
          name: field.name,
          id: field.id,
          type: field.type,
          placeholder: field.placeholder
        },
        confidence: field.confidence,
        cardDetectionConfidence: field.cardDetectionConfidence,
        totalCardsFound: field.totalCardsFound,
        fieldPosition: field.fieldPosition,
        experienceCardData: field.experienceCardData
      })));
    }
  } catch (error) {
    console.error('Error detecting experience cards:', error);
  }
  
  return fields;
}

function isElementExcluded(element) {
  // Skip hidden elements
  if (element.type === 'hidden' || element.style.display === 'none' || element.style.visibility === 'hidden') {
    return true;
  }
  
  // Skip disabled or readonly elements
  if (element.disabled || element.readOnly) {
    return true;
  }
  
  // Skip based on portal-specific exclusion patterns
  if (portalConfig && portalConfig.excludePatterns) {
    const elementText = (element.name + element.id + element.className).toLowerCase();
    return portalConfig.excludePatterns.some(pattern => elementText.includes(pattern));
  }
  
  // Skip common exclusion patterns
  const commonExclusions = ['password', 'captcha', 'csrf', 'token', 'submit', 'reset'];
  const elementText = (element.name + element.id + element.className + element.type).toLowerCase();
  
  return commonExclusions.some(exclusion => elementText.includes(exclusion));
}

// ============================================================================
// FORM FILLING COORDINATION (delegates to masterInjection only)
// ============================================================================

// ============================================================================
// MESSAGE HANDLER (unified interface)
// ============================================================================

async function handleMessage(request, sender, sendResponse) {
  const messageType = request.action || request.type;
  debugLog('Handling message:', messageType);
  
  try {
    switch (messageType) {
      case 'detectFields':
      case 'GET_FIELDS':
        const fields = await detectFormFields();
        const responseFields = fields.map(f => ({
          category: f.category,
          confidence: f.confidence,
          methods: f.methods,
          type: f.type,
          name: f.name,
          id: f.id,
          placeholder: f.placeholder,
          className: f.className,
          priority: f.priority
        }));
        
        sendResponse({
          success: true,
          fields: responseFields,
          totalFields: fields.length,
          highConfidenceFields: fields.filter(f => f.confidence > 0.7).length,
          portal: portalConfig?.name || 'unknown',
          detectorType: 'master'
        });
        break;
        
      case 'detectExperienceCards':
      case 'GET_EXPERIENCE_CARDS':
        const experienceData = await detectExperienceCards();
        debugLog('Job experience detection results:', experienceData);
        
        sendResponse({
          success: true,
          experienceData: experienceData,
          totalCards: experienceData.totalCards,
          detectionMethod: experienceData.detectionMethod,
          hasParentContainer: !!experienceData.parentContainer,
          portal: portalConfig?.name || 'unknown',
          detectorType: 'master'
        });
        break;
        
      case 'fillForm':
      case 'FILL_FORM':
        console.log('Master Detector: Received fillForm message');
        console.log('Request object:', request);
        
        const profileData = request.profileData || {};
        console.log('Profile data extracted:', profileData);
        console.log('Profile data has keys:', Object.keys(profileData));
        
        if (!request.profileData) {
          console.warn('WARNING: No profileData in request! Using empty object.');
        }
        
        // Require masterInjection for form filling - no fallback
        if (window.masterInjection && window.masterInjection.fillFormWithProfileData) {
          console.log('Using masterInjection for form filling');
          const fillResult = window.masterInjection.fillFormWithProfileData(profileData, detectedFields);
          
          sendResponse({
            success: fillResult.success,
            filledFields: fillResult.filledCount,
            totalFields: fillResult.totalFields,
            fillResults: fillResult.fillResults,
            fillErrors: fillResult.fillErrors,
            detectorType: 'master',
            injectionEngine: 'masterInjection'
          });
        } else {
          console.error('CRITICAL: masterInjection not available - form filling not possible');
          console.error('window.masterInjection exists:', !!window.masterInjection);
          console.error('Available window properties:', Object.keys(window).filter(k => k.includes('master')));
          
          sendResponse({
            success: false,
            error: 'masterInjection not available - form filling engine required',
            filledFields: 0,
            totalFields: detectedFields.length,
            fillResults: [],
            detectorType: 'master',
            injectionEngine: 'none',
            critical: true
          });
        }
        break;
        
      case 'getDetectorInfo':
        sendResponse({
          success: true,
          detectorType: 'master',
          version: '1.0.0',
          capabilities: [
            'fuzzy-matching',
            'confidence-scoring',
            'contextual-analysis',
            'semantic-analysis',
            'portal-specific',
            'learning-based'
          ],
          fieldDatabase: Object.keys(MASTER_FIELD_DATABASE).length,
          portalConfigs: Object.keys(PORTAL_CONFIGS).length,
          isInitialized: isInitialized
        });
        break;
        
      default:
        debugLog('Unknown message type:', messageType);
        sendResponse({ 
          success: false, 
          error: 'Unknown message type',
          detectorType: 'master'
        });
    }
  } catch (error) {
    console.error('Master Detector error:', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      detectorType: 'master'
    });
  }
}

// ============================================================================
// INITIALIZATION (reliable and fast)
// ============================================================================

async function initializeContentScript() {
  debugLog('Starting Master Detector initialization...');
  
  try {
    // Identify portal configuration
    portalConfig = identifyJobPortal();

    // Set up mutation observer for dynamic content
    setupMutationObserver();
    
    isInitialized = true;
    console.log('Auto-Fill: Master Detector initialized successfully');
    debugLog(`Initialization complete. Portal: ${portalConfig?.name || 'Generic'}, Fields: ${detectedFields.length}`);
    
    // Signal extension is ready
    window.autoFillExtensionActive = true;
    document.dispatchEvent(new CustomEvent('autoFillExtensionReady', {
      detail: {
        detectorType: 'master',
        portal: portalConfig?.name || 'unknown',
        fieldsDetected: detectedFields.length,
        capabilities: ['advanced-detection', 'fuzzy-matching', 'learning', 'experience-cards']
      }
    }));
    
  } catch (error) {
    console.error('Master Detector initialization failed:', error);
    isInitialized = false;
  }
}

// ============================================================================
// EXPERIENCE CARD DETECTION
// ============================================================================

/**
 * Detects job experience cards and their contained fields
 * Returns structured data with parent containers and individual field mappings
 * @returns {Object} Experience detection results
 */
async function detectExperienceCards() {
  debugLog('Starting experience card detection...');
  
  const experienceResults = {
    parentContainer: null,
    cards: [],
    totalCards: 0,
    detectionMethod: 'none'
  };
  
  try {
    // Experience card container patterns
    const containerSelectors = [
      // Common experience sections
      '[class*="experience"]',
      '[class*="job"]',
      '[class*="work"]',
      '[class*="employment"]',
      '[class*="career"]',
      '[id*="experience"]',
      '[id*="job"]',
      '[id*="work"]',
      
      // Specific portal patterns
      '.experience-section',
      '.job-experience',
      '.work-history',
      '.employment-history',
      '#experience-section',
      '#job-experience',
      '#work-history',
      
      // Generic containers that might hold experience cards
      '[data-testid*="experience"]',
      '[data-cy*="experience"]',
      'section:has([class*="experience"])',
      'div:has([class*="job-title"])'
    ];
    
    // Find potential parent containers
    let parentContainer = null;
    let detectionMethod = 'container';
    
    for (const selector of containerSelectors) {
      try {
        const containers = document.querySelectorAll(selector);
        for (const container of containers) {
          // Check if container has multiple experience-related form fields
          const formFields = container.querySelectorAll('input, select, textarea');
          const experienceFields = Array.from(formFields).filter(field => 
            isExperienceRelatedField(field)
          );
          
          if (experienceFields.length >= 3) { // At least 3 experience-related fields
            parentContainer = container;
            break;
          }
        }
        if (parentContainer) break;
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }
    
    // If no container found, try to detect by field patterns
    if (!parentContainer) {
      parentContainer = detectExperienceCardsByFieldPatterns();
      detectionMethod = 'field-pattern';
    }
    
    if (!parentContainer) {
      console.error('No experience card container found');
      return experienceResults;
    }
    
    experienceResults.parentContainer = parentContainer;
    experienceResults.detectionMethod = detectionMethod;
    
    // Now detect individual experience cards within the container
    const cards = await detectIndividualExperienceCards(parentContainer);
    experienceResults.cards = cards;
    experienceResults.totalCards = cards.length;
    
    return experienceResults;
    
  } catch (error) {
    console.error('Error in experience card detection:', error);
    return experienceResults;
  }
}

/**
 * Detects individual experience cards within a parent container
 * @param {Element} parentContainer - The parent container element
 * @returns {Array} Array of card objects with field mappings
 */
async function detectIndividualExperienceCards(parentContainer) {
  const cards = [];
  
  // Card detection patterns
  const cardSelectors = [
    // Direct card selectors
    '.experience-card',
    '.job-card',
    '.work-entry',
    '.employment-entry',
    '[class*="experience-entry"]',
    '[class*="job-entry"]',
    '[class*="experience-item"]',
    '[class*="experience"][class*="card"]',
    
    // Generic card patterns
    '.card:has([class*="job"])',
    '.entry:has([class*="experience"])',
    'div[class*="card"]:has(input[name*="job"])',
    'div[class*="entry"]:has(input[name*="company"])',
    
    // Form-based groupings
    'fieldset',
    '[role="group"]',
    '.form-group:has([name*="job"])',
    '.form-section:has([name*="experience"])'
  ];
  
  let cardElements = [];
  
  // Try to find cards using selectors
  for (const selector of cardSelectors) {
    try {
      const foundCards = parentContainer.querySelectorAll(selector);
      if (foundCards.length > 0) {
        cardElements = Array.from(foundCards);
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  // If no cards found by selectors, try to group by field patterns
  if (cardElements.length === 0) {
    cardElements = detectCardsByFieldGrouping(parentContainer);
  }
  
  // Process each detected card
  for (let i = 0; i < cardElements.length; i++) {
    const cardElement = cardElements[i];
    const cardIndex = i + 1;
    
    const cardData = {
      cardIndex: cardIndex,
      container: cardElement,
      fields: await detectFieldsWithinCard(cardElement, cardIndex),
      detectionConfidence: 0
    };
    
    // Calculate confidence based on found fields
    const fieldCount = Object.keys(cardData.fields).filter(key => cardData.fields[key]).length;
    cardData.detectionConfidence = Math.min(fieldCount * 15, 100);
    
    if (fieldCount >= 2) { // At least 2 fields to consider it a valid card
      cards.push(cardData);
    }
  }
  
  return cards;
}

/**
 * Detects fields within an experience card
 * @param {Element} cardElement - The card container element
 * @param {number} cardIndex - The card index number
 * @returns {Object} Field mapping object
 */
async function detectFieldsWithinCard(cardElement, cardIndex) {
  const fields = {
    jobTitle: null,
    company: null,
    jobLocation: null,
    startDate: null,
    endDate: null,
    currentlyWorking: null,
    jobDescription: null
  };
  
  const formElements = cardElement.querySelectorAll('input, select, textarea');
  
  for (const element of formElements) {
    const fieldType = await detectExperienceFieldType(element, cardIndex);
    
    if (fieldType && !fields[fieldType]) {
      fields[fieldType] = element;
    }
  }
  
  return fields;
}

/**
 * Detects the type of experience field for a given element
 * @param {Element} element - The form element
 * @param {number} cardIndex - The card index for context
 * @returns {string|null} The field type or null
 */
async function detectExperienceFieldType(element, cardIndex) {
  const elementInfo = {
    name: (element.name || '').toLowerCase(),
    id: (element.id || '').toLowerCase(),
    placeholder: (element.placeholder || '').toLowerCase(),
    className: (element.className || '').toLowerCase(),
    type: element.type || 'text'
  };
  
  // Job Title patterns
  if (matchesPatterns(elementInfo, [
    'jobtitle', 'job_title', 'job-title', 'title', 'position', 
    'role', 'designation', 'occupation'
  ])) {
    return 'jobTitle';
  }
  
  // Company patterns
  if (matchesPatterns(elementInfo, [
    'company', 'employer', 'organization', 'org', 'company_name',
    'employer_name', 'workplace', 'firm', 'corporation'
  ])) {
    return 'company';
  }
  
  // Location patterns
  if (matchesPatterns(elementInfo, [
    'location', 'city', 'place', 'address', 'where', 'joblocation',
    'job_location', 'work_location', 'worklocation'
  ])) {
    return 'jobLocation';
  }
  
  // Start Date patterns
  if (matchesPatterns(elementInfo, [
    'startdate', 'start_date', 'start-date', 'from', 'begin', 
    'joining', 'commenced', 'employment_start'
  ]) || (elementInfo.type === 'date' || elementInfo.type === 'month')) {
    // Additional check for start vs end
    if (matchesPatterns(elementInfo, ['start', 'from', 'begin', 'joining'])) {
      return 'startDate';
    } else if (matchesPatterns(elementInfo, ['end', 'to', 'until', 'finish'])) {
      return 'endDate';
    }
    // Default to startDate if ambiguous
    return 'startDate';
  }
  
  // End Date patterns
  if (matchesPatterns(elementInfo, [
    'enddate', 'end_date', 'end-date', 'to', 'until', 'finish',
    'leaving', 'terminated', 'employment_end'
  ])) {
    return 'endDate';
  }
  
  // Currently working patterns (checkbox)
  if (element.type === 'checkbox' && matchesPatterns(elementInfo, [
    'current', 'currently', 'present', 'ongoing', 'still',
    'working', 'employed', 'active'
  ])) {
    return 'currentlyWorking';
  }
  
  // Description patterns (textarea or large text inputs)
  if (element.type === 'textarea' || matchesPatterns(elementInfo, [
    'description', 'desc', 'details', 'responsibilities', 'duties',
    'summary', 'experience', 'achievements', 'job_description'
  ])) {
    return 'jobDescription';
  }
  
  return null;
}

/**
 * Checks if element info matches any of the given patterns
 * @param {Object} elementInfo - Element information object
 * @param {Array} patterns - Array of patterns to match
 * @returns {boolean} True if matches any pattern
 */
function matchesPatterns(elementInfo, patterns) {
  const textToCheck = [
    elementInfo.name,
    elementInfo.id,
    elementInfo.placeholder,
    elementInfo.className
  ].join(' ').toLowerCase();
  
  return patterns.some(pattern => 
    textToCheck.includes(pattern.toLowerCase()) ||
    // Check for indexed patterns (e.g., jobTitle_1, company_2)
    textToCheck.includes(pattern.toLowerCase() + '_') ||
    textToCheck.includes(pattern.toLowerCase() + '-')
  );
}

/**
 * Checks if a field is experience-related
 * @param {Element} field - The form field element
 * @returns {boolean} True if experience-related
 */
function isExperienceRelatedField(field) {
  const experienceKeywords = [
    'job', 'company', 'employer', 'experience', 'work', 'position',
    'role', 'title', 'start', 'end', 'current', 'description',
    'location', 'employment', 'career', 'occupation'
  ];
  
  const fieldText = [
    field.name || '',
    field.id || '',
    field.placeholder || '',
    field.className || ''
  ].join(' ').toLowerCase();
  
  return experienceKeywords.some(keyword => fieldText.includes(keyword));
}

/**
 * Detects experience cards by field patterns when no containers found
 * @returns {Element|null} Parent container or null
 */
function detectExperienceCardsByFieldPatterns() {
  // Find all experience-related fields
  const allFields = document.querySelectorAll('input, select, textarea');
  const experienceFields = Array.from(allFields).filter(isExperienceRelatedField);
  
  if (experienceFields.length < 3) {
    return null;
  }
  
  // Find common parent that contains most experience fields
  let bestParent = null;
  let maxFields = 0;
  
  // Check various parent levels
  for (const field of experienceFields) {
    let parent = field.parentElement;
    for (let level = 0; level < 5 && parent; level++) {
      const fieldsInParent = experienceFields.filter(f => parent.contains(f));
      if (fieldsInParent.length > maxFields) {
        maxFields = fieldsInParent.length;
        bestParent = parent;
      }
      parent = parent.parentElement;
    }
  }
  
  return bestParent;
}

/**
 * Detects cards by grouping fields when no card containers found
 * @param {Element} parentContainer - Parent container element
 * @returns {Array} Array of detected card elements
 */
function detectCardsByFieldGrouping(parentContainer) {
  const formFields = parentContainer.querySelectorAll('input, select, textarea');
  const experienceFields = Array.from(formFields).filter(isExperienceRelatedField);
  
  if (experienceFields.length < 3) {
    return [];
  }
  
  // Try to group fields by numbered patterns (e.g., job_1, job_2)
  const numberedGroups = new Map();
  
  for (const field of experienceFields) {
    const fieldInfo = field.name + field.id + field.className;
    const numberMatch = fieldInfo.match(/_(\d+)|(\d+)_|(\d+)$/);
    
    if (numberMatch) {
      const number = numberMatch[1] || numberMatch[2] || numberMatch[3];
      if (!numberedGroups.has(number)) {
        numberedGroups.set(number, []);
      }
      numberedGroups.get(number).push(field);
    }
  }
  
  // Create virtual card containers for each group
  const cards = [];
  for (const [number, fields] of numberedGroups) {
    if (fields.length >= 2) {
      // Find common parent for these fields
      let commonParent = fields[0].parentElement;
      for (const field of fields) {
        while (commonParent && !commonParent.contains(field)) {
          commonParent = commonParent.parentElement;
        }
      }
      if (commonParent) {
        cards.push(commonParent);
      }
    }
  }
  
  return cards.length > 0 ? cards : [parentContainer]; // Fallback to parent container
}

function setupMutationObserver() {
  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any form elements were added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const formElements = node.querySelectorAll ? 
              node.querySelectorAll('input, select, textarea') : [];
            if (formElements.length > 0 || 
                (node.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName))) {
              shouldRedetect = true;
            }
          }
        });
      }
    });
    
    if (shouldRedetect) {
      debugLog('Dynamic content detected, re-running field detection...');
      setTimeout(async () => {
        detectedFields = await detectFormFields();
        debugLog(`Dynamic re-detection complete: ${detectedFields.length} fields`);
      }, 500); // Debounce
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
  
  debugLog('Mutation observer set up for dynamic content');
}

// Export functions for masterInjection to use
if (typeof window !== 'undefined') {
  window.masterDetector = {
    detectFormFields,
    detectExperienceCards,
    detectedFields: () => detectedFields,
    debugLog
  };
}

// ============================================================================
// START INITIALIZATION
// ============================================================================

  // Initialize immediately or when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
  } else {
    initializeContentScript();
  }

  console.log('Auto-Fill: Master Detector loaded and ready');
}