# Element to PDF Browser Extension

A simple Chrome extension that allows users to select HTML elements on web pages and save them as PDF files.

## Features

- 🎯 **Element Selection**: Hover over any HTML element and click to select it
- 📄 **PDF Generation**: Converts selected elements to high-quality PDF files
- 🖼️ **Visual Feedback**: Highlights elements as you hover over them
- 📱 **Simple Interface**: Clean popup interface with one-click activation
- ⌨️ **Keyboard Support**: Press ESC to cancel selection mode
- 🔄 **Auto-cleanup**: Selection mode automatically ends after 60 seconds

## Installation

1. **Download the Extension Files**
   - Save all the provided files in a folder (e.g., `element-to-pdf-extension`)
   - Make sure you have: `manifest.json`, `popup.html`, `popup.js`, `content.js`, `content.css`

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing your extension files
   - The extension should now appear in your extensions list

3. **Pin the Extension** (Optional)
   - Click the extensions icon (puzzle piece) in Chrome toolbar
   - Find "Element to PDF" and click the pin icon to keep it visible

## How to Use

1. **Activate Selection Mode**
   - Click the "Element to PDF" extension icon in your browser toolbar
   - Click "Start Selection Mode" in the popup
   - The popup will close and selection mode will activate

2. **Select an Element**
   - Move your mouse over any element on the webpage
   - Elements will be highlighted with a red border as you hover
   - Click on the element you want to save as PDF

3. **PDF Generation**
   - The extension will capture the selected element
   - A PDF file will be automatically downloaded
   - The filename includes the element type and timestamp

4. **Cancel Selection**
   - Press the `ESC` key to exit selection mode
   - Or wait 60 seconds for automatic timeout

## Technical Details

### Dependencies
The extension automatically loads these libraries when needed:
- **html2canvas**: For capturing DOM elements as images
- **jsPDF**: For generating PDF files

### File Structure
```
element-to-pdf-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality
├── content.js         # Main content script
├── content.css        # Styling for selection overlay
└── README.md          # This file
```

### Permissions
- `activeTab`: Access to the current active tab
- `scripting`: Ability to inject scripts into web pages

## Troubleshooting

**Extension doesn't appear after loading:**
- Make sure all files are in the same folder
- Check that `manifest.json` is valid JSON
- Refresh the extensions page and try again

**Selection mode doesn't start:**
- Ensure you're on a regular webpage (not chrome:// pages)
- Try refreshing the page and activating again
- Check browser console for error messages

**PDF generation fails:**
- Some elements with complex CSS or external resources may not render perfectly
- Try selecting a simpler parent element
- Ensure you have a stable internet connection (for loading libraries)

**Elements not highlighting:**
- Make sure no other extensions are interfering
- Try disabling other extensions temporarily
- Refresh the page and try again

## Limitations

- Works only on regular web pages (not on chrome:// or extension pages)
- Some complex CSS effects may not render perfectly in PDF
- Large elements may take longer to process
- Requires internet connection to load PDF generation libraries

## Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Should work with minor modifications
- **Firefox**: Requires manifest conversion to V2

## Privacy & Security

- No data is collected or transmitted
- All processing happens locally in your browser
- PDFs are generated and saved directly to your device
- No external servers are used for processing