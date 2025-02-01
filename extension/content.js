window.onload = function () {
  console.log("Content script loaded");

  // Find all address input fields
  const addressFields = findAllAddressFields();

  // Set up autocomplete for each field independently
  addressFields.forEach(setupAddressField);
};

function findAllAddressFields() {
  const fields = [];

  // Define all possible selector patterns
  const selectorPatterns = [
    {
      container: 'span[data-test-id="address"]',
      textarea: 'textarea[data-selenium-test="property-input-address"]',
    },
    {
      container: ".private-expandable-text__container",
      textarea:
        'textarea[data-selenium-test="property-input-street_address_2"]',
    },
    {
      container: ".private-expandable-text__container",
      textarea:
        'textarea[data-selenium-test="property-input-street_address_3"]',
    },
  ];

  // Find all matching fields
  selectorPatterns.forEach((pattern) => {
    const containers = document.querySelectorAll(pattern.container);
    containers.forEach((container) => {
      const textarea = container.querySelector(pattern.textarea);
      if (textarea) {
        fields.push({ container, textarea });
      }
    });
  });

  // Fallback for any address fields we might have missed
  document
    .querySelectorAll(
      'textarea[data-selenium-test*="property-input-street_address"]'
    )
    .forEach((textarea) => {
      if (!fields.some((field) => field.textarea === textarea)) {
        const container = textarea.closest(
          ".private-expandable-text__container"
        );
        if (container) {
          fields.push({ container, textarea });
        }
      }
    });

  console.log("Found address fields:", fields.length);
  return fields;
}

function setupAddressField({ container, textarea }) {
  console.log(
    "Setting up address field:",
    textarea.getAttribute("data-selenium-test")
  );

  // Create wrapper and hidden input
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
    padding: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  `;

  // Copy styles from textarea
  const textareaStyles = window.getComputedStyle(textarea);
  copyStyles(hiddenInput, textareaStyles);

  // Set up DOM structure
  textarea.parentNode.insertBefore(inputWrapper, textarea);
  inputWrapper.appendChild(hiddenInput);
  inputWrapper.appendChild(textarea);

  // Hide textarea text but keep functionality
  textarea.style.color = "transparent";
  textarea.style.caretColor = "transparent";

  // Initialize Google Maps API on focus
  hiddenInput.addEventListener("focus", () => {
    console.log(
      "Hidden input focused:",
      textarea.getAttribute("data-selenium-test")
    );
    if (!window.google) {
      loadGoogleMapsAPI(() => initializeAutocomplete(hiddenInput, textarea));
    } else {
      initializeAutocomplete(hiddenInput, textarea);
    }
  });

  // Sync values between inputs
  setupValueSync(hiddenInput, textarea);
}

function loadGoogleMapsAPI(callback) {
  console.log("Loading Google Maps API");
  fetch("https://hubspot-address-autofill-extension.onrender.com/api/maps-key")
    .then((response) => response.json())
    .then((data) => {
      if (!window.google) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
        script.async = true;
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    })
    .catch((error) => {
      console.error("Error fetching API key:", error);
      // Keep the inputs functional even if API fails
      hiddenInput.style.display = "none";
      textarea.style.color = "inherit";
      textarea.style.caretColor = "inherit";
    });
}

function initializeAutocomplete(hiddenInput, textarea) {
  console.log(
    "Initializing autocomplete for:",
    textarea.getAttribute("data-selenium-test")
  );

  // Create new autocomplete instance for this specific input
  const autocomplete = new google.maps.places.Autocomplete(hiddenInput, {
    types: ["address"],
    componentRestrictions: { country: "us" },
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    const address = place.formatted_address;
    textarea.value = address;
    hiddenInput.value = address;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    console.log(
      "Updated address:",
      address,
      "for field:",
      textarea.getAttribute("data-selenium-test")
    );
  });
}

function setupValueSync(hiddenInput, textarea) {
  let isProcessing = false;

  const syncValue = (value) => {
    if (isProcessing) return;
    isProcessing = true;
    textarea.value = value;
    hiddenInput.value = value;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    isProcessing = false;
  };

  // Handle input and paste events for both elements
  hiddenInput.addEventListener("input", (e) => syncValue(e.target.value));
  textarea.addEventListener("input", (e) => syncValue(e.target.value));
  hiddenInput.addEventListener("paste", (e) =>
    setTimeout(() => syncValue(e.target.value), 0)
  );
  textarea.addEventListener("paste", (e) =>
    setTimeout(() => syncValue(e.target.value), 0)
  );
}

function copyStyles(target, sourceStyles) {
  ["padding", "margin", "fontFamily", "fontSize", "lineHeight"].forEach(
    (style) => {
      target.style[style] = sourceStyles[style];
    }
  );
}
