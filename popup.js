document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startSelection');
    const status = document.getElementById('status');
    const pdfListContainer = document.getElementById('pdfListContainer');
    const pdfCount = document.getElementById('pdfCount');
    // const emptyState = document.getElementById('emptyState'); // Removed as it's not directly used
    const clearAllBtn = document.getElementById('clearAll');
    const stats = document.getElementById('stats');
    
    // Load and display saved PDFs on popup open
    loadSavedPDFs();
    
    startButton.addEventListener('click', async function() {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send a message to the content script to initiate selection
            chrome.tabs.sendMessage(tab.id, { action: "initiateSelection" }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError.message);
                    status.textContent = 'Error initiating selection.';
                    startButton.disabled = false; // Re-enable button if error
                } else if (response && response.success) {
                    status.textContent = 'Selection mode active. Click an element on the page.';
                    // Keep startButton disabled as selection is now active in content script
                    // The popup will close via setTimeout as before
                } else {
                    console.error('Failed to initiate selection in content script.');
                    status.textContent = 'Failed to start selection.';
                    startButton.disabled = false; // Re-enable button
                }
            });
            
            // Close popup after a short delay - this remains to give user feedback
            setTimeout(() => {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error('Error:', error);
            status.textContent = 'Error starting selection mode';
            startButton.disabled = false; // Ensure button is re-enabled on unexpected error
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