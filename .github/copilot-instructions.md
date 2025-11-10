# Auto-Fill Chrome Extension - AI Coding Instructions

## Project Overview
This is a Chrome extension that auto-fills job application forms using stored user data. The project uses **Manifest V3** architecture with a privacy-first, local-storage approach.

## Architecture Patterns

### Extension Structure (Planned)
```
├── manifest.json           # Manifest V3 configuration
├── background/service-worker.js  # Background processes
├── content/{detector.js,filler.js}  # Field detection & auto-fill logic
├── popup/{popup.html,popup.js,popup.css}  # Extension popup UI
├── options/               # Settings configuration page
└── utils/{storage.js,encryption.js}  # Shared utilities
```

### Data Flow Pattern
1. **Profile Storage**: User data encrypted locally via Chrome Storage API
2. **Field Detection**: Content scripts analyze DOM for form fields using attribute matching
3. **Mapping Engine**: Fuzzy matching algorithm maps detected fields to stored data
4. **Auto-Fill**: Selective field population with user control

## Key Development Patterns

### Storage Architecture
- Use Chrome Storage API with AES-256 encryption for sensitive data
- Structure: `{profiles: {default: {personal, professional, preferences}}, settings: {security, portals}}`
- No external data transmission - everything stays local

### Field Detection Strategy
```javascript
// Pattern: Multi-layered field identification
1. DOM traversal for input/select/textarea elements
2. Attribute analysis (name, id, class, placeholder)
3. Context analysis (surrounding labels/text)
4. Fuzzy matching with Fuse.js for variations
```

### Content Script Communication
- Background script coordinates between content scripts and popup
- Use Chrome Scripting API for dynamic content script injection
- Message passing for field detection results and fill commands

## Development Workflows

### Setup Process
```bash
npm init -y
npm install --save-dev webpack eslint prettier
# Configure build pipeline for Manifest V3 compliance
```

### Testing Strategy
- Load unpacked extension in Chrome for development
- Test across target portals: LinkedIn, Indeed, Glassdoor
- Use Chrome DevTools for debugging content scripts

### Security Implementation
- Encrypt all personal data using CryptoJS before storage
- Minimal permissions in manifest.json
- Per-domain data isolation
- Session timeout mechanisms

## Portal-Specific Patterns

### Multi-Portal Support
- Generic field detection with portal-specific overrides
- Configuration objects for LinkedIn, Indeed, etc.
- Adaptable selectors for dynamic form structures

### Field Mapping Intelligence
- Priority-based field matching (exact match > fuzzy match > context)
- Support for various input types (text, select, checkbox, radio)
- Handle multi-step forms and dynamic content loading

## Performance Considerations
- Lazy-load content scripts only when forms detected
- Efficient DOM querying with cached selectors
- Memory management for large form pages
- Target: <2 seconds fill time, <50MB memory usage

## Security & Privacy Patterns
- **Local-First**: No cloud storage, no external API calls
- **Encryption**: AES-256 for sensitive personal data
- **Permissions**: Request minimal required permissions
- **Isolation**: Separate storage per domain/portal

## Key Files to Reference
- `Planning.md`: Complete technical specification and roadmap
- `manifest.json`: Extension permissions and structure (when created)
- `utils/storage.js`: Data encryption and Chrome Storage patterns
- `content/detector.js`: Field detection algorithms

## Common Pitfalls to Avoid
- Don't use Manifest V2 patterns (background pages, broad permissions)
- Avoid storing unencrypted personal data
- Don't assume consistent field naming across portals
- Prevent auto-fill on sensitive fields (passwords, SSN)

## Extension-Specific Commands
```bash
# Load extension for testing
chrome://extensions/ -> Developer mode -> Load unpacked

# Build for production
npm run build  # (when build script is configured)

# Package for Chrome Web Store
zip -r extension.zip dist/
```

## Coding Standards & Conventions

### JavaScript Naming Conventions
```javascript
// Variables: camelCase
const userName = "John Doe";
const formFieldElements = document.querySelectorAll('input');
const isAutoFillEnabled = true;

// Functions: camelCase with descriptive verbs
function detectFormFields() { }
function encryptUserData(data) { }
function validateEmailFormat(email) { }
function initializeExtension() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  EXTENSION_SETTINGS: 'extensionSettings'
};

// Classes: PascalCase
class FormFieldDetector { }
class DataEncryption { }
class ProfileManager { }

// Objects and configurations: camelCase
const portalConfigs = {
  linkedin: { selectors: [], priority: 1 },
  indeed: { selectors: [], priority: 2 }
};
```

