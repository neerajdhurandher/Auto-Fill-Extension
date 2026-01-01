// Track custom fields
let customFields = [];
let customFieldCounter = 0;

// Track experience cards
let experienceCounter = 0;

// Theme Management
function initializeTheme() {
    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem('jobPortalTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
}

function toggleTheme() {
    const checkbox = document.getElementById('theme-checkbox');
    const newTheme = checkbox.checked ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('jobPortalTheme', newTheme);
}

function updateThemeToggle(theme) {
    const checkbox = document.getElementById('theme-checkbox');
    if (checkbox) {
        checkbox.checked = theme === 'light';
    }
}

// Field toggle functionality
function toggleField(fieldName) {
    console.debug(`toggleField called for: ${fieldName}`);
    const fieldElement = document.getElementById(`field-${fieldName}`);
    const toggleElement = document.getElementById(`toggle-${fieldName}`);
    
    console.debug(`Field element found:`, fieldElement);
    console.debug(`Toggle element found:`, toggleElement);
    console.debug(`Toggle checked:`, toggleElement?.checked);
    
    if (toggleElement && toggleElement.checked) {
        if (fieldElement) {
            fieldElement.classList.add('visible');
            console.debug(`Added visible class to ${fieldName}`);
        } else {
            console.error(`Field element not found for ${fieldName}`);
        }
        
        // Show custom fields section if any custom field is enabled
        if (fieldName.startsWith('custom-')) {
            updateCustomFieldsSection();
        }
    } else {
        if (fieldElement) {
            fieldElement.classList.remove('visible');
            console.debug(`Removed visible class from ${fieldName}`);
        }
        
        // Update custom fields section visibility
        if (fieldName.startsWith('custom-')) {
            updateCustomFieldsSection();
        }
    }
}

// Update custom fields section visibility
function updateCustomFieldsSection() {
    const customSection = document.getElementById('custom-fields-section');
    const anyCustomVisible = customFields.some(field => 
        document.getElementById(`toggle-${field.name}`)?.checked
    );
    
    // Always show the section if there are custom fields, regardless of toggle state
    // This allows users to see and manage their custom fields
    if (customFields.length > 0) {
        customSection.style.display = 'block';
    } else {
        customSection.style.display = 'none';
    }
}

// Show custom field creator
function showCustomFieldCreator() {
    document.getElementById('custom-field-creator').style.display = 'block';
    document.getElementById('custom-field-name').focus();
}

// Hide custom field creator
function hideCustomFieldCreator() {
    document.getElementById('custom-field-creator').style.display = 'none';
    // Clear inputs
    document.getElementById('custom-field-name').value = '';
    document.getElementById('custom-field-label').value = '';
    document.getElementById('custom-field-placeholder').value = '';
    document.getElementById('custom-field-type').value = 'text';
}

// Create custom field
function createCustomField() {
    const name = document.getElementById('custom-field-name').value.trim();
    const label = document.getElementById('custom-field-label').value.trim();
    const type = document.getElementById('custom-field-type').value;
    const placeholder = document.getElementById('custom-field-placeholder').value.trim();

    if (!name || !label) {
        alert('Please enter both field name and label');
        return;
    }

    // Check if field name already exists
    if (customFields.find(field => field.name === name) || 
        document.getElementById(`field-${name}`)) {
        alert('Field name already exists');
        return;
    }

    const customField = {
        name: name,
        label: label,
        type: type,
        placeholder: placeholder,
        id: `custom-${++customFieldCounter}`
    };

    customFields.push(customField);

    // Create toggle in sidebar
    createCustomFieldToggle(customField);

    // Create form field
    createFormField(customField);

    // Automatically enable the new field
    const toggle = document.getElementById(`toggle-${customField.name}`);
    if (toggle) {
        console.log(`Setting toggle for ${customField.name} to checked`);
        toggle.checked = true;
        toggleField(customField.name);
        console.log(`Field ${customField.name} should now be visible`);
    } else {
        console.error(`Toggle not found for field: ${customField.name}`);
    }

    // Hide creator and clear inputs
    hideCustomFieldCreator();
}

// Create toggle button for custom field
function createCustomFieldToggle(field) {
    const togglesContainer = document.getElementById('custom-fields-list');
    
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'field-toggle custom-field-toggle';
    toggleDiv.id = `toggle-container-${field.name}`;
    
    toggleDiv.innerHTML = `
        <label for="toggle-${field.name}">${field.label}</label>
        <div style="display: flex; align-items: center;">
            <div class="toggle-switch">
                <input type="checkbox" id="toggle-${field.name}" onchange="toggleField('${field.name}')">
                <span class="slider"></span>
            </div>
            <button class="delete-field-btn" onclick="deleteCustomField('${field.name}')">×</button>
        </div>
    `;
    
    togglesContainer.appendChild(toggleDiv);
}

// Create form field
function createFormField(field) {
    const formContainer = document.getElementById('custom-form-fields');
    
    if (!formContainer) {
        console.error('Custom form fields container not found!');
        return;
    }
    
    // Create a form row container
    const rowDiv = document.createElement('div');
    rowDiv.className = 'form-row';
    
    // Create the form group
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-group'; // Will be made visible by toggle
    fieldDiv.id = `field-${field.name}`;
    
    let inputHtml = '';
    
    switch (field.type) {
        case 'select':
            inputHtml = `
                <select id="${field.name}" name="${field.name}">
                    <option value="">Select ${field.label}</option>
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                </select>
            `;
            break;
        case 'textarea':
            inputHtml = `
                <textarea id="${field.name}" name="${field.name}" placeholder="${field.placeholder}"></textarea>
            `;
            break;
        default:
            inputHtml = `
                <input type="${field.type}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder}">
            `;
    }
    
    fieldDiv.innerHTML = `
        <label for="${field.name}">${field.label} <span class="field-indicator">(${field.name})</span></label>
        ${inputHtml}
    `;
    
    // Add field to row, then row to container
    rowDiv.appendChild(fieldDiv);
    formContainer.appendChild(rowDiv);
    
    console.log(`Created custom field: ${field.name}`, fieldDiv);
    console.log(`Field element ID: field-${field.name}`);
    console.log(`Form container children:`, formContainer.children.length);
    
    // Update section visibility
    updateCustomFieldsSection();
}

// Delete custom field
function deleteCustomField(fieldName) {
    if (!confirm(`Delete field "${fieldName}"?`)) return;
    
    // Remove from array
    customFields = customFields.filter(field => field.name !== fieldName);
    
    // Remove toggle
    const toggleContainer = document.getElementById(`toggle-container-${fieldName}`);
    if (toggleContainer) {
        toggleContainer.remove();
    }
    
    // Remove form field
    const fieldElement = document.getElementById(`field-${fieldName}`);
    if (fieldElement) {
        fieldElement.remove();
    }
    
    // Update section visibility
    updateCustomFieldsSection();
}

// Form submission handler
function handleSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    const formData = new FormData(event.target);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Collect experience data separately for better organization
    const experiences = [];
    for (let i = 1; i <= experienceCounter; i++) {
        const cardElement = document.getElementById(`experience-card-${i}`);
        if (cardElement) {
            const experience = {
                jobTitle: document.getElementById(`jobTitle_${i}`)?.value || '',
                companyName: document.getElementById(`companyName_${i}`)?.value || '',
                jobLocation: document.getElementById(`jobLocation_${i}`)?.value || '',
                startDate: document.getElementById(`startDate_${i}`)?.value || '',
                endDate: document.getElementById(`endDate_${i}`)?.value || '',
                currentlyWorking: document.getElementById(`currentlyWorking_${i}`)?.checked || false,
                jobDescription: document.getElementById(`jobDescription_${i}`)?.value || ''
            };
            
            // Only add if at least job title and company are filled
            if (experience.jobTitle.trim() || experience.companyName.trim()) {
                experiences.push(experience);
            }
        }
    }
    
    data.experiences = experiences;
    
    // Display collected data
    console.log('Form submitted with data:', data);
    console.log('Experience entries:', experiences);
    alert(`Application submitted successfully! Found ${experiences.length} experience entries. Check the console for detailed form data.`);
}

