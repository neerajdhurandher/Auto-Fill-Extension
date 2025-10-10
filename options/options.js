/**
 * Options Page JavaScript for Auto-Fill Extension
 * Handles settings configuration and profile management
 */

// DOM Elements
let elements = {};
let currentTab = 'profile';
let storageManager = null;

/**
 * Initialize options page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  setupEventListeners();
  await initializeStorageManager();
  await loadExistingData();
  showTab('profile');
});

/**
 * Cache DOM elements for better performance
 */
function initializeElements() {
  elements = {
    // Navigation
    navButtons: document.querySelectorAll('.nav__button'),
    tabs: document.querySelectorAll('.tab'),
    
    // Profile form - Personal Details
    profileForm: document.getElementById('profileForm'),
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    email: document.getElementById('email'),
    phoneCountryCode: document.getElementById('phoneCountryCode'),
    phoneNumber: document.getElementById('phoneNumber'),
    phoneType: document.getElementById('phoneType'),
    
    // Address fields
    addressLine1: document.getElementById('addressLine1'),
    addressLine2: document.getElementById('addressLine2'),
    city: document.getElementById('city'),
    postalCode: document.getElementById('postalCode'),
    country: document.getElementById('country'),
    
    // Professional fields
    experienceList: document.getElementById('experienceList'),
    addExperienceBtn: document.getElementById('addExperienceBtn'),
    skills: document.getElementById('skills'),
    coverLetter: document.getElementById('coverLetter'),
    
    // Action buttons
    clearProfile: document.getElementById('clearProfile'),
    clearAllData: document.getElementById('clearAllData'),
    exportData: document.getElementById('exportData')
  };
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
  // Navigation
  elements.navButtons.forEach(button => {
    button.addEventListener('click', handleTabClick);
  });
  
  // Form submission
  elements.profileForm.addEventListener('submit', handleProfileSubmit);
  
  // Experience management
  elements.addExperienceBtn.addEventListener('click', handleAddExperience);
  
  // Action buttons
  elements.clearProfile.addEventListener('click', handleClearProfile);
  elements.clearAllData.addEventListener('click', handleClearAllData);
  elements.exportData.addEventListener('click', handleExportData);
  
  // Auto-save on form changes (debounced)
  const formInputs = elements.profileForm.querySelectorAll('input:not([data-no-autosave]), textarea:not([data-no-autosave]), select:not([data-no-autosave])');
  formInputs.forEach(input => {
    input.addEventListener('input', debounce(handleAutoSave, 1000));
    input.addEventListener('change', debounce(handleAutoSave, 1000));
  });
}

/**
 * Initialize storage manager
 */
async function initializeStorageManager() {
  try {
    // Storage manager should now be available from the static script
    if (window.storageManager) {
      storageManager = window.storageManager;
      await storageManager.initialize();
      console.log('Storage manager initialized successfully');
    } else {
      throw new Error('Storage manager not available');
    }
  } catch (error) {
    console.error('Failed to initialize storage manager:', error);
    showMessage('Failed to initialize storage. Some features may not work.', 'error');
  }
}

/**
 * Load existing data from storage
 */
