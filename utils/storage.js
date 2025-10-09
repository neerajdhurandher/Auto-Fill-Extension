/**
 * Storage Utilities for Auto-Fill Extension
 * Handles secure data storage with encryption for sensitive user data
 */

// Storage keys constants
const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  EXTENSION_SETTINGS: 'extensionSettings',
  LAST_DETECTION: 'lastDetection',
  PORTAL_CONFIGS: 'portalConfigs',
  FIELD_MAPPINGS: 'fieldMappings'
};

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12
};

/**
 * Storage Manager Class
 * Provides encrypted storage for sensitive data and plain storage for settings
 */
class StorageManager {
  constructor() {
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize storage manager with encryption key
   */
  async initialize() {
    try {
      await this.generateOrLoadEncryptionKey();
      this.isInitialized = true;
      console.log('Storage manager initialized');
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  /**
   * Generate or load encryption key from storage
   */
  async generateOrLoadEncryptionKey() {
    try {
      // Try to load existing key
      const result = await chrome.storage.local.get('encryptionKey');
      
      if (result.encryptionKey) {
        // Import existing key
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(result.encryptionKey),
          { name: ENCRYPTION_CONFIG.algorithm },
          false,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await crypto.subtle.generateKey(
          {
            name: ENCRYPTION_CONFIG.algorithm,
            length: ENCRYPTION_CONFIG.keyLength
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        // Export and store key
        const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
        await chrome.storage.local.set({
          encryptionKey: Array.from(new Uint8Array(keyData))
        });
      }
    } catch (error) {
      console.error('Error with encryption key:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @returns {Object} Encrypted data with IV
   */
  async encryptData(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
      
      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: iv
        },
        this.encryptionKey,
        dataBuffer
      );
      
      return {
        encrypted: Array.from(new Uint8Array(encryptedBuffer)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data with IV
   * @returns {string} Decrypted data
   */
  async decryptData(encryptedData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { encrypted, iv } = encryptedData;
      
      // Convert arrays back to Uint8Array
      const encryptedBuffer = new Uint8Array(encrypted);
      const ivBuffer = new Uint8Array(iv);
      
      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: ivBuffer
        },
        this.encryptionKey,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Store user profile data (encrypted)
   * @param {Object} profileData - User profile data
   */
  async setUserProfile(profileData) {
    try {
      const encryptedData = await this.encryptData(JSON.stringify(profileData));
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_PROFILE]: encryptedData
      });
      console.log('User profile saved securely');
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile data (decrypt)
   * @returns {Object|null} User profile data or null if not found
   */
  async getUserProfile() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE);
      
      if (!result[STORAGE_KEYS.USER_PROFILE]) {
        return null;
      }
      
      const decryptedData = await this.decryptData(result[STORAGE_KEYS.USER_PROFILE]);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  /**
   * Store extension settings (plain text)
   * @param {Object} settings - Extension settings
   */
  async setSettings(settings) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.EXTENSION_SETTINGS]: settings
      });
      console.log('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Retrieve extension settings
   * @returns {Object|null} Extension settings or null if not found
   */
  async getSettings() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.EXTENSION_SETTINGS);
      return result[STORAGE_KEYS.EXTENSION_SETTINGS] || null;
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return null;
    }
  }

  /**
   * Store field detection results (temporary, plain text)
   * @param {Object} detectionData - Field detection results
   */
  async setLastDetection(detectionData) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.LAST_DETECTION]: {
          ...detectionData,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to save detection results:', error);
      throw error;
    }
  }

