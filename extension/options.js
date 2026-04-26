// Options page script
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById("disable-injection-toggle");
    const savedIndicator = document.getElementById("saved-indicator");
    
    // Load saved setting
    chrome.storage.local.get(["disableInjection"], function(result) {
        toggle.checked = result.disableInjection || false;
    });
    
    // Save setting on change
    toggle.addEventListener("change", function() {
        chrome.storage.local.set({disableInjection: toggle.checked}, function() {
            console.log("Injection disabled:", toggle.checked);
            
            // Show saved indicator
            savedIndicator.classList.add("visible");
            setTimeout(() => {
                savedIndicator.classList.remove("visible");
            }, 2000);
            
            // Notify background script about the setting change
            chrome.runtime.sendMessage({action: "settingsChanged", disableInjection: toggle.checked});
        });
    });
});
