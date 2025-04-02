// Cloudflare Worker for securely serving Google Maps API key and handling authentication
// Make sure to set the following environment variables in Cloudflare dashboard:
// - GOOGLE_MAPS_API_KEY: Your Google Maps API key
// - GOOGLE_CLIENT_ID: Your Google OAuth Client ID

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Configure CORS to allow requests from the Chrome extension
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);

  // Log the requested path for debugging
  console.log("Request path:", url.pathname);

  // Handle auth callback endpoint
  if (url.pathname === "/auth/callback") {
    try {
      // Get the ID token from the query parameters
      const idToken = url.searchParams.get("id_token");

      if (!idToken) {
        return new Response(
          JSON.stringify({
            error: "Missing ID token",
            authorized: false,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Verify the token
      const tokenInfo = await verifyIdToken(idToken);

      if (!tokenInfo) {
        return new Response(
          JSON.stringify({
            error: "Invalid ID token",
            authorized: false,
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Check if the email domain is authorized
      const email = tokenInfo.email;
      const isAuthorized = email && email.endsWith("@prostructengineering.com");

      return new Response(
        JSON.stringify({
          authorized: isAuthorized,
          email: email,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      // Handle any errors
      return new Response(
        JSON.stringify({
          error: "Auth error: " + error.message,
          authorized: false,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  // Handle place autocomplete endpoint
  if (url.pathname === "/api/place/autocomplete") {
    try {
      const input = url.searchParams.get("input");

      if (!input) {
        return new Response(
          JSON.stringify({
            error: "Missing input parameter",
            status: "INVALID_REQUEST",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Make request to Google Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&types=address&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch place predictions: " + error.message,
          status: "ERROR",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  // Handle place details endpoint
  if (url.pathname === "/api/place/details") {
    try {
      const placeId = url.searchParams.get("place_id");

      if (!placeId) {
        return new Response(
          JSON.stringify({
            error: "Missing place_id parameter",
            status: "INVALID_REQUEST",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Make request to Google Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,address_components&key=${GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch place details: " + error.message,
          status: "ERROR",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  // Check if the request is for the API key
  if (url.pathname === "/api/maps-key") {
    try {
      // Check if the API key environment variable is set
      if (!GOOGLE_MAPS_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "API key not configured on the server",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Return the API key from the environment variable
      return new Response(
        JSON.stringify({
          apiKey: GOOGLE_MAPS_API_KEY,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      // Handle any errors
      return new Response(
        JSON.stringify({
          error: "Server error: " + error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  // Handle root path for easy testing
  if (url.pathname === "/" || url.pathname === "") {
    return new Response(
      "HubSpot Address Autocomplete API - Use /api/maps-key to get the Google Maps API key",
      {
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders,
        },
      }
    );
  }

  // Default response for other routes
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
      ...corsHeaders,
    },
  });
}

// Verify the Google ID token
async function verifyIdToken(idToken) {
  try {
    // For Cloudflare Workers, we'll make a request to Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      console.error("Token validation failed with status:", response.status);
      return null;
    }

    const tokenInfo = await response.json();

    // Verify that the token was issued for our client
    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      console.error("Token was not issued for this client");
      return null;
    }

    // Check that the token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenInfo.exp && now > tokenInfo.exp) {
      console.error("Token has expired");
      return null;
    }

    // Return the token info if everything is valid
    return tokenInfo;
  } catch (error) {
    console.error("Error verifying ID token:", error);
    return null;
  }
}