// Add experience card
function addExperienceCard() {
    experienceCounter++;
    const container = document.getElementById('experience-cards-container');
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'experience-card';
    cardDiv.id = `experience-card-${experienceCounter}`;
    
    cardDiv.innerHTML = `
        <div class="experience-card-header">
            <h5 class="experience-card-title">Experience #${experienceCounter}</h5>
            <button type="button" class="remove-experience-btn" onclick="removeExperienceCard(${experienceCounter})">
                Remove
            </button>
        </div>
        
        <div class="experience-form-row">
            <div class="experience-form-group">
                <label for="jobTitle_${experienceCounter}">Job Title</label>
                <input type="text" id="jobTitle_${experienceCounter}" name="jobTitle_${experienceCounter}" placeholder="e.g., Software Engineer">
            </div>
            <div class="experience-form-group">
                <label for="companyName_${experienceCounter}">Company Name</label>
                <input type="text" id="companyName_${experienceCounter}" name="companyName_${experienceCounter}" placeholder="e.g., Tech Corp Inc.">
            </div>
        </div>
        
        <div class="experience-form-row">
            <div class="experience-form-group">
                <label for="jobLocation_${experienceCounter}">Location</label>
                <input type="text" id="jobLocation_${experienceCounter}" name="jobLocation_${experienceCounter}" placeholder="e.g., San Francisco, CA">
            </div>
        </div>
        
        <div class="experience-form-row">
            <div class="experience-form-group">
                <label for="startDate_${experienceCounter}">Start Date</label>
                <input type="month" id="startDate_${experienceCounter}" name="startDate_${experienceCounter}">
            </div>
            <div class="experience-form-group">
                <label for="endDate_${experienceCounter}">End Date</label>
                <input type="month" id="endDate_${experienceCounter}" name="endDate_${experienceCounter}">
            </div>
        </div>
        
        <div class="experience-checkbox-group">
            <input type="checkbox" id="currentlyWorking_${experienceCounter}" name="currentlyWorking_${experienceCounter}" onchange="toggleEndDate(${experienceCounter})">
            <label for="currentlyWorking_${experienceCounter}">Currently working here</label>
        </div>
        
        <div class="experience-form-row" style="margin-top: 15px;">
            <div class="experience-form-group">
                <label for="jobDescription_${experienceCounter}">Job Description</label>
                <textarea id="jobDescription_${experienceCounter}" name="jobDescription_${experienceCounter}" placeholder="Describe your key responsibilities, achievements, and technologies used..."></textarea>
            </div>
        </div>
    `;
    
    container.appendChild(cardDiv);
    
    console.log(`Added experience card #${experienceCounter}`);
}

