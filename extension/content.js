// This content script can be expanded later to add direct HubSpot integration features
// For now, it's kept minimal as the primary functionality is in the popup

console.log("HubSpot Address Autocomplete extension loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillAddress") {
    // This could be used in the future to auto-fill HubSpot address fields
    // when the user selects an address from the popup
    console.log("Received address to fill:", message.address);
    sendResponse({ success: true });
  }
});
