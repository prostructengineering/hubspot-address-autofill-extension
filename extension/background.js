// HubSpot Address Autofill Extension - Background Worker
console.log("Background script loaded");

// Backend endpoints
const BACKEND_URL = "https://hs-address-autocomplete.abhijay-e51.workers.dev";
const AUTH_ENDPOINT = "/auth/callback";
const API_PATH = "/api/maps-key";

// Google OAuth client ID (replace with your actual client ID from Google Cloud Console)
const CLIENT_ID =
  "705314456943-n50iekkla81tnuu4ovumklk6ts5e9hek.apps.googleusercontent.com";

// Cache for the API key
let apiKeyCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Cache for auth status
let isAuthorized = false;
let authCheckedTime = 0;
const AUTH_CACHE_DURATION = 86400000; // 24 hours in milliseconds

// Flag to track if we've logged warnings
let backendWarningLogged = false;

// Run authentication on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed. Starting authentication...");
  authenticateUser();
});

// Check authentication status when extension starts
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started. Checking authentication...");
  // If auth cache has expired, recheck
  if (Date.now() - authCheckedTime > AUTH_CACHE_DURATION) {
    authenticateUser();
  }
});

// Generate a random nonce for security
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) =>
    ("0" + (byte & 0xff).toString(16)).slice(-2)
  ).join("");
}

// Main function to authenticate the user
async function authenticateUser() {
  console.log("[Auth] Starting authentication process...");

  try {
    // Get the redirect URL for authentication
    const redirectURL = chrome.identity.getRedirectURL("auth");
    console.log("[Auth] Redirect URL:", redirectURL);

    // Generate a nonce for security
    const nonce = generateNonce();
    console.log("[Auth] Generated nonce:", nonce);

    // Construct the auth URL
    const authURL = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authURL.searchParams.append("client_id", CLIENT_ID);
    authURL.searchParams.append("response_type", "id_token");
    authURL.searchParams.append("redirect_uri", redirectURL);
    authURL.searchParams.append("scope", "openid email");
    authURL.searchParams.append("nonce", nonce);

    console.log("[Auth] Launching web auth flow...");

    // Launch the authentication flow
    chrome.identity.launchWebAuthFlow(
      {
        url: authURL.toString(),
        interactive: true,
      },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("[Auth] Auth flow error:", chrome.runtime.lastError);
          return;
        }

        if (!responseUrl) {
          console.error("[Auth] No response URL received from auth flow");
          return;
        }

        console.log("[Auth] Received auth response URL");

        try {
          // Extract the ID token from the URL
          const hashParams = new URLSearchParams(
            new URL(responseUrl).hash.substring(1)
          );
          const idToken = hashParams.get("id_token");

          if (!idToken) {
            console.error("[Auth] No ID token found in response URL");
            return;
          }

          console.log("[Auth] Extracted ID token, verifying with backend...");

          // Send the ID token to our backend for verification
          const verifyResponse = await fetch(
            `${BACKEND_URL}${AUTH_ENDPOINT}?id_token=${idToken}`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              mode: "cors",
            }
          );

          if (!verifyResponse.ok) {
            console.error(
              "[Auth] Backend verification failed:",
              verifyResponse.status
            );
            setAuthorization(false);
            return;
          }

          // Parse the response
          const authResult = await verifyResponse.json();
          console.log("[Auth] Authorization result:", authResult);

          // Set the authorization status
          setAuthorization(authResult.authorized === true);
        } catch (error) {
          console.error("[Auth] Error processing auth response:", error);
          setAuthorization(false);
        }
      }
    );
  } catch (error) {
    console.error("[Auth] Authentication process failed:", error);
    setAuthorization(false);
  }
}

// Function to set the authorization status
function setAuthorization(authorized) {
  console.log("Setting authorization status:", authorized);
  isAuthorized = authorized;
  authCheckedTime = Date.now();

  // Store the auth status
  chrome.storage.local.set({
    isAuthorized: authorized,
    authCheckedTime: authCheckedTime,
  });

  // Disable the extension if not authorized
  if (!authorized) {
    console.warn(
      "User is not authorized. Extension features will be disabled."
    );
    // You may want to update the UI or disable certain features
  }
}

