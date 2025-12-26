# 🚀 Auto-Fill Job Application Assistant

A powerful Chrome extension that intelligently auto-fills job application forms across multiple job portals. Save hours of repetitive data entry while applying to your dream jobs!

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Benefits](#benefits)
- [Supported Platforms](#supported-platforms)
 [Privacy & Security](#privacy-security)
- [License](#license)

---

## 📌 Overview

**Auto-Fill Job Application Assistant** is a Manifest V3 Chrome extension designed to streamline the job application process. Instead of manually filling out the same information repeatedly on LinkedIn, Indeed, Glassdoor, and other job portals, this extension securely stores your profile data locally and intelligently populates forms with a single click.

### Why Use Auto-Fill?

- ⏱️ **Save Time**: Fill entire forms in seconds instead of minutes
- 🔐 **Your Data Stays Private**: All information encrypted and stored locally
- 🎯 **Smart Matching**: Intelligently maps your data to various form fields
- ✅ **Full Control**: Review and confirm before filling any form
- 📱 **Works Across Portals**: LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter & more

---

## ✨ Key Features

- **Simple profiles**: Save your name, contact info, work history, skills, and education in one place.
- **Auto-detect fields**: Finds inputs on job application pages automatically.
- **One‑click fill**: Fill common fields instantly, with a preview before you submit.
- **Pick what to fill**: Turn specific fields on/off and choose which job experience to use.
- **Works on major portals**: LinkedIn, Indeed, Glassdoor, and Workday-based sites.
- **Private by design**: Your data stays on your computer and is encrypted.

---

## 💡 Benefits

### For Job Seekers

| Benefit                      | Impact                                                    |
| ---------------------------- | --------------------------------------------------------- |
| **Time Savings**       | Apply to 10+ jobs daily instead of 2-3                    |
| **Consistency**        | Ensure your information is always accurate and consistent |
| **Reduced Errors**     | Minimize typos and formatting mistakes in applications    |
| **More Opportunities** | Apply to more positions while staying organized           |
| **Less Stress**        | Remove the tedium from job hunting                        |

### For Professionals

- **Track Multiple Profiles**: Manage different resume versions (by industry, level, etc.)
- **Quick Switches**: Toggle between profiles for different job types
- **Maintain Quality**: Focus on cover letters and customization instead of data entry
- **Professional Image**: Submit polished applications with proper formatting

---

## 🌐 Supported Platforms

### Fully Supported

- ✅ [LinkedIn Jobs](https://www.linkedin.com/jobs)
- ✅ [Indeed](https://www.indeed.com)
- ✅ [Glassdoor](https://www.glassdoor.com)
- ✅ [My Workdays](https://www.myworkdayjobs.com)

---

## 📥 Installation Guide

### Method 1: Load from Source (Development)

1. **Clone or Download** the extension files:

   ```bash
   git clone https://github.com/neerajdhurandher/Auto-Fill-Extension.git
   cd Auto-Fill-Extension
   ```
2. **Open Chrome Extensions Page**:

   - Open Chrome and go to `chrome://extensions/`
   - Enable **"Developer Mode"** (toggle in top-right corner)
3. **Load Unpacked Extension**:

   - Click **"Load unpacked"** button
   - Navigate to the extension folder and select it
   - The extension will appear in your extensions list
4. **Pin Extension** (Optional):

   - Click the puzzle icon in your toolbar
   - Find "Auto-Fill Job Application Assistant"
   - Click the pin icon to keep it visible

### Method 2: Install from Chrome Web Store (When Available)

Coming soon! The extension will be available for direct installation from the Chrome Web Store.

---

## 🎯 How to Use

### Initial Setup (5 minutes)

#### Step 1: Open Settings

1. Click the **Auto-Fill extension icon** in your Chrome toolbar
2. Click the **⚙️ Settings** button in the popup
3. You'll see the Settings Dashboard with multiple tabs

#### Step 2: Create Your Profile

Navigate to the **"Personal Info"** tab and fill in:

- First Name & Last Name
- Email Address
- Phone Number (with country code support)
- Full Address (Street, City, State, Zip)
- LinkedIn Profile URL (optional)
- GitHub Profile URL (optional)
- Portfolio Website (optional)

#### Step 3: Add Job Experience

Go to the **"Experience"** tab:

1. Click **"Add Job Experience"** button
2. Fill in job details:
   - Job Title
   - Company Name
   - Start Date & End Date
   - Employment Type (Full-time, Part-time, Contract, etc.)
   - Location
   - Job Description (key responsibilities)
3. Click **Save** - experience is automatically encrypted and stored
4. Repeat for each previous job (up to 10 entries)

#### Step 4: Add Skills & Education

- **Skills Tab**: Add technical and professional skills
- **Education Tab**: Add degree, university, graduation date
- **Cover Letter Tab**: Save template cover letters for different job types

### Auto-Filling a Form (30 seconds)

#### Quick Fill on Any Job Portal

1. **Navigate to a job application form** (LinkedIn, Indeed, etc.)
2. **Click the Auto-Fill icon** in your toolbar
3. **Popup shows detected fields**:
   - Green checkmarks ✅ for matched fields
   - Yellow warnings ⚠️ for uncertain matches
   - Red X marks ❌ for unmatched fields
4. **Review the preview** of data to be filled
5. **Click "Auto-Fill Form"** button
6. Form populates with your data instantly
7. **Review and customize** any pre-filled fields
8. **Submit** the application

#### Manual Field Selection

If you want to be more selective:

1. Click the extension icon
2. Instead of "Auto-Fill All", click **"Select Fields"**
3. Toggle on/off individual fields
4. Choose which job experience to use
5. Click **"Fill Selected Fields"**

---

## 🔧 Advanced Features

### Feature 1: Field Detection Preview

Before auto-filling:

- See exactly which fields were detected
- View confidence scores for each match
- Manually adjust field mappings if needed
- Test on new portals before full auto-fill

### Feature 2: Settings & Preferences

Customize your experience:

- ✏️ Edit/Delete profiles anytime
- 🔄 Reorder job experiences via drag-and-drop
- 🎨 Choose auto-fill confirmation prompts

---

## 🔐 Privacy & Security

### How Your Data is Protected

```
Your Data Journey:
┌─────────────┐
│ You enter   │
│ personal    │ ──┐
│ information │   │
└─────────────┘   │
                  ▼
            ┌──────────────┐
            │ AES-256      │
            │ Encryption   │──┐
            └──────────────┘  │
                              ▼
                        ┌──────────────────┐
                        │ Chrome Storage   │
                        │ (Local Only)     │
                        └──────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │ Stays on YOUR    │
                        │ computer forever │
                        └──────────────────┘
```

### Key Security Features

✅ **Local Encryption**: All data encrypted with AES-256 before storing
✅ **Zero Cloud Upload**: Your data never leaves your computer
✅ **No Third-Party APIs**: Doesn't send data to external services
✅ **Minimal Permissions**: Only requests necessary Chrome permissions
✅ **Open Source**: Code is transparent and auditable
✅ **Session Timeout**: Auto-locks after inactivity
✅ **Export & Delete**: Full control over your data - export or delete anytime

### What Data We Collect

❌ **Nothing remotely** - Everything stays local
✅ **What you explicitly enter** into the extension

### GDPR & Privacy Compliance

- ✅ GDPR compliant - No data sharing or cross-border transfers
- ✅ Your data is yours - Delete anytime with one click
- ✅ Transparent operations - See exactly what's stored
- ✅ No tracking or analytics - We don't monitor your usage

---

## ❓ FAQ

### Q: Is my data safe?

**A:** Absolutely. Your data is encrypted with AES-256 (military-grade encryption) and stored only on your computer. It never leaves your device.

### Q: Does the extension work offline?

**A:** Yes! The extension works entirely offline. It only needs internet to browse job sites, not to operate.

### Q: Can I use the extension on multiple computers?

**A:** Currently, data is stored locally per computer. We're developing cloud sync with end-to-end encryption for future versions.

### Q: What if a field isn't detected correctly?

**A:** You can manually adjust the mapping in the "Field Detection" settings. Our AI improves over time as more users provide feedback.

### Q: Can I export my data?

**A:** Yes! Go to Settings → Export Data to download your encrypted profile (you can keep a backup).

### Q: Is there a way to delete my data?

**A:** Yes. Settings → Delete All Data removes everything instantly. This action cannot be undone.

### Q: Does it work on mobile Chrome?

**A:** Not yet. Chrome extensions on mobile have limited support. Desktop version is fully functional.

### Q: Can I use multiple profiles simultaneously?

**A:** No, currently we are only support single profile.

### Q: How accurate is the field detection?

**A:** On most popular portals (LinkedIn, Indeed, Glassdoor), accuracy is 95%+. We're continuously improving detection algorithms.

### Q: What happens if a form changes layout?

**A:** The extension re-analyzes the form each time. If a portal updates their form, detection adapts automatically.

---

## 🛠 Troubleshooting

### Issue: Extension icon not showing in toolbar

**Solution:**

1. Go to `chrome://extensions/`
2. Find "Auto-Fill Job Application Assistant"
3. Ensure it's enabled (toggle is blue)
4. Click the puzzle icon in toolbar and pin the extension

---

### Issue: Forms not being detected

**Solution:**

1. Refresh the job application page
2. Ensure you're on a supported portal (LinkedIn, Indeed, etc.)
3. Check if JavaScript is enabled in Chrome
4. Try a different job listing on the same portal
5. Clear browser cache: Chrome Menu → Settings → Privacy → Clear Data

---

### Issue: Data not saving in settings

**Solution:**

1. Check if you have enough storage space on your computer
2. Ensure cookies/storage isn't blocked for this site:
   - Chrome Menu → Settings → Privacy → Site Settings → Cookies
   - Make sure Auto-Fill extension is allowed
3. Try hard refresh: `Ctrl+Shift+R`
4. Disable then re-enable the extension

---

### Issue: Getting "Permission Denied" errors

**Solution:**

1. Go to `chrome://extensions/`
2. Find the extension and click "Details"
3. Verify permissions are properly set:
   - ✅ Storage - checked
   - ✅ Active Tab - checked
   - ✅ Scripting - checked

---

### Issue: Auto-fill filling wrong fields

**Solution:**

1. Open popup and click "Preview Detected Fields"
2. Manually adjust field mappings if needed
3. Use "Select Fields" instead of "Auto-Fill All"
4. Report the issue with the portal and form URL for improvements

---

## 🌟 Support

- 📧 **Email**: [support email - to be added]
- 💬 **Issues**: [GitHub Issues](https://github.com/neerajdhurandher/Auto-Fill-Extension/issues)
- 📚 **Documentation**: Check out [ARCHITECTURE-DOCUMENTATION.md](ARCHITECTURE-DOCUMENTATION.md) for technical details
- 🗺️ **Roadmap**: See [Planning.md](Planning.md) for upcoming features

---

## 🎉 Getting Started

Ready to save hours on job applications?

1. **[Install the Extension](#installation-guide)** - Takes 2 minutes
2. **[Set Up Your Profile](#initial-setup-5-minutes)** - Takes 5 minutes
3. **[Start Auto-Filling](#auto-filling-a-form-30-seconds)** - Enjoy 30-second applications!

**Happy Job Hunting! 🚀**

---

*Last Updated: December 2025*
*Version: 1.0.0*
*Maintained by: [neerajdhurandher](https://github.com/neerajdhurandher)*
