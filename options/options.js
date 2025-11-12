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
    state: document.getElementById('state'),
    postalCode: document.getElementById('postalCode'),
    country: document.getElementById('country'),
    currentLocation: document.getElementById('currentLocation'),
    willingToRelocate: document.getElementById('willingToRelocate'),
    
    // Professional fields
    totalExperience: document.getElementById('totalExperience'),
    noticePeriod: document.getElementById('noticePeriod'),
    currentSalary: document.getElementById('currentSalary'),
    expectedSalary: document.getElementById('expectedSalary'),
    linkedinUrl: document.getElementById('linkedinUrl'),
    githubUrl: document.getElementById('githubUrl'),
    portfolioUrl: document.getElementById('portfolioUrl'),
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
  
  // Event delegation for experience entries
  elements.experienceList.addEventListener('click', handleExperienceListClick);
  elements.experienceList.addEventListener('change', handleExperienceListChange);
  
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
 * Handle clicks within experience list (event delegation)
 * @param {Event} event - Click event
 */
function handleExperienceListClick(event) {
  if (event.target.classList.contains('experience-entry__remove')) {
    const entryId = event.target.dataset.entryId;
    removeExperienceEntry(entryId);
  }
}

/**
 * Handle change events within experience list (event delegation)
 * @param {Event} event - Change event
 */
function handleExperienceListChange(event) {
  if (event.target.type === 'checkbox' && event.target.id.includes('currentJob_')) {
    const entryId = event.target.dataset.entryId;
    toggleEndDate(entryId);
  }
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
      elements.state.value = personal.address.state || '';
      elements.postalCode.value = personal.address.postalCode || '';
      elements.country.value = personal.address.country || '';
    }
    
    // Location and relocation preferences
    elements.currentLocation.value = personal.currentLocation || '';
    elements.willingToRelocate.value = personal.willingToRelocate || '';
  }
  
  if (professional) {
    // Professional details
    elements.totalExperience.value = professional.totalExperience || '';
    elements.noticePeriod.value = professional.noticePeriod || '';
    elements.currentSalary.value = professional.currentSalary || '';
    elements.expectedSalary.value = professional.expectedSalary || '';
    
    // Professional links
    elements.linkedinUrl.value = professional.linkedinUrl || '';
    elements.githubUrl.value = professional.githubUrl || '';
    elements.portfolioUrl.value = professional.portfolioUrl || '';
    
    elements.skills.value = professional.skills?.join(', ') || '';
    elements.coverLetter.value = professional.coverLetter || '';
    
    // Load experience entries - handle both naming conventions for backward compatibility
    const experienceData = professional.experiences || professional.experience || [];
    console.log('Loading profile data:', { 
      hasExperiences: !!(professional.experiences), 
      hasExperience: !!(professional.experience),
      experienceCount: experienceData.length,
      experienceData: experienceData
    });
    
    if (experienceData.length > 0) {
      experienceData.forEach(exp => {
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
    // Scroll to top of the page after successful save
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

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
        state: elements.state.value.trim(),
        postalCode: elements.postalCode.value.trim(),
        country: elements.country.value
      },
      currentLocation: elements.currentLocation.value.trim(),
      willingToRelocate: elements.willingToRelocate.value
    },
    professional: {
      totalExperience: elements.totalExperience.value.trim(),
      noticePeriod: elements.noticePeriod.value,
      currentSalary: elements.currentSalary.value.trim(),
      expectedSalary: elements.expectedSalary.value.trim(),
      linkedinUrl: elements.linkedinUrl.value.trim(),
      githubUrl: elements.githubUrl.value.trim(),
      portfolioUrl: elements.portfolioUrl.value.trim(),
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
  const entryId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const displayNumber = elements.experienceList.children.length + 1;
  const entryDiv = document.createElement('div');
  entryDiv.className = 'experience-entry';
  entryDiv.dataset.entryId = entryId;
  
  entryDiv.innerHTML = `
    <div class="experience-entry__header">
      <h4 class="experience-entry__title">Experience #${displayNumber}</h4>
      <button type="button" class="experience-entry__remove" data-entry-id="${entryId}">
        Remove
      </button>
    </div>
    
    <div class="experience-entry__form">
      <div class="form-group">
        <label class="form-label" for="jobTitle_${entryId}">Job Title *</label>
        <input class="form-input" type="text" id="jobTitle_${entryId}" 
               value="${experienceData.jobTitle || ''}" 
               placeholder="e.g., Software Engineer, Marketing Manager" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="company_${entryId}">Company *</label>
        <input class="form-input" type="text" id="company_${entryId}" 
               value="${experienceData.company || ''}" 
               placeholder="Company name" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="location_${entryId}">Location</label>
        <input class="form-input" type="text" id="location_${entryId}" 
               value="${experienceData.jobLocation || ''}" 
               placeholder="City, State/Country">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="startDate_${entryId}">Start Date</label>
          <input class="form-input" type="month" id="startDate_${entryId}" 
                 value="${experienceData.startDate || ''}">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="endDate_${entryId}">End Date</label>
          <input class="form-input" type="month" id="endDate_${entryId}" 
                 value="${experienceData.endDate || ''}" 
                 ${experienceData.isCurrentJob ? 'disabled' : ''}>
        </div>
      </div>
      
      <div class="form-group">
        <div class="current-job-checkbox">
          <input type="checkbox" id="currentJob_${entryId}" 
                 ${experienceData.isCurrentJob ? 'checked' : ''}
                 data-entry-id="${entryId}">
          <label for="currentJob_${entryId}">Currently working here</label>
        </div>
      </div>
      
      <div class="form-group form-group--full">
        <label class="form-label" for="description_${entryId}">Job Description</label>
        <textarea class="form-input form-input--textarea" id="description_${entryId}" 
                  placeholder="Describe your key responsibilities, achievements, and technologies used">${experienceData.jobDescription || ''}</textarea>
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
 * @param {string} entryId - Entry ID to remove
 */
function removeExperienceEntry(entryId) {
  try {
    const entryDiv = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (!entryDiv) {
      console.warn(`Experience entry with ID ${entryId} not found`);
      return false;
    }
    
    // Add visual feedback
    entryDiv.style.opacity = '0.5';
    entryDiv.style.pointerEvents = 'none';
    
    setTimeout(() => {
      entryDiv.remove();
      updateExperienceNumbers();
      handleAutoSave();
      console.log('Experience entry removed successfully');
    }, 150);
    
    return true;
  } catch (error) {
    console.error('Error removing experience entry:', error);
    showMessage('Error removing experience entry', 'error');
    return false;
  }
}

/**
 * Update experience entry display numbers after removal
 */
function updateExperienceNumbers() {
  const entries = elements.experienceList.children;
  Array.from(entries).forEach((entry, newIndex) => {
    const title = entry.querySelector('.experience-entry__title');
    if (title) {
      title.textContent = `Experience #${newIndex + 1}`;
    }
  });
}

