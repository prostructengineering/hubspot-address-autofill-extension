// This background script helps manage the extension securely
console.log("Background script loaded");

// Backend endpoint - UPDATE THIS to your Cloudflare Worker URL
const BACKEND_URL = "https://hs-address-autocomplete.your-username.workers.dev";

// API endpoint path
const API_PATH = "/api/maps-key";

// Remove fallback key - API key should only come from secure backend

// Cache for the API key
let apiKeyCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Flag to track if we've logged the backend status warning
let backendWarningLogged = false;

// Function to securely fetch API key from backend
async function fetchApiKey() {
  console.log("Attempting to fetch API key from backend:", BACKEND_URL);

  try {
    const url = `${BACKEND_URL}${API_PATH}`;
    console.log("Fetching from URL:", url);

    // Add a timeout to the fetch to avoid long waits if backend is down
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Response error text:", errorText);

      // Backend error - don't use fallback key anymore
      if (!backendWarningLogged) {
        console.warn(
          "IMPORTANT: Cannot get API key from backend. Please ensure your backend is properly deployed and configured with GOOGLE_MAPS_API_KEY environment variable."
        );
        backendWarningLogged = true;
      }

      throw new Error(`Backend error: ${response.status} ${errorText}`);
    }

    // Log the raw response for debugging
    const rawText = await response.text();
    console.log("Raw response:", rawText);

    // Parse the response text as JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(
        `Invalid JSON response from backend: ${parseError.message}`
      );
    }

    console.log("Parsed response data:", data);

    if (data && data.apiKey) {
      console.log(
        "Successfully received API key from backend (first few chars):",
        data.apiKey.substring(0, 5) + "..."
      );
      apiKeyCache = data.apiKey;
      lastFetchTime = Date.now();
      return data.apiKey;
    } else {
      console.error("No API key in response data:", data);
      throw new Error("Backend did not return a valid API key");
    }
  } catch (error) {
    // Check if it's an AbortError (timeout)
    if (error.name === "AbortError") {
      console.error(
        "Request timeout: Backend server may be down or slow to respond"
      );
    } else {
      console.error("Detailed error while fetching API key:", error);
      console.error("Error stack:", error.stack);
    }

    if (!backendWarningLogged) {
      console.warn(
        "IMPORTANT: Unable to fetch API key from backend. Please ensure your backend is properly deployed and configured."
      );
      backendWarningLogged = true;
    }

    throw error; // Re-throw the error to be handled by caller
  }
}

// Check if cached key is still valid
function isKeyValid() {
  const isValid = apiKeyCache && Date.now() - lastFetchTime < CACHE_DURATION;
  console.log("Is cached API key valid?", isValid);
  return isValid;
}

// Make a request to the Google Places API for autocomplete predictions
async function getPlacePredictions(query, apiKey) {
  console.log("Getting predictions for query:", query);

  if (!apiKey) {
    console.error("No API key provided for predictions");

    // If no API key provided, use cached key or throw error
    if (isKeyValid()) {
      apiKey = apiKeyCache;
    } else {
      return {
        error: "No API key available. Please check backend configuration.",
      };
    }

    if (!apiKey) {
      return { error: "API key is required" };
    }
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&types=address&key=${apiKey}`;

    console.log(
      "Fetching predictions from URL:",
      url.replace(apiKey, "API_KEY_HIDDEN")
    );

    const response = await fetch(url);
    console.log("Predictions response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Predictions response error:", errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received predictions data status:", data.status);

    if (data.status === "OK") {
      console.log(
        "Successfully received predictions:",
        data.predictions.length
      );
      return { predictions: data.predictions };
    } else {
      console.error("Google API error in predictions:", data);
      throw new Error(
        `Google API error: ${data.status}, ${
          data.error_message || "No error message"
        }`
      );
    }
  } catch (error) {
    console.error("Detailed error fetching predictions:", error);
    console.error("Error stack:", error.stack);
    return { error: error.message };
  }
}

// Get place details from Google Places API
async function getPlaceDetails(placeId, apiKey) {
  console.log("Getting place details for placeId:", placeId);

  if (!apiKey && isKeyValid()) {
    console.log("Using cached API key for place details");
    apiKey = apiKeyCache;
  }

  if (!apiKey) {
    console.error("Failed to get API key for place details");
    return {
      error: "No API key available. Please check backend configuration.",
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,address_components&key=${apiKey}`;

    console.log(
      "Fetching place details from URL:",
      url.replace(apiKey, "API_KEY_HIDDEN")
    );

    const response = await fetch(url);
    console.log("Place details response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Place details response error:", errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received place details data status:", data.status);

    if (data.status === "OK" && data.result) {
      console.log("Successfully received place details");
      return { place: data.result };
    } else {
      console.error("Google API error in place details:", data);
      throw new Error(
        `Google API error: ${data.status}, ${
          data.error_message || "No error message"
        }`
      );
    }
  } catch (error) {
    console.error("Detailed error fetching place details:", error);
    console.error("Error stack:", error.stack);
    return { error: error.message };
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message with action:", request.action);

  if (request.action === "getApiKey") {
    // If we have a valid cached key, return it immediately
    if (isKeyValid()) {
      console.log("Returning cached API key");
      sendResponse({ apiKey: apiKeyCache });
      return true;
    }

    // Otherwise fetch a new key
    console.log("Fetching new API key");
    fetchApiKey()
      .then((apiKey) => {
        console.log("API key fetch completed, key available:", !!apiKey);
        sendResponse({ apiKey: apiKey });
      })
      .catch((error) => {
        console.error("Error in getApiKey handler:", error);
        // Return error instead of fallback key
        sendResponse({
          error:
            "Could not get API key from backend. Please check your backend configuration.",
        });
      });

    // Return true to indicate we will respond asynchronously
    return true;
  }

  if (request.action === "getPlacePredictions") {
    const { query, apiKey } = request;
    console.log("Processing getPlacePredictions for query:", query);

    if (!query) {
      console.error("Missing query in getPlacePredictions request");
      sendResponse({ error: "Query is required" });
      return true;
    }

    getPlacePredictions(query, apiKey)
      .then((result) => {
        console.log("getPlacePredictions completed, success:", !result.error);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Error in getPlacePredictions handler:", error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  if (request.action === "getPlaceDetails") {
    const { placeId } = request;
    console.log("Processing getPlaceDetails for placeId:", placeId);

    if (!placeId) {
      console.error("Missing placeId in getPlaceDetails request");
      sendResponse({ error: "Place ID is required" });
      return true;
    }

    getPlaceDetails(placeId, request.apiKey)
      .then((result) => {
        console.log("getPlaceDetails completed, success:", !result.error);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Error in getPlaceDetails handler:", error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  console.log("No handler for action:", request.action);
  return false;
});
