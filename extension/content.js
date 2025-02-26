window.onload = function () {
  console.log("Content script loaded");

  // Initial scan for address fields
  scanAndSetupAddressFields();

  // Set up MutationObserver to detect dynamically loaded address fields
  setupMutationObserver();
};

function scanAndSetupAddressFields() {
  console.log("Scanning for address fields");
  const addressFields = findAllAddressFields();
  addressFields.forEach(setupAddressField);
  return addressFields.length;
}

function setupMutationObserver() {
  console.log("Setting up MutationObserver");

  // Create a MutationObserver instance
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    // Check if any mutations might have added address fields
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node or its children might contain address fields
            if (
              node.querySelector("span[data-test-id]") ||
              node.querySelector(
                'textarea[data-selenium-test*="property-input"]'
              ) ||
              node.querySelector(".private-expandable-text__container") ||
              (node.tagName === "SPAN" && node.hasAttribute("data-test-id")) ||
              (node.tagName === "TEXTAREA" &&
                node.hasAttribute("data-selenium-test"))
            ) {
              shouldScan = true;
              break;
            }
          }
        }
      }

      if (shouldScan) break;
    }

    // If relevant nodes were added, scan for new address fields
    if (shouldScan) {
      console.log("DOM changes detected, rescanning for address fields");
      scanAndSetupAddressFields();
    }
  });

  // Start observing the entire document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

// Keep track of fields we've already processed to avoid duplicates
const processedFields = new Set();

function findAllAddressFields() {
  const fields = [];

  console.log("=== Starting field search ===");

  // Log all spans with data-test-id
  const allSpans = document.querySelectorAll("span[data-test-id]");
  console.log(
    "All spans with data-test-id:",
    Array.from(allSpans).map((span) => ({
      id: span.getAttribute("data-test-id"),
      html: span.outerHTML.substring(0, 100) + "...",
    }))
  );

  // Log all textareas
  const allTextareas = document.querySelectorAll("textarea");
  console.log(
    "All textareas:",
    Array.from(allTextareas).map((textarea) => ({
      selenium: textarea.getAttribute("data-selenium-test"),
      id: textarea.id,
      html: textarea.outerHTML.substring(0, 100) + "...",
    }))
  );

  // Log all expandable text containers
  const allExpandable = document.querySelectorAll(
    ".private-expandable-text__container"
  );
  console.log("All expandable containers:", allExpandable.length);

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
    {
      container: 'span[data-test-id="address2"]',
      textarea: 'textarea[data-selenium-test="property-input-address2"]',
    },
    {
      container:
        'span[data-test-id="deal_address__if_different_from_contact_address_"]',
      textarea:
        'textarea[data-selenium-test="property-input-deal_address__if_different_from_contact_address_"]',
    },
  ];

  // Find all matching fields
  selectorPatterns.forEach((pattern) => {
    console.log("Checking pattern:", pattern);
    const containers = document.querySelectorAll(pattern.container);
    console.log(
      `Found ${containers.length} containers for pattern:`,
      pattern.container
    );

    containers.forEach((container) => {
      console.log("Container found:", {
        container: container.outerHTML.substring(0, 100) + "...",
        hasTextarea: !!container.querySelector(pattern.textarea),
      });

      const textarea = container.querySelector(pattern.textarea);
      if (textarea) {
        // Skip if we've already processed this textarea
        if (processedFields.has(textarea)) {
          console.log(
            "Skipping already processed field:",
            textarea.getAttribute("data-selenium-test")
          );
          return;
        }

        fields.push({ container, textarea });
        processedFields.add(textarea);
        console.log("Added field:", {
          container: pattern.container,
          textarea: textarea.getAttribute("data-selenium-test"),
        });
      }
    });
  });

  // Uncomment and enable fallback search for better coverage
  // Enhanced fallback logging
  console.log("=== Starting fallback search ===");
  const allPropertyInputs = document.querySelectorAll(
    'textarea[data-selenium-test*="property-input"]'
  );
  console.log(`Found ${allPropertyInputs.length} potential property inputs`);

  allPropertyInputs.forEach((textarea) => {
    // Skip if we've already processed this textarea
    if (processedFields.has(textarea)) {
      return;
    }

    console.log("Checking textarea:", {
      selenium: textarea.getAttribute("data-selenium-test"),
      alreadyFound: fields.some((field) => field.textarea === textarea),
      hasSpanContainer: !!textarea.closest("span[data-test-id]"),
      hasExpandableContainer: !!textarea.closest(
        ".private-expandable-text__container"
      ),
      parentNode: textarea.parentNode.tagName,
      parentClasses: textarea.parentNode.className,
    });

    if (!fields.some((field) => field.textarea === textarea)) {
      const container =
        textarea.closest("span[data-test-id]") ||
        textarea.closest(".private-expandable-text__container");

      if (container) {
        fields.push({ container, textarea });
        processedFields.add(textarea);
        console.log("Added field via fallback:", {
          selenium: textarea.getAttribute("data-selenium-test"),
          containerType: container.tagName,
          containerId: container.getAttribute("data-test-id"),
          containerClass: container.className,
        });
      }
    }
  });

  console.log("=== Final Results ===");
  console.log("Total fields found:", fields.length);
  console.log(
    "Fields:",
    fields.map((f) => ({
      selenium: f.textarea.getAttribute("data-selenium-test"),
      container:
        f.container.tagName +
        (f.container.getAttribute("data-test-id") || f.container.className),
    }))
  );

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
