/**
 * Advanced Encryption Utilities for Auto-Fill Extension
 * Provides enhanced security with CryptoJS fallback and key derivation
 */

// Import CryptoJS for fallback encryption
const CryptoJS = (function() {
  // This will be loaded dynamically when needed
  return null;
})();

/**
 * Advanced Encryption Manager
 * Handles both Web Crypto API and CryptoJS fallback
 */
class AdvancedEncryption {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12;
    this.saltLength = 16;
    this.iterations = 100000;
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize encryption with key derivation
   * @param {string} passphrase - Optional passphrase for key derivation
   */
  async initialize(passphrase = null) {
    try {
      if (passphrase) {
        await this.deriveKeyFromPassphrase(passphrase);
      } else {
        await this.generateOrLoadMasterKey();
      }
      this.isInitialized = true;
      console.log('Advanced encryption initialized');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Derive encryption key from user passphrase
   * @param {string} passphrase - User-provided passphrase
   */
  async deriveKeyFromPassphrase(passphrase) {
    try {
      // Get or generate salt
      let salt = await this.getSalt();
      if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
        await this.storeSalt(salt);
      }

      // Derive key using PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algorithm, length: this.keyLength },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw error;
    }
  }

  /**
   * Generate or load master encryption key
   */
  async generateOrLoadMasterKey() {
    try {
      const result = await chrome.storage.local.get('masterEncryptionKey');
      
      if (result.masterEncryptionKey) {
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(result.masterEncryptionKey),
          { name: this.algorithm },
          false,
          ['encrypt', 'decrypt']
        );
      } else {
        this.encryptionKey = await crypto.subtle.generateKey(
          {
            name: this.algorithm,
            length: this.keyLength
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
        await chrome.storage.local.set({
          masterEncryptionKey: Array.from(new Uint8Array(keyData))
        });
      }
    } catch (error) {
      console.error('Master key generation failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt data with metadata and integrity check
   * @param {string} data - Data to encrypt
   * @returns {Object} Encrypted data with metadata
   */
  async encryptData(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      // Create metadata
      const metadata = {
        timestamp: Date.now(),
        version: '2.0',
        algorithm: this.algorithm
      };
      
      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.encryptionKey,
        dataBuffer
      );
      
      // Calculate integrity hash
      const integrityHash = await this.calculateIntegrityHash(encryptedBuffer);
      
      return {
        encrypted: Array.from(new Uint8Array(encryptedBuffer)),
        iv: Array.from(iv),
        metadata: metadata,
        integrity: integrityHash
      };
    } catch (error) {
      console.error('Advanced encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data with integrity verification
   * @param {Object} encryptedData - Encrypted data with metadata
   * @returns {string} Decrypted data
   */
  async decryptData(encryptedData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { encrypted, iv, metadata, integrity } = encryptedData;
      
      // Verify integrity
      const encryptedBuffer = new Uint8Array(encrypted);
      const calculatedHash = await this.calculateIntegrityHash(encryptedBuffer);
      
      if (calculatedHash !== integrity) {
        throw new Error('Data integrity verification failed');
      }
      
      // Decrypt data
      const ivBuffer = new Uint8Array(iv);
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: ivBuffer
        },
        this.encryptionKey,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Advanced decryption failed:', error);
      throw error;
    }
  }

  /**
   * Calculate integrity hash for tamper detection
   * @param {ArrayBuffer} data - Data buffer
   * @returns {string} Integrity hash
   */
  async calculateIntegrityHash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get stored salt
   * @returns {Uint8Array|null} Salt or null
   */
  async getSalt() {
    try {
      const result = await chrome.storage.local.get('encryptionSalt');
      return result.encryptionSalt ? new Uint8Array(result.encryptionSalt) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store salt
   * @param {Uint8Array} salt - Salt to store
   */
  async storeSalt(salt) {
    await chrome.storage.local.set({
      encryptionSalt: Array.from(salt)
    });
  }

  /**
   * Securely wipe encryption keys from memory
   */
  wipeKeys() {
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * Change encryption passphrase
   * @param {string} oldPassphrase - Current passphrase
   * @param {string} newPassphrase - New passphrase
   */
  async changePassphrase(oldPassphrase, newPassphrase) {
    try {
      // Re-encrypt all data with new passphrase
      const oldKey = this.encryptionKey;
      
      // Derive new key
      await this.deriveKeyFromPassphrase(newPassphrase);
      const newKey = this.encryptionKey;
      
      // Get all encrypted data
      const result = await chrome.storage.local.get('userProfile');
      
      if (result.userProfile) {
        // Decrypt with old key
        this.encryptionKey = oldKey;
        const decryptedData = await this.decryptData(result.userProfile);
        
        // Encrypt with new key
        this.encryptionKey = newKey;
        const reencryptedData = await this.encryptData(decryptedData);
        
        // Store re-encrypted data
        await chrome.storage.local.set({ userProfile: reencryptedData });
      }
      
      console.log('Passphrase changed successfully');
    } catch (error) {
      console.error('Passphrase change failed:', error);
      throw error;
    }
  }
}

// Create global instance
const advancedEncryption = new AdvancedEncryption();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.advancedEncryption = advancedEncryption;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedEncryption, advancedEncryption };
}