/**
 * Toggle end date field based on current job checkbox
 * @param {string} entryId - Experience entry ID
 */
function toggleEndDate(entryId) {
  const checkbox = document.getElementById(`currentJob_${entryId}`);
  const endDateInput = document.getElementById(`endDate_${entryId}`);
  
  if (checkbox && endDateInput) {
    if (checkbox.checked) {
      endDateInput.disabled = true;
      endDateInput.value = '';
    } else {
      endDateInput.disabled = false;
    }
  }
}

/**
 * Collect all experience data from the form
 * @returns {Array} Array of experience objects
 */
function collectExperienceData() {
  const experiences = [];
  const entries = elements.experienceList.querySelectorAll('.experience-entry');
  
  entries.forEach(entry => {
    const entryId = entry.dataset.entryId;
    const jobElementId = entry.querySelector('.experience-entry__title')?.textContent.match(/Experience #(\d+)/)?.[1] || '0';
    const jobTitle = entry.querySelector(`[id*="jobTitle"]`)?.value.trim();
    const company = entry.querySelector(`[id*="company"]`)?.value.trim();
    
    // Only include entries with at least job title and company
    if (jobTitle && company) {
      const locationInput = entry.querySelector(`[id*="location"]`);
      const startDateInput = entry.querySelector(`[id*="startDate"]`);
      const endDateInput = entry.querySelector(`[id*="endDate"]`);
      const currentJobInput = entry.querySelector(`[id*="currentJob"]`);
      const descriptionInput = entry.querySelector(`[id*="description"]`);
      
      experiences.push({
        jobIndex: jobElementId,
        jobTitle: jobTitle,
        company: company,
        jobLocation: locationInput?.value.trim() || '',
        startDate: startDateInput?.value || '',
        endDate: endDateInput?.value || '',
        isCurrentJob: currentJobInput?.checked || false,
        jobDescription: descriptionInput?.value.trim() || ''
      });
    }
  });
  
  return experiences;
}

// Global functions no longer needed - using event delegation instead

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