### File Structure & CSS Organization
```
popup/
├── popup.html
├── popup.css          # Dedicated CSS for popup
└── popup.js

options/
├── options.html
├── options.css        # Dedicated CSS for options page
└── options.js

content/
├── detector.js
├── filler.js
└── content.css        # CSS for content script injections
```

### Theme Colors & Design System
```css
/* Primary Color Palette */
:root {
  --bg-primary: #1b1a1a;        /* Main background */
  --accent-primary: #ffe600;     /* Main accent color */
  --text-primary: #ffffff;       /* Primary text on dark bg */
  --text-secondary: #cccccc;     /* Secondary text */
  --border-color: #333333;       /* Borders and dividers */
  --hover-bg: #2a2929;          /* Hover states */
  --error-color: #ff4444;       /* Error states */
  --success-color: #44ff44;     /* Success states */
}

/* Base styling pattern for all HTML files */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
}

.btn-primary {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
```

### Code Organization Standards

#### HTML Structure Rules
- **No inline CSS**: All styling must be in separate CSS files
- **Semantic HTML**: Use proper HTML5 semantic elements
- **Accessibility**: Include ARIA labels and proper tab indexing
- **Class naming**: Use BEM methodology (Block__Element--Modifier)

```html
<!-- Good: Semantic structure with external CSS -->
<section class="profile-form">
  <header class="profile-form__header">
    <h2 class="profile-form__title">User Profile</h2>
  </header>
  <div class="profile-form__content">
    <input class="profile-form__input profile-form__input--required" 
           type="text" aria-label="Full Name" />
  </div>
</section>

<!-- Bad: Inline styles -->
<div style="background: #ffe600; padding: 10px;">Content</div>
```

#### JavaScript Architecture Standards
```javascript
// Use ES6+ features consistently
const fieldDetector = {
  // Arrow functions for methods
  detectFields: () => {
    return document.querySelectorAll('input, select, textarea');
  },

  // Async/await for asynchronous operations
  saveToStorage: async (data) => {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Storage save failed:', error);
    }
  },

  // Destructuring for clean parameter handling
  processFormData: ({ name, email, phone }) => {
    // Implementation
  }
};

// Error handling pattern
function handleExtensionError(error, context) {
  console.error(`Error in ${context}:`, error);
  // Send to analytics or user notification
}
```

#### Security & Privacy Standards
```javascript
// Data encryption before storage
const secureStorage = {
  async set(key, data) {
    const encrypted = await encryptData(JSON.stringify(data));
    return chrome.storage.local.set({ [key]: encrypted });
  },

  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] ? JSON.parse(await decryptData(result[key])) : null;
  }
};

// Never log sensitive data
console.log('User profile loaded'); // Good
console.log('User email:', userEmail); // Bad - exposes PII
```

#### Performance Standards
```javascript
// Debounce frequent operations
const debouncedDetection = debounce(() => {
  detectFormFields();
}, 300);

// Cache DOM queries
const formElements = document.querySelectorAll('input');
const cachedSelectors = new Map();

// Lazy loading for heavy operations
const heavyOperation = lazy(() => import('./heavy-module.js'));
```

### File Naming Conventions
- **HTML files**: lowercase with hyphens (`popup.html`, `options.html`)
- **CSS files**: match HTML file names (`popup.css`, `options.css`)
- **JavaScript files**: camelCase (`serviceWorker.js`, `fieldDetector.js`)
- **Utility files**: descriptive names (`storage.js`, `encryption.js`, `validation.js`)

### Documentation Standards
```javascript
/**
 * Detects form fields on the current page
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeHidden - Include hidden fields
 * @param {string[]} options.excludeTypes - Field types to exclude
 * @returns {HTMLElement[]} Array of detected form elements
 */
function detectFormFields(options = {}) {
  // Implementation
}

// Inline comments for complex logic
const fieldScore = calculateFieldRelevance(field); // Score: 0-100 based on attributes
```

### Testing Standards
1. **No Test Files**: Don't create any test file or test function during development.
2. **User Validation**: Complete your job and ask user to validate the result.
3. **Error Handling**: Test edge cases like missing profile data, network issues, and malformed forms.
4. **Browser Compatibility**: Test on latest Chrome versions and ensure Manifest V3 compliance.
5. **Security Testing**: Validate no sensitive data logging and proper encryption implementation.
6. **Regression Testing**: After fixes, re-check previously working functionality to prevent regressions.
7. **Console Log Analysis**: Use detailed logging for debugging field detection and form filling processes.

### Git Commit Standards
```
feat: add LinkedIn field detection algorithm
fix: resolve popup CSS overflow issue
docs: update field mapping documentation
style: apply new color scheme to options page
refactor: extract encryption utilities
test: add unit tests for storage functions
```

## Current Status
Follow the roadmap in `Planning.md` for phase-based development approach.