  /**
   * Retrieve last field detection results
   * @returns {Object|null} Detection results or null if not found
   */
  async getLastDetection() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_DETECTION);
      return result[STORAGE_KEYS.LAST_DETECTION] || null;
    } catch (error) {
      console.error('Failed to retrieve detection results:', error);
      return null;
    }
  }

  /**
   * Store portal-specific configurations
   * @param {Object} portalConfigs - Portal configurations
   */
  async setPortalConfigs(portalConfigs) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.PORTAL_CONFIGS]: portalConfigs
      });
    } catch (error) {
      console.error('Failed to save portal configs:', error);
      throw error;
    }
  }

  /**
   * Retrieve portal configurations
   * @returns {Object|null} Portal configurations or null if not found
   */
  async getPortalConfigs() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PORTAL_CONFIGS);
      return result[STORAGE_KEYS.PORTAL_CONFIGS] || this.getDefaultPortalConfigs();
    } catch (error) {
      console.error('Failed to retrieve portal configs:', error);
      return this.getDefaultPortalConfigs();
    }
  }

  /**
   * Get default portal configurations
   * @returns {Object} Default portal configurations
   */
  getDefaultPortalConfigs() {
    return {
      linkedin: {
        selectors: {
          firstName: ['input[name*="firstName"]', 'input[name*="first-name"]', 'input[id*="firstName"]'],
          lastName: ['input[name*="lastName"]', 'input[name*="last-name"]', 'input[id*="lastName"]'],
          fullName: ['input[name*="name"]:not([name*="first"]):not([name*="last"])', 'input[id*="fullName"]'],
          email: ['input[name*="email"]', 'input[type="email"]'],
          phone: ['input[name*="phone"]', 'input[type="tel"]'],
          address: ['input[name*="address"]', 'textarea[name*="address"]'],
          city: ['input[name*="city"]'],
          country: ['select[name*="country"]', 'input[name*="country"]'],
          postalCode: ['input[name*="postal"]', 'input[name*="zip"]'],
          jobTitle: ['input[name*="title"]', 'input[name*="position"]'],
          company: ['input[name*="company"]', 'input[name*="employer"]'],
          experience: ['textarea[name*="experience"]', 'textarea[id*="experience"]'],
          skills: ['textarea[name*="skills"]', 'input[name*="skills"]']
        },
        priority: 1,
        domain: 'linkedin.com'
      },
      indeed: {
        selectors: {
          fullName: ['input[name="applicant.name"]'],
          firstName: ['input[name*="firstName"]', 'input[name*="first"]'],
          lastName: ['input[name*="lastName"]', 'input[name*="last"]'],
          email: ['input[name="applicant.emailAddress"]', 'input[type="email"]'],
          phone: ['input[name="applicant.phoneNumber"]', 'input[type="tel"]'],
          address: ['input[name*="address"]', 'textarea[name*="address"]'],
          city: ['input[name*="city"]'],
          country: ['select[name*="country"]'],
          postalCode: ['input[name*="postal"]', 'input[name*="zip"]'],
          resume: ['input[type="file"]'],
          coverLetter: ['textarea[name*="coverLetter"]']
        },
        priority: 2,
        domain: 'indeed.com'
      },
      glassdoor: {
        selectors: {
          fullName: ['input[name*="name"]', 'input[placeholder*="name"]'],
          firstName: ['input[name*="firstName"]', 'input[placeholder*="first"]'],
          lastName: ['input[name*="lastName"]', 'input[placeholder*="last"]'],
          email: ['input[name*="email"]', 'input[type="email"]'],
          phone: ['input[name*="phone"]', 'input[type="tel"]'],
          address: ['input[name*="address"]'],
          city: ['input[name*="city"]'],
          country: ['select[name*="country"]'],
          location: ['input[name*="location"]', 'input[placeholder*="location"]']
        },
        priority: 3,
        domain: 'glassdoor.com'
      }
    };
  }

  /**
   * Clear all stored data (except encryption key)
   */
  async clearAllData() {
    try {
      // Get encryption key before clearing
      const keyResult = await chrome.storage.local.get('encryptionKey');
      
      // Clear all data
      await chrome.storage.local.clear();
      
      // Restore encryption key
      if (keyResult.encryptionKey) {
        await chrome.storage.local.set({
          encryptionKey: keyResult.encryptionKey
        });
      }
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage details
   */
  async getStorageInfo() {
    try {
      const result = await chrome.storage.local.get(null);
      const keys = Object.keys(result);
      const totalSize = JSON.stringify(result).length;
      
      return {
        totalKeys: keys.length,
        totalSize: totalSize,
        keys: keys,
        hasProfile: !!result[STORAGE_KEYS.USER_PROFILE],
        hasSettings: !!result[STORAGE_KEYS.EXTENSION_SETTINGS]
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}

// Create global storage manager instance
const storageManager = new StorageManager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.storageManager = storageManager;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, storageManager, STORAGE_KEYS };
}