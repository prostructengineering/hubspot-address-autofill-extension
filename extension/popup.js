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

  // Backend endpoint - UPDATE THIS to your Cloudflare Worker URL
  const BACKEND_URL =
    "https://hs-address-autocomplete.your-username.workers.dev";

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

  // Securely get API key through background script
  console.log("Requesting API key from background script");
  loadingIndicator.classList.remove("hidden");

  try {
    chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
      loadingIndicator.classList.add("hidden");

      console.log(
        "Received response from background script for API key:",
        response ? !!response.apiKey : "no response"
      );

      if (chrome.runtime.lastError) {
        console.error("Chrome runtime error:", chrome.runtime.lastError);
        handleBackendUnavailable("Chrome runtime error");
        return;
      }

      if (response && response.apiKey) {
        console.log("Successfully received API key from background");
        apiKeyAvailable = true;
        hideStatusMessage();
        initializeAddressAutocomplete(response.apiKey);
      } else if (response && response.error) {
        console.error("Error from background script:", response.error);
        handleBackendUnavailable(response.error);
      } else {
        console.log("No API key or error in response");
        handleBackendUnavailable("No API key received");
      }
    });
  } catch (error) {
    console.error("Error sending message to background:", error);
    loadingIndicator.classList.add("hidden");
    handleBackendUnavailable(error.message);
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

    // Get detailed place information through background script
    console.log("Requesting place details for:", prediction.place_id);
    try {
      chrome.runtime.sendMessage(
        {
          action: "getPlaceDetails",
          placeId: prediction.place_id,
        },
        (response) => {
          loadingIndicator.classList.add("hidden");
          console.log(
            "Received place details response:",
            response ? !response.error : "no response"
          );

          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            return;
          }

          if (!response) {
            console.error("No place details response received");
            return;
          }

          if (response.error) {
            console.error("Error fetching place details:", response.error);
            return;
          }

          if (response.place) {
            console.log(
              "Place details received:",
              response.place.formatted_address
            );
            selectedPlace = response.place;
            displaySelectedAddress(response.place);
          } else {
            console.error("No place data in response", response);
          }
        }
      );
    } catch (error) {
      console.error("Error sending message for place details:", error);
      loadingIndicator.classList.add("hidden");
    }
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
