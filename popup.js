document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startSelection');
    const status = document.getElementById('status');
    const pdfListContainer = document.getElementById('pdfListContainer');
    const pdfCount = document.getElementById('pdfCount');
    const emptyState = document.getElementById('emptyState');
    const clearAllBtn = document.getElementById('clearAll');
    const stats = document.getElementById('stats');
    
    // Load and display saved PDFs on popup open
    loadSavedPDFs();
    
    startButton.addEventListener('click', async function() {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject the selection script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: startElementSelection
            });
            
            status.textContent = 'Selection mode active - hover and click elements';
            startButton.disabled = true;
            
            // Close popup after a short delay
            setTimeout(() => {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error('Error:', error);
            status.textContent = 'Error starting selection mode';
        }
    });
    
    // Clear all PDFs
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all saved PDF records?')) {
            chrome.storage.local.clear(function() {
                loadSavedPDFs();
            });
        }
    });
    
    // Load saved PDFs from storage
    function loadSavedPDFs() {
        chrome.storage.local.get(null, function(data) {
            const pdfs = [];
            
            // Filter PDF entries
            for (const key in data) {
                if (key.startsWith('pdf_')) {
                    const pdfData = data[key];
                    if (pdfData && pdfData.timestamp) {
                        pdfs.push(pdfData);
                    }
                }
            }
            
            // Sort by timestamp (newest first)
            pdfs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            displayPDFs(pdfs);
        });
    }
    
    // Display PDFs in the list
    function displayPDFs(pdfs) {
        pdfCount.textContent = pdfs.length;
        
        if (pdfs.length === 0) {
            pdfListContainer.innerHTML = '<div class="empty-state" id="emptyState">No PDFs saved yet.<br>Select elements to start building your collection!</div>';
            stats.textContent = '';
            clearAllBtn.style.display = 'none';
            return;
        }
        
        clearAllBtn.style.display = 'inline-block';
        
        let html = '';
        pdfs.forEach(pdf => {
            const date = new Date(pdf.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const domain = pdf.url ? new URL(pdf.url).hostname : 'Unknown';
            
            html += `
                <div class="pdf-item">
                    <div class="pdf-icon">PDF</div>
                    <div class="pdf-info">
                        <div class="pdf-name">${pdf.elementType || 'Element'} - ${pdf.filename || 'Unnamed'}</div>
                        <div class="pdf-details">
                            <span class="pdf-url" title="${pdf.url || 'Unknown URL'}">${domain}</span>
                            <span class="pdf-date">${formattedDate}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        pdfListContainer.innerHTML = html;
        
        // Update stats
        const today = new Date();
        const todayPDFs = pdfs.filter(pdf => {
            const pdfDate = new Date(pdf.timestamp);
            return pdfDate.toDateString() === today.toDateString();
        }).length;
        
        stats.textContent = `${todayPDFs} saved today`;
    }
    
    // Listen for storage changes to update the list in real-time
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local') {
            // Check if any PDF entries were added/removed
            for (const key in changes) {
                if (key.startsWith('pdf_')) {
                    loadSavedPDFs();
                    break;
                }
            }
        }
    });
});

// This function will be injected into the page
function startElementSelection() {
    // Remove any existing selection mode
    if (window.elementSelectionActive) {
        return;
    }
    
    window.elementSelectionActive = true;
    let hoveredElement = null;
    
    // Create overlay for visual feedback
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.border = '2px solid #ff4444';
    overlay.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'none';
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
        console.log('Element clicked:', hoveredElement);
        e.preventDefault();
        e.stopPropagation();

        if (hoveredElement && hoveredElement !== overlay && hoveredElement !== tooltip) {
            // Always use selector event
            const selector = getUniqueSelector(hoveredElement);
            window.dispatchEvent(new CustomEvent('convertToPDFBySelector', { detail: { selector } }));
        }

        // Clean up
        cleanup();
        return false;
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
    
    // ESC key handler
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }
    
    // Add event listeners with capture=true to ensure we get them first
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Change cursor
    document.body.style.cursor = 'crosshair';
    
    // Auto cleanup after 60 seconds
    setTimeout(cleanup, 60000);

    // Helper to get a unique selector for an element
    function getUniqueSelector(el) {
        if (el.id) return `#${el.id}`;
        if (el === document.body) return 'body';
        let path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
            let selector = el.nodeName.toLowerCase();
            if (el.className) {
                selector += '.' + Array.from(el.classList).join('.');
            }
            let sibling = el;
            let nth = 1;
            while (sibling = sibling.previousElementSibling) {
                if (sibling.nodeName === el.nodeName) nth++;
            }
            selector += `:nth-of-type(${nth})`;
            path.unshift(selector);
            el = el.parentElement;
        }
        return path.length ? 'body > ' + path.join(' > ') : 'body';
    }
}