// Function to check if the user is authorized
async function checkAuthorization() {
  console.log("[Auth] Checking authorization status");

  // If we've recently checked, use cached result
  if (Date.now() - authCheckedTime < AUTH_CACHE_DURATION) {
    console.log("[Auth] Using cached authorization status:", isAuthorized);
    return { isAuthorized };
  }

  // Otherwise get from storage
  return new Promise((resolve) => {
    chrome.storage.local.get(["isAuthorized", "authCheckedTime"], (result) => {
      console.log("[Auth] Retrieved from storage:", result);

      if (result.isAuthorized !== undefined && result.authCheckedTime) {
        isAuthorized = result.isAuthorized;
        authCheckedTime = result.authCheckedTime;

        // If the cache is still valid
        if (Date.now() - authCheckedTime < AUTH_CACHE_DURATION) {
          console.log(
            "[Auth] Using stored authorization status:",
            isAuthorized
          );
          resolve({ isAuthorized });
          return;
        }
      }

      // If no valid cache, trigger a new auth check
      console.log("[Auth] No valid cache, triggering new auth check");
      authenticateUser();
      resolve({ isAuthorized: false }); // Return false until auth completes
    });
  });
}

// Function to securely fetch API key from backend
async function fetchApiKey() {
  console.log("Attempting to fetch API key from backend");

  // Check if user is authorized first
  const authorized = await checkAuthorization();
  if (!authorized) {
    console.error("User is not authorized to access the API key");
    return null;
  }

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

      if (!backendWarningLogged) {
        console.warn(
          "IMPORTANT: Cannot get API key from backend. Please ensure your backend is properly deployed and configured."
        );
        backendWarningLogged = true;
      }

      throw new Error(`Backend error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
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

// Function to get place predictions
async function getPlacePredictions(query, apiKey) {
  console.log("[API] Getting place predictions for query:", query);

  try {
    console.log("[API] Sending request to backend endpoint");
    const response = await fetch(
      `${BACKEND_URL}/api/place/autocomplete?input=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[API] Backend request failed:",
        response.status,
        errorText
      );
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("[API] Received response from backend");

    if (data.status === "OK") {
      console.log(
        "[API] Successfully received predictions:",
        data.predictions.length
      );
      return { predictions: data.predictions };
    } else {
      console.error("[API] Backend returned error status:", data.status);
      throw new Error(data.error_message || "Failed to get predictions");
    }
  } catch (error) {
    console.error("[API] Error fetching predictions:", error);
    throw error;
  }
}

// Function to get place details
async function getPlaceDetails(placeId, apiKey) {
  console.log("[API] Getting place details for ID:", placeId);

  try {
    console.log("[API] Sending request to backend endpoint");
    const response = await fetch(
      `${BACKEND_URL}/api/place/details?place_id=${placeId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[API] Backend request failed:",
        response.status,
        errorText
      );
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("[API] Received response from backend");

    if (data.status === "OK" && data.result) {
      console.log("[API] Successfully received place details");
      return { place: data.result };
    } else {
      console.error("[API] Backend returned error status:", data.status);
      throw new Error(data.error_message || "Failed to get place details");
    }
  } catch (error) {
    console.error("[API] Error fetching place details:", error);
    throw error;
  }
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Message] Received message:", request.action);

  if (request.action === "authenticateUser") {
    authenticateUser();
    sendResponse({ status: "Authentication started" });
  } else if (request.action === "checkAuthorization") {
    checkAuthorization().then(sendResponse);
    return true; // Will respond asynchronously
  } else if (request.action === "getPlacePredictions") {
    console.log(
      "[Message] Processing predictions request for query:",
      request.query
    );
    getPlacePredictions(request.query)
      .then((data) => {
        console.log("[Message] Sending predictions response");
        sendResponse(data);
      })
      .catch((error) => {
        console.error("[Message] Error in predictions request:", error);
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  } else if (request.action === "getPlaceDetails") {
    console.log(
      "[Message] Processing place details request for ID:",
      request.placeId
    );
    getPlaceDetails(request.placeId)
      .then((data) => {
        console.log("[Message] Sending place details response");
        sendResponse(data);
      })
      .catch((error) => {
        console.error("[Message] Error in place details request:", error);
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  }
});