async function loadExistingData() {
  try {
    showLoading(true);
    
    if (storageManager) {
      // Load user profile
      const profileData = await storageManager.getUserProfile();
      if (profileData) {
        populateProfileForm(profileData);
      }
    }
  } catch (error) {
    console.error('Error loading existing data:', error);
    showMessage('Error loading saved data', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Populate profile form with saved data
 * @param {Object} profileData - Saved profile data
 */
function populateProfileForm(profileData) {
  const { personal, professional } = profileData;
  
  if (personal) {
    elements.firstName.value = personal.firstName || '';
    elements.lastName.value = personal.lastName || '';
    elements.email.value = personal.email || '';
    
    // Phone fields
    if (personal.phone) {
      elements.phoneCountryCode.value = personal.phone.countryCode || '+1';
      elements.phoneNumber.value = personal.phone.number || '';
      elements.phoneType.value = personal.phone.type || 'mobile';
    }
    
    // Address fields
    if (personal.address) {
      elements.addressLine1.value = personal.address.line1 || '';
      elements.addressLine2.value = personal.address.line2 || '';
      elements.city.value = personal.address.city || '';
      elements.postalCode.value = personal.address.postalCode || '';
      elements.country.value = personal.address.country || '';
    }
  }
  
  if (professional) {
    elements.skills.value = professional.skills?.join(', ') || '';
    elements.coverLetter.value = professional.coverLetter || '';
    
    // Load experience entries
    if (professional.experience && professional.experience.length > 0) {
      professional.experience.forEach(exp => {
        addExperienceEntry(exp);
      });
    } else {
      // Add one empty experience entry by default
      addExperienceEntry();
    }
  } else {
    // Add one empty experience entry by default
    addExperienceEntry();
  }
}

/**
 * Handle tab navigation
 * @param {Event} event - Click event
 */
function handleTabClick(event) {
  const tabName = event.currentTarget.getAttribute('data-tab');
  showTab(tabName);
}

/**
 * Show specific tab
 * @param {string} tabName - Tab to show
 */
function showTab(tabName) {
  // Update navigation
  elements.navButtons.forEach(button => {
    button.classList.remove('nav__button--active');
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('nav__button--active');
    }
  });
  
  // Update content
  elements.tabs.forEach(tab => {
    tab.classList.remove('tab--active');
    if (tab.id === tabName) {
      tab.classList.add('tab--active');
    }
  });
  
  currentTab = tabName;
}

/**
 * Handle profile form submission
 * @param {Event} event - Submit event
 */
async function handleProfileSubmit(event) {
  event.preventDefault();
  
  try {
    showLoading(true);
    await saveProfileData();
    showMessage('Profile saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showMessage('Error saving profile. Please try again.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Save profile data to storage
 */
async function saveProfileData() {
  const profileData = {
    personal: {
      firstName: elements.firstName.value.trim(),
      lastName: elements.lastName.value.trim(),
      email: elements.email.value.trim(),
      phone: {
        countryCode: elements.phoneCountryCode.value,
        number: elements.phoneNumber.value.trim(),
        full: `${elements.phoneCountryCode.value} ${elements.phoneNumber.value.trim()}`.trim(),
        type: elements.phoneType.value
      },
      address: {
        line1: elements.addressLine1.value.trim(),
        line2: elements.addressLine2.value.trim(),
        city: elements.city.value.trim(),
        postalCode: elements.postalCode.value.trim(),
        country: elements.country.value
      }
    },
    professional: {
      experiences: collectExperienceData(),
      skills: elements.skills.value.split(',').map(s => s.trim()).filter(s => s),
      coverLetter: elements.coverLetter.value.trim()
    },
    preferences: {
      autoFill: true,
      notifications: true
    }
  };
  
  if (storageManager) {
    await storageManager.setUserProfile(profileData);
  } else {
    // Fallback to direct Chrome storage
    await chrome.storage.local.set({ userProfile: profileData });
  }
}

/**
 * Handle add experience button click
 */
function handleAddExperience() {
  addExperienceEntry();
}

/**
 * Add a new experience entry to the form
 * @param {Object} experienceData - Optional existing experience data
 */
function addExperienceEntry(experienceData = {}) {
  const entryIndex = elements.experienceList.children.length;
  const entryDiv = document.createElement('div');
  entryDiv.className = 'experience-entry';
  entryDiv.dataset.index = entryIndex;
  
  entryDiv.innerHTML = `
    <div class="experience-entry__header">
      <h4 class="experience-entry__title">Experience #${entryIndex + 1}</h4>
      <button type="button" class="experience-entry__remove" onclick="removeExperienceEntry(${entryIndex})">
        Remove
      </button>
    </div>
    
    <div class="experience-entry__form">
      <div class="form-group">
        <label class="form-label" for="jobTitle_${entryIndex}">Job Title *</label>
        <input class="form-input" type="text" id="jobTitle_${entryIndex}" 
               value="${experienceData.jobTitle || ''}" 
               placeholder="e.g., Software Engineer, Marketing Manager" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="company_${entryIndex}">Company *</label>
        <input class="form-input" type="text" id="company_${entryIndex}" 
               value="${experienceData.company || ''}" 
               placeholder="Company name" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="location_${entryIndex}">Location</label>
        <input class="form-input" type="text" id="location_${entryIndex}" 
               value="${experienceData.location || ''}" 
               placeholder="City, State/Country">
      </div>
      
      <div class="form-group experience-entry__dates">
        <div>
          <label class="form-label" for="startDate_${entryIndex}">Start Date</label>
          <input class="form-input" type="month" id="startDate_${entryIndex}" 
                 value="${experienceData.startDate || ''}">
        </div>
        
        <div>
          <label class="form-label" for="endDate_${entryIndex}">End Date</label>
          <input class="form-input" type="month" id="endDate_${entryIndex}" 
                 value="${experienceData.endDate || ''}" 
                 ${experienceData.currentJob ? 'disabled' : ''}>
        </div>
        
        <div class="current-job-checkbox">
          <input type="checkbox" id="currentJob_${entryIndex}" 
                 ${experienceData.currentJob ? 'checked' : ''}
                 onchange="toggleEndDate(${entryIndex})">
          <label for="currentJob_${entryIndex}">Currently working here</label>
        </div>
      </div>
      
      <div class="form-group form-group--full">
        <label class="form-label" for="description_${entryIndex}">Job Description</label>
        <textarea class="form-input form-input--textarea" id="description_${entryIndex}" 
                  placeholder="Describe your key responsibilities, achievements, and technologies used">${experienceData.description || ''}</textarea>
      </div>
    </div>
  `;
  
  elements.experienceList.appendChild(entryDiv);
  
  // Add event listeners for auto-save
  const inputs = entryDiv.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', debounce(handleAutoSave, 1000));
    input.addEventListener('change', debounce(handleAutoSave, 1000));
  });
}

/**
 * Remove experience entry
 * @param {number} index - Entry index to remove
 */
function removeExperienceEntry(index) {
  const entryDiv = document.querySelector(`[data-index="${index}"]`);
  if (entryDiv) {
    entryDiv.remove();
    updateExperienceIndices();
    handleAutoSave();
  }
}

/**
 * Update experience entry indices after removal
 */
function updateExperienceIndices() {
  const entries = elements.experienceList.children;
  Array.from(entries).forEach((entry, newIndex) => {
    entry.dataset.index = newIndex;
    const title = entry.querySelector('.experience-entry__title');
    if (title) {
      title.textContent = `Experience #${newIndex + 1}`;
    }
    
    // Update remove button
    const removeBtn = entry.querySelector('.experience-entry__remove');
    if (removeBtn) {
      removeBtn.setAttribute('onclick', `removeExperienceEntry(${newIndex})`);
    }
  });
}

/**
 * Toggle end date field based on current job checkbox
 * @param {number} index - Experience entry index
 */
function toggleEndDate(index) {
  const checkbox = document.getElementById(`currentJob_${index}`);
  const endDateInput = document.getElementById(`endDate_${index}`);
  
  if (checkbox.checked) {
    endDateInput.disabled = true;
    endDateInput.value = '';
  } else {
    endDateInput.disabled = false;
  }
}

/**
 * Collect all experience data from the form
 * @returns {Array} Array of experience objects
 */
function collectExperienceData() {
  const experiences = [];
  const entries = elements.experienceList.children;
  
  Array.from(entries).forEach((entry, index) => {
    const jobTitle = document.getElementById(`jobTitle_${index}`)?.value.trim();
    const company = document.getElementById(`company_${index}`)?.value.trim();
    
    // Only include entries with at least job title and company
    if (jobTitle && company) {
      experiences.push({
        jobTitle: jobTitle,
        company: company,
        location: document.getElementById(`location_${index}`)?.value.trim() || '',
        startDate: document.getElementById(`startDate_${index}`)?.value || '',
        endDate: document.getElementById(`endDate_${index}`)?.value || '',
        currentJob: document.getElementById(`currentJob_${index}`)?.checked || false,
        description: document.getElementById(`description_${index}`)?.value.trim() || ''
      });
    }
  });
  
  return experiences;
}

// Make functions global for onclick handlers
window.removeExperienceEntry = removeExperienceEntry;
window.toggleEndDate = toggleEndDate;

/**
 * Handle auto-save functionality
 */
async function handleAutoSave() {
  try {
    await saveProfileData();
    console.log('Profile auto-saved');
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}

/**
 * Handle clear profile button
 */
async function handleClearProfile() {
  if (!confirm('Are you sure you want to clear all profile data? This action cannot be undone.')) {
    return;
  }
  
  try {
    showLoading(true);
    
    // Clear form
    elements.profileForm.reset();
    
    // Clear from storage
    if (storageManager) {
      await storageManager.setUserProfile({});
    } else {
      await chrome.storage.local.remove('userProfile');
    }
    
    showMessage('Profile cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing profile:', error);
    showMessage('Error clearing profile', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Handle clear all data button
 */
async function handleClearAllData() {
  if (!confirm('Are you sure you want to clear ALL extension data? This includes your profile, settings, and cached data. This action cannot be undone.')) {
    return;
  }
  
  try {
    showLoading(true);
    
    if (storageManager) {
      await storageManager.clearAllData();
    } else {
      await chrome.storage.local.clear();
    }
    
    // Reset form
    elements.profileForm.reset();
    
    showMessage('All data cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing all data:', error);
    showMessage('Error clearing data', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Handle export data button
 */
async function handleExportData() {
  try {
    showLoading(true);
    
    let exportData = {};
    
    if (storageManager) {
      const profile = await storageManager.getUserProfile();
      const settings = await storageManager.getSettings();
      
      exportData = {
        profile: profile || {},
        settings: settings || {},
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
    } else {
      const result = await chrome.storage.local.get(null);
      exportData = {
        ...result,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
    }
    
    // Create download
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `autofill-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showMessage('Error exporting data', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Show loading state
 * @param {boolean} isLoading - Whether to show loading state
 */
function showLoading(isLoading) {
  const container = document.querySelector('.container');
  if (isLoading) {
    container.classList.add('loading');
  } else {
    container.classList.remove('loading');
  }
}

/**
 * Show message to user
 * @param {string} text - Message text
 * @param {string} type - Message type ('success' or 'error')
 */
function showMessage(text, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message
  const message = document.createElement('div');
  message.className = `message message--${type}`;
  message.textContent = text;
  
  // Insert at top of content
  const content = document.querySelector('.content');
  content.insertBefore(message, content.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (message.parentNode) {
      message.remove();
    }
  }, 5000);
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}