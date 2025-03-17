// Cloudflare Worker for securely serving Google Maps API key
// Make sure to set GOOGLE_MAPS_API_KEY as an environment variable in Cloudflare dashboard

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
