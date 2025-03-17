# HubSpot Address Autocomplete - Backend

This backend service securely provides your Google Maps API key to the Chrome extension.

## Cloudflare Workers Deployment

### Method 1: Using the Cloudflare Dashboard (Easiest)

1. **Log in to your Cloudflare account**
2. **Navigate to Workers & Pages**
3. **Create a new Worker**:
   - Click "Create application"
   - Select "Create Worker"
   - Give your worker a name (e.g., "hs-address-autocomplete")

4. **Replace the code**:
   - Delete all the default code in the editor
   - Copy and paste the entire contents of `worker.js` from this repository

5. **Add your API key**:
   - Click on "Settings" (in the left sidebar while editing your worker)
   - Click on "Variables"
   - Click "Add variable"
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: Your actual Google Maps API key
   - Click "Save and deploy"

6. **Test your worker**:
   - Your worker will be available at a URL like: `https://hs-address-autocomplete.your-username.workers.dev`
   - Visit this URL in your browser to see if it's working
   - Add `/api/maps-key` to the URL to test the API endpoint

### Method 2: Using Wrangler CLI (Advanced)

1. **Install Wrangler**:
   ```
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```
   wrangler login
   ```

3. **Deploy the worker**:
   ```
   cd hs-address-autocomplete/backend
   wrangler deploy
   ```

4. **Configure your API key**:
   ```
   wrangler secret put GOOGLE_MAPS_API_KEY
   ```
   Enter your Google Maps API key when prompted.

## Updating Your Extension

After deployment, update your Chrome extension's `background.js` file:

```javascript
// Update this to your Cloudflare Workers URL
const BACKEND_URL = "https://hs-address-autocomplete.your-username.workers.dev";
```

## Troubleshooting

If you encounter a 522 error:
1. Make sure you're using the `worker.js` file, not the Express.js `server.js`
2. Check that your API key is set correctly in the Cloudflare dashboard
3. Try accessing your worker URL directly in a browser 