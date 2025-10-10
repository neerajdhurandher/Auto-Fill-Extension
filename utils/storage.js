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
      // Don't throw error, allow fallback to unencrypted storage
      this.isInitialized = false;
    }
  }

  /**
   * Generate or load encryption key from storage
   */
  async generateOrLoadEncryptionKey() {
    try {
      // Check if Web Crypto API is available
      if (!crypto || !crypto.subtle) {
        console.warn('Web Crypto API not available, using unencrypted storage');
        return;
      }

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
      this.encryptionKey = null;
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @returns {Object} Encrypted data with IV
   */
  async encryptData(data) {
    if (!this.encryptionKey) {
      throw new Error('Encryption not available');
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
    if (!this.encryptionKey) {
      throw new Error('Decryption not available');
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
   * Store user profile data (encrypt if possible)
   * @param {Object} profileData - User profile data
   */
  async setUserProfile(profileData) {
    try {
      // Try to encrypt the data if encryption is available
      if (this.encryptionKey) {
        try {
          const encryptedData = await this.encryptData(JSON.stringify(profileData));
          await chrome.storage.local.set({
            [STORAGE_KEYS.USER_PROFILE]: encryptedData
          });
          console.log('User profile saved securely (encrypted)');
          return;
        } catch (encryptionError) {
          console.warn('Encryption failed, falling back to plain text:', encryptionError);
        }
      }
      
      // Fallback to plain text storage
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_PROFILE]: profileData
      });
      console.log('User profile saved (plain text)');
      
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile data (decrypt if needed)
   * @returns {Object|null} User profile data or null if not found
   */
  async getUserProfile() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE);
      
      if (!result[STORAGE_KEYS.USER_PROFILE]) {
        return null;
      }

      const storedData = result[STORAGE_KEYS.USER_PROFILE];
      
      // Check if data is already in plain object format (legacy data or fallback)
      if (typeof storedData === 'object' && storedData.personal && !storedData.encrypted) {
        console.log('Loading plain text profile data');
        return storedData;
      }
      
      // Check if data is a plain JSON string (legacy data)
      if (typeof storedData === 'string') {
        console.log('Loading legacy JSON string profile data');
        try {
          return JSON.parse(storedData);
        } catch (parseError) {
          console.error('Failed to parse legacy JSON data:', parseError);
          return null;
        }
      }
      
      // Try to decrypt (new encrypted format)
      if (storedData.encrypted && storedData.iv) {
        try {
          const decryptedData = await this.decryptData(storedData);
          return JSON.parse(decryptedData);
        } catch (decryptError) {
          console.error('Failed to decrypt profile data:', decryptError);
          // If decryption fails, return null so user can re-enter their data
          return null;
        }
      }
      
      console.warn('Unknown profile data format:', storedData);
      return null;
      
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  /**
   * Store extension settings (plain text)
   * @param {Object} settings - Extension settings
   */
  async setExtensionSettings(settings) {
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
  async getExtensionSettings() {
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
   * Clear all stored data
   */
  async clearAllData() {
    try {
      await chrome.storage.local.clear();
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage statistics
   */
  async getStorageInfo() {
    try {
      const result = await chrome.storage.local.get(null);
      return {
        totalItems: Object.keys(result).length,
        hasProfile: !!result[STORAGE_KEYS.USER_PROFILE],
        hasSettings: !!result[STORAGE_KEYS.EXTENSION_SETTINGS]
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}

// Create global storage manager instance (only if not already exists)
if (typeof window !== 'undefined' && !window.storageManager) {
  const storageManager = new StorageManager();
  window.storageManager = storageManager;
} else if (typeof window === 'undefined' && typeof storageManager === 'undefined') {
  const storageManager = new StorageManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, storageManager: window?.storageManager, STORAGE_KEYS };
}