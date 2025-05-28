// Content script for element selection
// This file is automatically injected into web pages

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startSelection') {
        startElementSelection();
        sendResponse({ success: true });
    }
});

// Make the convertElementToPDF function available globally
window.convertElementToPDF = convertElementToPDF;

// Listen for custom events from injected script (by selector)
window.addEventListener('convertToPDFBySelector', function(event) {
    if (event.detail && event.detail.selector) {
        const el = document.querySelector(event.detail.selector);
        if (el) {
            showNotification('Generating PDF...', 1500);
            console.log('convertElementToPDF called for selector:', event.detail.selector, el);
            convertElementToPDF(el);
        } else {
            showNotification('Could not find element for PDF', 3000);
            console.error('Selector not found:', event.detail.selector);
        }
    }
});

// Function to start element selection (can be called directly or via message)
function startElementSelection() {
    // Prevent multiple instances
    if (window.elementSelectionActive) {
        return;
    }
    
    window.elementSelectionActive = true;
    let hoveredElement = null;
    
    // Create visual overlay
    const overlay = document.createElement('div');
    overlay.id = 'element-selector-overlay';
    overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        border: 2px solid #ff4444;
        background-color: rgba(255, 68, 68, 0.1);
        z-index: 10000;
        display: none;
        box-sizing: border-box;
    `;
    document.body.appendChild(overlay);
    
    // Create instruction tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10001;
        font-family: Arial, sans-serif;
    `;
    tooltip.textContent = 'Hover over elements and click to save as PDF. Press ESC to cancel.';
    document.body.appendChild(tooltip);
    
    // Mouse move handler
    function handleMouseMove(e) {
        e.preventDefault();
        hoveredElement = e.target;
        
        // Skip if hovering over our own overlay or tooltip
        if (hoveredElement === overlay || hoveredElement === tooltip) {
            return;
        }
        
        const rect = hoveredElement.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.left = rect.left + window.scrollX + 'px';
        overlay.style.top = rect.top + window.scrollY + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }
    
    // Click handler
    function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (hoveredElement && hoveredElement !== overlay && hoveredElement !== tooltip) {
            convertElementToPDF(hoveredElement);
        }
        
        cleanup();
        return false;
    }
    
    // Keyboard handler
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }
    
    // Cleanup function
    function cleanup() {
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        
        if (overlay && overlay.parentNode) {
            overlay.remove();
        }
        if (tooltip && tooltip.parentNode) {
            tooltip.remove();
        }
        
        document.body.style.cursor = '';
        window.elementSelectionActive = false;
    }
    
    // Add event listeners with capture=true to ensure we get them first
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Change cursor
    document.body.style.cursor = 'crosshair';
    
    // Auto cleanup after 60 seconds
    setTimeout(cleanup, 60000);
}

// Function to convert element to PDF
function convertElementToPDF(element) {
    console.log('convertElementToPDF running for element:', element);
    // Show loading notification
    const loadingNotification = showNotification('Creating PDF...', 0);

    // Dynamic script loading function
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Prevent loading the same script multiple times
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load required libraries
    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(() => {
        // Remove loading notification
        if (loadingNotification && loadingNotification.parentNode) {
            loadingNotification.remove();
        }

        // Wait a tick to ensure libraries are available
        setTimeout(() => {
            // Check for html2canvas and jsPDF
            const html2canvas = window.html2canvas;
            // Try to get jsPDF constructor from different possible locations
            let jsPDF = null;
            if (window.jspdf && window.jspdf.jsPDF) {
                jsPDF = window.jspdf.jsPDF;
            } else if (window.jsPDF) {
                jsPDF = window.jsPDF;
            }

            if (!html2canvas || !jsPDF) {
                showNotification('PDF libraries failed to load.', 5000);
                console.error('html2canvas or jsPDF not found on window:', { html2canvas, jsPDF: window.jspdf });
                return;
            }

            html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                removeContainer: true
            }).then(canvas => {
                try {
                    const pdf = new jsPDF();

                    const imgData = canvas.toDataURL('image/png');
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    // Calculate image dimensions to fit page
                    let imgWidth = pageWidth - 20;
                    let imgHeight = (canvas.height * imgWidth) / canvas.width;
                    if (imgHeight > pageHeight - 20) {
                        imgHeight = pageHeight - 20;
                        imgWidth = (canvas.width * imgHeight) / canvas.height;
                    }

                    // Add image to PDF
                    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

                    // Generate filename
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
                    const elementTag = element.tagName.toLowerCase();
                    const filename = `${elementTag}-element-${timestamp}.pdf`;

                    // Save PDF
                    pdf.save(filename);

                    // Save PDF info to storage for the popup list
                    savePDFInfo({
                        filename: filename,
                        elementType: elementTag.toUpperCase(),
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        domain: window.location.hostname
                    });

                    showNotification('PDF saved successfully!', 3000);

                } catch (error) {
                    console.error('Error creating PDF:', error);
                    showNotification('Error creating PDF: ' + error.message, 5000);
                }
            }).catch(error => {
                console.error('Error capturing element:', error);
                showNotification('Error capturing element: ' + error.message, 5000);
                if (loadingNotification && loadingNotification.parentNode) {
                    loadingNotification.remove();
                }
            });
        }, 100);
    }).catch(error => {
        console.error('Error loading libraries:', error);
        showNotification('Error loading required libraries', 5000);
        if (loadingNotification && loadingNotification.parentNode) {
            loadingNotification.remove();
        }
    });
}

// Save PDF information to Chrome storage
function savePDFInfo(pdfData) {
    const key = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const data = {};
    data[key] = pdfData;
    
    chrome.storage.local.set(data, function() {
        if (chrome.runtime.lastError) {
            console.error('Error saving PDF info:', chrome.runtime.lastError);
        } else {
            console.log('PDF info saved successfully');
        }
    });
}

// Notification function
function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background-color: #4CAF50;
        color: white;
        border-radius: 5px;
        z-index: 10002;
        font-size: 14px;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
    
    return notification;
}