// Remove experience card
function removeExperienceCard(cardId) {
    const cardElement = document.getElementById(`experience-card-${cardId}`);
    const cardElementName = cardElement?.childNodes[1].childNodes[1].innerHTML;
    if (cardElement && confirm(`Are you sure you want to remove ${cardElementName ? cardElementName : 'this experience'} ?`)) {
        cardElement.remove();
        console.log(`Removed experience card #${cardId}`);
        
        // Update numbering for remaining cards
        updateExperienceCardNumbering();
    }
}

// Update experience card numbering
function updateExperienceCardNumbering() {
    const container = document.getElementById('experience-cards-container');
    const cards = container.querySelectorAll('.experience-card');
    
    cards.forEach((card, index) => {
        const newNumber = index + 1;
        const titleElement = card.querySelector('.experience-card-title');
        if (titleElement) {
            titleElement.textContent = `Experience #${newNumber}`;
        }
    });
}

// Toggle end date based on currently working checkbox
function toggleEndDate(cardId) {
    const checkbox = document.getElementById(`currentlyWorking_${cardId}`);
    const endDateInput = document.getElementById(`endDate_${cardId}`);
    
    if (checkbox && endDateInput) {
        if (checkbox.checked) {
            endDateInput.disabled = true;
            endDateInput.value = '';
            endDateInput.style.background = '#f5f5f5';
        } else {
            endDateInput.disabled = false;
            endDateInput.style.background = '';
        }
    }
}

// Initialize page
window.addEventListener('load', () => {
    // Initialize theme
    initializeTheme();
    
    // Default to showing basic fields for testing
    const defaultFields = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'linkedin', 'github', 'portfolio', 'totalExperience',  'currentSalary', 'expectedSalary', 'currentLocation'];
    defaultFields.forEach(fieldName => {
        const toggle = document.getElementById(`toggle-${fieldName}`);
        if (toggle) {
            toggle.checked = true;
            toggleField(fieldName);
        }
    });
    
    // Add one default experience card
    addExperienceCard();
});

// Add extension detection indicator
function checkExtensionStatus() {
    const extensionIndicator = document.createElement('div');
    extensionIndicator.id = 'extension-status';
    extensionIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 15px;
        background: #e74c3c;
        color: white;
        border-radius: 5px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    extensionIndicator.textContent = 'Extension: Not Detected';
    document.body.appendChild(extensionIndicator);
    
    // Check for extension periodically
    let detectionAttempts = 0;
    const checkInterval = setInterval(() => {
        detectionAttempts++;
        
        // Look for extension-specific elements or events
        if (window.autoFillExtensionActive || 
            document.querySelector('[data-auto-fill-detected]') ||
            window.extensionVersion ||
            document.querySelector('.auto-fill-preview') ||
            window.detectedFields) {
            extensionIndicator.style.background = '#27ae60';
            extensionIndicator.textContent = 'Extension: Active ✓';
            clearInterval(checkInterval);
        } else if (detectionAttempts > 60) { // Stop checking after 60 attempts (1 minute)
            extensionIndicator.textContent = 'Extension: Not Found (Reload extension and refresh page)';
            extensionIndicator.style.background = '#f39c12';
            clearInterval(checkInterval);
        }
    }, 1000);
    
    // Also listen for custom events from extension
    document.addEventListener('autoFillExtensionReady', () => {
        extensionIndicator.style.background = '#27ae60';
        extensionIndicator.textContent = 'Extension: Ready ✓';
        clearInterval(checkInterval);
    });
    
    document.addEventListener('autoFillFieldsDetected', (event) => {
        extensionIndicator.style.background = '#2ecc71';
        extensionIndicator.textContent = `Extension: ${event.detail.count} fields detected ✓`;
    });
}

// Run extension detection
checkExtensionStatus();
