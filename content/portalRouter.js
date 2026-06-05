/**
 * Portal Router - Domain-based Portal Detection and Routing
 * Routes to portal-specific detectors and injectors based on URL domain
 */

const PortalRouter = {
  /**
   * Domain patterns for different job portals
   */
  portalPatterns: {
    workdays: [
      'myworkdayjobs.com',
      'wd5.myworkdayjobs',
      'wd1.myworkdayjobs',
      'wd2.myworkdayjobs',
      'wd3.myworkdayjobs'
    ],
    oracle: [
      'oraclecloud.com',
      'fa.em2.oraclecloud.com',
      'recruiting.oraclecloud.com'
    ]
    // Add more portals as needed
  },

  /**
   * Detects the current portal based on hostname
   * @returns {string|null} Portal type ('workdays', 'oracle', or null for unknown)
   */
  detectPortal() {
    const hostname = window.location.hostname.toLowerCase();
    console.log('[Portal Router] Detecting portal from hostname:', hostname);

    // Check each portal pattern
    for (const [portalType, patterns] of Object.entries(this.portalPatterns)) {
      for (const pattern of patterns) {
        if (hostname.includes(pattern.toLowerCase())) {
          console.log(`[Portal Router] ✓ Detected portal: ${portalType}`);
          return portalType;
        }
      }
    }

    console.log('[Portal Router] ⚠ Unknown portal, will use master detector as fallback');
    return null; // Will trigger master detector fallback
  },

  /**
   * Gets the appropriate detector for the current portal
   * @returns {Object} Detector module or null
   */
  getDetector() {
    const portalType = this.detectPortal();

    switch (portalType) {
      case 'workdays':
        // Workdays detector will be loaded dynamically
        if (typeof WorkdaysDetector !== 'undefined') {
          return WorkdaysDetector;
        }
        console.warn('[Portal Router] WorkdaysDetector not loaded');
        return null;

      case 'oracle':
        // Oracle detector will be loaded dynamically
        if (typeof OracleDetector !== 'undefined') {
          return OracleDetector;
        }
        console.warn('[Portal Router] OracleDetector not loaded');
        return null;

      default:
        // Fall back to master detector
        console.log('[Portal Router] Using master detector as fallback');
        return null; // This will trigger masterDetector usage
    }
  },

  /**
   * Gets the appropriate injector for the current portal
   * @returns {Object} Injector module or null
   */
  getInjector() {
    const portalType = this.detectPortal();

    switch (portalType) {
      case 'workdays':
        if (typeof WorkdaysInjection !== 'undefined') {
          return WorkdaysInjection;
        }
        console.warn('[Portal Router] WorkdaysInjection not loaded');
        return null;

      case 'oracle':
        if (typeof OracleInjection !== 'undefined') {
          return OracleInjection;
        }
        console.warn('[Portal Router] OracleInjection not loaded');
        return null;

      default:
        console.log('[Portal Router] Using master injection as fallback');
        return null; // This will trigger masterInjection usage
    }
  },

  /**
   * Gets portal-specific configuration
   * @returns {Object} Portal configuration
   */
  getPortalConfig() {
    const portalType = this.detectPortal();

    const configs = {
      workdays: {
        name: 'Workday',
        hasMultiStep: true,
        dynamicContent: true,
        customComponents: true,
        injectionDelay: 150,
        requiresScrolling: true
      },
      oracle: {
        name: 'Oracle Cloud',
        hasMultiStep: true,
        dynamicContent: true,
        customComponents: true,
        injectionDelay: 100,
        requiresScrolling: false
      }
    };

    return configs[portalType] || {
      name: 'Unknown Portal',
      hasMultiStep: false,
      dynamicContent: false,
      customComponents: false,
      injectionDelay: 100,
      requiresScrolling: false
    };
  },

  /**
   * Validates if portal-specific modules are loaded
   * @returns {Object} Validation result
   */
  validateModules() {
    const portalType = this.detectPortal();
    
    if (!portalType) {
      return {
        isValid: true,
        useFallback: true,
        message: 'Using master detector/injector as fallback'
      };
    }

    const detector = this.getDetector();
    const injector = this.getInjector();

    if (!detector || !injector) {
      return {
        isValid: false,
        useFallback: true,
        message: `Portal-specific modules for ${portalType} not loaded, using fallback`
      };
    }

    return {
      isValid: true,
      useFallback: false,
      portalType: portalType,
      message: `Using ${portalType}-specific modules`
    };
  },

  /**
   * Main routing function to detect fields
   * @returns {Object} Detected fields or null
   */
  async detectFields() {
    console.log('[Portal Router] Starting field detection...');
    
    const validation = this.validateModules();
    console.log('[Portal Router]', validation.message);

    // Try portal-specific detector first
    if (!validation.useFallback) {
      const detector = this.getDetector();
      if (detector && typeof detector.detect === 'function') {
        try {
          const result = await detector.detect();
          if (result) {
            console.log('[Portal Router] ✓ Portal-specific detection successful');
            return result;
          }
        } catch (error) {
          console.error('[Portal Router] Portal-specific detection failed:', error);
        }
      }
    }

    // Fallback to master detector
    console.log('[Portal Router] Falling back to master detector');
    if (typeof MasterDetector !== 'undefined' && typeof MasterDetector.detect === 'function') {
      return await MasterDetector.detect();
    }

    console.error('[Portal Router] No detector available');
    return null;
  },

  /**
   * Main routing function to inject data
   * @param {Object} detectedFields - Detected fields
   * @param {Object} profileData - User profile data
   * @returns {Object} Injection result
   */
  async injectData(detectedFields, profileData) {
    console.log('[Portal Router] Starting data injection...');
    
    const validation = this.validateModules();

    // Try portal-specific injector first
    if (!validation.useFallback) {
      const injector = this.getInjector();
      if (injector && typeof injector.fillForm === 'function') {
        try {
          const result = await injector.fillForm(detectedFields, profileData);
          if (result.success) {
            console.log('[Portal Router] ✓ Portal-specific injection successful');
            return result;
          }
        } catch (error) {
          console.error('[Portal Router] Portal-specific injection failed:', error);
        }
      }
    }

    // Fallback to master injection
    console.log('[Portal Router] Falling back to master injection');
    if (typeof MasterInjection !== 'undefined' && typeof MasterInjection.fillForm === 'function') {
      return await MasterInjection.fillForm(detectedFields, profileData);
    }

    console.error('[Portal Router] No injector available');
    return { success: false, error: 'No injector available' };
  },

  /**
   * Utility: Checks if a portal is supported
   * @param {string} url - URL to check
   * @returns {boolean} True if portal is supported
   */
  isPortalSupported(url) {
    const hostname = new URL(url).hostname.toLowerCase();
    
    for (const patterns of Object.values(this.portalPatterns)) {
      for (const pattern of patterns) {
        if (hostname.includes(pattern.toLowerCase())) {
          return true;
        }
      }
    }
    
    return false;
  },

  /**
   * Gets list of all supported portals
   * @returns {Array} List of supported portal names
   */
  getSupportedPortals() {
    return Object.keys(this.portalPatterns).map(key => {
      return {
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        domains: this.portalPatterns[key]
      };
    });
  }
};

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortalRouter;
}
