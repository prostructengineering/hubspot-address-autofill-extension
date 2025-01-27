window.onload = function () {
  console.log("Content script loaded");
  const container = document.querySelector('span[data-test-id="address"]');
  const textarea = container?.querySelector(
    'textarea[data-selenium-test="property-input-address"]'
  );

  if (!container) {
    console.warn("Address container not found");
    return;
  }

  if (!textarea) {
    console.warn("Textarea element not found");
    return;
  }

  console.log("Found required elements:", { container, textarea });

  // Hide the textarea's text but keep it functional
  textarea.style.color = "transparent";
  textarea.style.caretColor = "transparent";

  const inputWrapper = document.createElement("div");
  inputWrapper.style.position = "relative";

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.style.cssText = `
    position: absolute;
    background: transparent;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 10;
    color: inherit;
    border: none;
    outline: none;
  `;

  textarea.parentNode.insertBefore(inputWrapper, textarea);
  inputWrapper.appendChild(hiddenInput);
  inputWrapper.appendChild(textarea);

  hiddenInput.addEventListener("focus", () => {
    console.log("Hidden input focused");
    if (!window.google) {
      console.log("Loading Google Maps API");
      fetch(
        "https://hubspot-address-autofill-extension.onrender.com/api/maps-key"
      )
        .then((response) => response.json())
        .then((data) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places&callback=initAutocomplete`;
          script.async = true;
          document.head.appendChild(script);
        })
        .catch((error) => console.error("Error fetching API key:", error));
    } else {
      console.log("Google Maps API already loaded");
      initAutocomplete();
    }
  });

  hiddenInput.addEventListener("input", (e) => {
    textarea.value = e.target.value;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Also handle paste events
  hiddenInput.addEventListener("paste", (e) => {
    setTimeout(() => {
      textarea.value = e.target.value;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }, 0);
  });
};

window.initAutocomplete = function () {
  console.log("Initializing autocomplete");
  const hiddenInput = document.querySelector('input[type="text"]');
  const textarea = document.querySelector(
    'textarea[data-selenium-test="property-input-address"]'
  );

  if (!hiddenInput || !textarea) {
    console.error(
      "Required elements not found for autocomplete initialization"
    );
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(hiddenInput, {
    types: ["address"],
    componentRestrictions: { country: "us" },
  });
  console.log("Autocomplete instance created");

  autocomplete.addListener("place_changed", () => {
    console.log("Place selected");
    const place = autocomplete.getPlace();
    textarea.value = place.formatted_address;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("Updated textarea with address:", place.formatted_address);
  });
};
