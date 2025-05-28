// Content script for element selection
// This file is automatically injected into web pages

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'initiateSelection') {
        try {
            startElementSelection();
            sendResponse({ success: true });
        } catch (error) {
            console.error("Error starting selection:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Indicates that the response is sent asynchronously
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
    // console.log('convertElementToPDF running for element:', element); // Removed as per review
    
    // Explicitly check for library availability
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
        showNotification('Error: PDF generation library missing. Please try reloading the page or reinstalling the extension.', 5000);
        console.error('PDF Generation Libraries not found:', {
            html2canvas: typeof window.html2canvas,
            jspdf: typeof window.jspdf,
            jsPDF_constructor: typeof window.jspdf !== 'undefined' ? typeof window.jspdf.jsPDF : 'undefined'
        });
        return;
    }

    const html2canvas = window.html2canvas;
    const jsPDF = window.jspdf.jsPDF;

    // Show loading notification
    const loadingNotification = showNotification('Creating PDF...', 0);

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
                    console.error('Error generating PDF document:', error);
                    showNotification('Error generating PDF document: ' + error.message, 5000);
                }
            }).catch(error => {
                console.error('Error capturing page element with html2canvas:', error);
                showNotification('Error capturing page element: ' + error.message, 5000);
            }).finally(() => {
                // Ensure loading notification is removed in all cases
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
            // console.log('PDF info saved successfully'); // Removed as per review
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