document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup initialized");

  const addressInput = document.getElementById("addressInput");
  const resultsContainer = document.getElementById("resultsContainer");
  const selectedAddressContainer = document.getElementById(
    "selectedAddressContainer"
  );
  const selectedAddressEl = document.getElementById("selectedAddress");
  const copyFullBtn = document.getElementById("copyFullBtn");
  const clearBtn = document.getElementById("clearBtn");
  const successMessage = document.getElementById("successMessage");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const statusContainer =
    document.getElementById("statusContainer") || createStatusContainer();

  let selectedPlace = null;
  let apiKeyAvailable = false;

  // Backend endpoint
  const BACKEND_URL = "https://hs-address-autocomplete.abhijay-e51.workers.dev";

  // Create status container if it doesn't exist
  function createStatusContainer() {
    const container = document.createElement("div");
    container.id = "statusContainer";
    container.style.fontSize = "11px";
    container.style.padding = "5px";
    container.style.marginTop = "10px";
    container.style.color = "#ff7a59";
    container.style.backgroundColor = "#fff8f6";
    container.style.borderRadius = "4px";
    container.style.display = "none";
    document.querySelector(".container").appendChild(container);
    return container;
  }

  // Display status message about backend connectivity
  function showStatusMessage(message, isWarning = true) {
    if (!statusContainer) return;

    statusContainer.textContent = message;
    statusContainer.style.display = "block";
    statusContainer.style.color = isWarning ? "#ff7a59" : "#00bda5";
    statusContainer.style.backgroundColor = isWarning ? "#fff8f6" : "#f0fffc";
  }

  // Hide status message
  function hideStatusMessage() {
    if (statusContainer) {
      statusContainer.style.display = "none";
    }
  }

  // Display an error message to the user
  function showError(message) {
    addressInput.value = "";
    addressInput.placeholder = message;
    addressInput.disabled = true;
    loadingIndicator.classList.add("hidden");
    console.error("Error shown to user:", message);
  }

  // Handle backend unavailability
  function handleBackendUnavailable(errorMessage) {
    console.error("Backend unavailable:", errorMessage);
    apiKeyAvailable = false;
    showStatusMessage(
      "⚠️ Cannot connect to backend. Please contact administrator to fix the backend service."
    );
    showError("Backend unavailable. Try again later.");
  }

  // Create and show login button
  function showLoginButton() {
    // Remove existing login button if any
    const existingBtn = document.getElementById("loginButton");
    if (existingBtn) {
      existingBtn.remove();
    }

    const loginBtn = document.createElement("button");
    loginBtn.id = "loginButton";
    loginBtn.textContent = "Login with Google";
    loginBtn.style.backgroundColor = "#4285f4";
    loginBtn.style.color = "white";
    loginBtn.style.border = "none";
    loginBtn.style.borderRadius = "4px";
    loginBtn.style.padding = "10px 16px";
    loginBtn.style.fontSize = "14px";
    loginBtn.style.cursor = "pointer";
    loginBtn.style.width = "100%";
    loginBtn.style.marginTop = "15px";
    loginBtn.style.fontWeight = "500";
    loginBtn.style.display = "flex";
    loginBtn.style.alignItems = "center";
    loginBtn.style.justifyContent = "center";

    // Add Google icon
    const icon = document.createElement("img");
    icon.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='24px' height='24px'%3E%3Cpath fill='%23FFC107' d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3Cpath fill='%23FF3D00' d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'/%3E%3Cpath fill='%234CAF50' d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'/%3E%3Cpath fill='%231976D2' d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3C/svg%3E";
    icon.style.marginRight = "10px";
    icon.style.width = "18px";
    icon.style.height = "18px";

    loginBtn.prepend(icon);

    loginBtn.addEventListener("mouseover", () => {
      loginBtn.style.backgroundColor = "#357ABD";
    });

    loginBtn.addEventListener("mouseout", () => {
      loginBtn.style.backgroundColor = "#4285f4";
    });

    loginBtn.addEventListener("click", () => {
      loginBtn.disabled = true;
      loginBtn.style.opacity = "0.7";
      loginBtn.textContent = "Authenticating...";

      chrome.runtime.sendMessage({ action: "authenticateUser" }, () => {
        // After sending auth request, check status after a short delay
        setTimeout(() => {
          checkAuthStatus();
        }, 1000);
      });
    });

    document.querySelector(".container").appendChild(loginBtn);
  }

  // Check auth status and handle UI accordingly
  function checkAuthStatus() {
    console.log("[Popup] Checking authorization status");
    loadingIndicator.classList.remove("hidden");

    chrome.runtime.sendMessage({ action: "checkAuthorization" }, (response) => {
      loadingIndicator.classList.add("hidden");

      if (chrome.runtime.lastError) {
        console.error(
          "[Popup] Error checking authorization:",
          chrome.runtime.lastError
        );
        showStatusMessage(
          "⚠️ Error checking authorization status. Please reload the extension."
        );
        showLoginButton();
        return;
      }

      console.log("[Popup] Authorization response:", response);

      // Check if response is an object with isAuthorized property
      if (
        response &&
        typeof response === "object" &&
        response.isAuthorized === true
      ) {
        console.log("[Popup] User is authorized");
        hideStatusMessage();
        fetchApiKey();
      } else {
        console.log("[Popup] User is not authorized");
        showStatusMessage(
          "⚠️ You are not authorized to use this extension. Access is restricted to @prostructengineering.com domain users."
        );
        showError("Unauthorized access. Please contact your administrator.");
        showLoginButton();
      }
    });
  }

  // Start by checking auth status
  checkAuthStatus();

  // Fetch API key directly from the endpoint
  function fetchApiKey() {
    console.log("Fetching API key from backend endpoint");
    loadingIndicator.classList.remove("hidden");

    fetch(`${BACKEND_URL}/api/maps-key`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        loadingIndicator.classList.add("hidden");
        console.log("Successfully received API key from endpoint");

        if (data && data.apiKey) {
          apiKeyAvailable = true;
          hideStatusMessage();
          initializeAddressAutocomplete(data.apiKey);
        } else {
          console.error("No API key in response data");
          handleBackendUnavailable("No API key received");
        }
      })
      .catch((error) => {
        console.error("Error fetching API key:", error);
        loadingIndicator.classList.add("hidden");
        handleBackendUnavailable(error.message);
      });
  }

  // Use fetch to make requests to the Google Places API through background script
  async function initializeAddressAutocomplete(apiKey) {
    console.log("Initializing address autocomplete with API key");

    if (!apiKey) {
      console.error("No API key provided to initializeAddressAutocomplete");
      handleBackendUnavailable("No API key available");
      return;
    }

    addressInput.disabled = false;
    addressInput.placeholder = "Start typing an address...";
    addressInput.focus();

    // Set up input handler with debounce
    let debounceTimer;
    addressInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);

      const query = addressInput.value.trim();
      console.log(
        "Input changed:",
        query.length < 3 ? query : query.substring(0, 3) + "..."
      );

      if (query.length < 3) {
        resultsContainer.classList.add("hidden");
        return;
      }

      debounceTimer = setTimeout(() => {
        console.log("Debounce triggered for query");
        loadingIndicator.classList.remove("hidden");
        resultsContainer.classList.add("hidden");

        // Make a request through our background script
        console.log("Sending getPlacePredictions message to background");
        try {
          chrome.runtime.sendMessage(
            {
              action: "getPlacePredictions",
              query: query,
              apiKey: apiKey,
            },
            (response) => {
              loadingIndicator.classList.add("hidden");
              console.log(
                "Received predictions response:",
                response ? !response.error : "no response"
              );

              if (chrome.runtime.lastError) {
                console.error(
                  "Chrome runtime error:",
                  chrome.runtime.lastError
                );
                resultsContainer.innerHTML =
                  '<div class="no-results">Extension error. Please try reloading.</div>';
                resultsContainer.classList.remove("hidden");
                return;
              }

              if (!response) {
                console.error("No response received from background");
                resultsContainer.innerHTML =
                  '<div class="no-results">No response from server. Please try again.</div>';
                resultsContainer.classList.remove("hidden");
                return;
              }

              if (response.error) {
                console.error("Error in predictions response:", response.error);
                resultsContainer.innerHTML = `<div class="no-results">Error: ${response.error}</div>`;
                resultsContainer.classList.remove("hidden");
                return;
              }

              displayResults(response.predictions || []);
            }
          );
        } catch (error) {
          console.error("Error sending message:", error);
          loadingIndicator.classList.add("hidden");
          resultsContainer.innerHTML =
            '<div class="no-results">Internal extension error. Please try again.</div>';
          resultsContainer.classList.remove("hidden");
        }
      }, 300);
    });
  }

  // Display autocomplete results
  function displayResults(predictions) {
    console.log("Displaying", predictions.length, "predictions");
    resultsContainer.innerHTML = "";

    if (predictions.length === 0) {
      resultsContainer.innerHTML =
        '<div class="no-results">No addresses found</div>';
      resultsContainer.classList.remove("hidden");
      return;
    }

    predictions.forEach((prediction) => {
      const resultItem = document.createElement("div");
      resultItem.classList.add("result-item");
      resultItem.textContent = prediction.description;
      resultItem.dataset.placeId = prediction.place_id;

      resultItem.addEventListener("click", () => {
        selectAddress(prediction);
      });

      resultsContainer.appendChild(resultItem);
    });

    resultsContainer.classList.remove("hidden");
  }

  // Handle address selection
  function selectAddress(prediction) {
    console.log("Address selected:", prediction.description);
    addressInput.value = prediction.description;
    resultsContainer.classList.add("hidden");
    loadingIndicator.classList.remove("hidden");

    // Store API key reference for use in other functions
    let currentApiKey = null;

    // Make sure we have the current API key
    if (!apiKeyAvailable) {
      console.error("No API key available for place details");
      loadingIndicator.classList.add("hidden");
      showStatusMessage(
        "⚠️ Cannot fetch address details. API key unavailable.",
        true
      );
      return;
    }

    // Get the API key fresh from the backend
    fetch(`${BACKEND_URL}/api/maps-key`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data || !data.apiKey) {
          throw new Error("No API key in response");
        }

        currentApiKey = data.apiKey;

        // Get detailed place information through background script
        console.log("Requesting place details for:", prediction.place_id);
        return new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage(
              {
                action: "getPlaceDetails",
                placeId: prediction.place_id,
                apiKey: currentApiKey,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Chrome runtime error:",
                    chrome.runtime.lastError
                  );
                  reject(chrome.runtime.lastError);
                  return;
                }

                if (!response) {
                  console.error("No place details response received");
                  reject(new Error("No response received"));
                  return;
                }

                if (response.error) {
                  console.error(
                    "Error fetching place details:",
                    response.error
                  );
                  reject(new Error(response.error));
                  return;
                }

                if (response.place) {
                  console.log(
                    "Place details received:",
                    response.place.formatted_address
                  );
                  resolve(response.place);
                } else {
                  console.error("No place data in response", response);
                  reject(new Error("No place data in response"));
                }
              }
            );
          } catch (error) {
            console.error("Error sending message for place details:", error);
            reject(error);
          }
        });
      })
      .then((place) => {
        selectedPlace = place;
        displaySelectedAddress(place);
      })
      .catch((error) => {
        console.error("Error in place details process:", error);
        showStatusMessage(
          `⚠️ Error getting address details: ${error.message}`,
          true
        );
      })
      .finally(() => {
        loadingIndicator.classList.add("hidden");
      });
  }

  // Display the selected address
  function displaySelectedAddress(place) {
    console.log("Displaying selected address");
    selectedAddressEl.textContent = place.formatted_address;
    selectedAddressContainer.classList.remove("hidden");

    // Enable copy buttons
    copyFullBtn.classList.remove("btn-disabled");
    copyFullBtn.disabled = false;
  }

  // Handle copy full address button
  copyFullBtn.addEventListener("click", () => {
    if (!selectedPlace) {
      console.error("No place selected when copy button clicked");
      return;
    }

    console.log(
      "Copying address to clipboard:",
      selectedPlace.formatted_address
    );

    navigator.clipboard
      .writeText(selectedPlace.formatted_address)
      .then(() => {
        console.log("Address copied successfully");
        showSuccessMessage("Address copied to clipboard!");
      })
      .catch((err) => {
        console.error("Error copying text:", err);
        showSuccessMessage("Failed to copy. Try again.", false);
      });
  });

  // Handle clear button
  clearBtn.addEventListener("click", () => {
    console.log("Clear button clicked");
    addressInput.value = "";
    selectedPlace = null;
    selectedAddressContainer.classList.add("hidden");
    resultsContainer.classList.add("hidden");
    successMessage.textContent = "";
    addressInput.focus();
  });

  // Display success message
  function showSuccessMessage(message, isSuccess = true) {
    console.log("Showing message:", message, "success:", isSuccess);
    successMessage.textContent = message;
    successMessage.style.color = isSuccess ? "#00bda5" : "#ff7a59";

    // Clear message after 3 seconds
    setTimeout(() => {
      successMessage.textContent = "";
    }, 3000);
  }
});
