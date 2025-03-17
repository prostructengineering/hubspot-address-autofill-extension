# HubSpot Address Autocomplete - Deployment Guide

This guide covers the steps to deploy both the backend and the Chrome extension.

## 1. Backend Deployment (Cloudflare Workers)

The backend serves your Google Maps API key securely to the extension.

### Setup Cloudflare Worker

1. **Log in to your Cloudflare account** at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Navigate to Workers & Pages**
3. **Create a new Worker**:
   - Click "Create application"
   - Select "Create Worker"
   - Name your worker (e.g., `hs-address-autocomplete`)

4. **Deploy the Worker**:
   - Replace the default code with the contents of `backend/worker.js`
   - Click "Save and Deploy"

5. **Add your API key**:
   - Click on the "Settings" tab
   - Go to "Variables"
   - Click "Add variable"
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: Your actual Google Maps API key
   - Click "Save and Deploy" again

6. **Note your Worker URL**:
   - It will look like: `https://hs-address-autocomplete.your-username.workers.dev`
   - This URL is needed for the next step

### Test Your Backend

Visit your Worker URL in a browser and append `/api/maps-key` to check if it returns the API key:
```
https://hs-address-autocomplete.your-username.workers.dev/api/maps-key
```

You should see a JSON response like:
```json
{"apiKey":"your-google-maps-api-key"}
```

## 2. Update Extension Configuration

Before packaging the extension, you need to update it to use your Cloudflare Worker.

1. **Edit `background.js`**:
   - Open `hs-address-autocomplete/extension/background.js`
   - Update the `BACKEND_URL` to your Cloudflare Worker URL:
   ```javascript
   const BACKEND_URL = "https://hs-address-autocomplete.your-username.workers.dev";
   ```

2. **Edit `popup.js`**:
   - Also update the `BACKEND_URL` in `popup.js` to the same URL:
   ```javascript
   const BACKEND_URL = "https://hs-address-autocomplete.your-username.workers.dev";
   ```

## 3. Security Note

The fallback API key has been removed from the extension. This means:

- The extension will **only** work if the backend is properly deployed and configured
- If the backend is unavailable, the extension will display an error message
- Users will be prompted to contact an administrator if the backend is not working
- This is more secure as it enforces proper API key management

## 4. Build and Package the Extension

1. **Prepare the extension**:
   - Make sure all files are updated with the correct backend URL
   - Test the extension locally

2. **Package the extension**:
   - Create a ZIP file of the `extension` directory
   - This ZIP file will be used to distribute the extension to your team

## 5. Install the Extension

### For Testing/Development

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in the top right corner)
3. **Click "Load unpacked"** and select the `hs-address-autocomplete/extension` folder
4. **Test the extension** by clicking on its icon in the Chrome toolbar

### For Distribution

There are two main ways to distribute your extension:

#### A. Chrome Web Store (Public)

1. Create a developer account at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Upload your packaged extension
3. Provide required details, screenshots, etc.
4. Pay the one-time developer fee ($5)
5. Submit for review

#### B. Enterprise Distribution (Private)

For internal company use:

1. Generate an update XML file
2. Host the extension package on your company server
3. Use group policy or other management tools to deploy to users

## 6. Maintenance

### Backend

- **Monitor usage**: Check Cloudflare analytics for usage patterns
- **Update API key**: If you need to update your API key, simply update the variable in Cloudflare dashboard

### Extension

- **Version updates**: When making changes, update the version number in `manifest.json`
- **Distribution updates**: Re-package and update the extension through your chosen distribution method

## 7. Troubleshooting

### Backend Issues

- **522 errors**: Make sure you're using the Worker script, not the Express.js server
- **API key not appearing**: Check the environment variable is set correctly in Cloudflare
- **Backend not working**: The extension will now display clear error messages if the backend is unavailable

### Extension Issues

- **Can't connect to backend**: Verify the backend URL in the extension is correct
- **CORS errors**: Ensure the CORS headers in your Worker are properly configured
- **Extension loading**: Make sure to reload the extension after making changes

## 8. Security Considerations

- **API Key Restrictions**: In Google Cloud Console, restrict your API key to:
  - Specific API services (Maps, Places)
  - HTTP referrers (your extension's ID and domains)
  
- **Cloudflare Analytics**: Monitor for unusual traffic patterns that might indicate abuse

## Need Help?

Contact your system administrator or refer to:
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Chrome Extensions documentation](https://developer.chrome.com/docs/extensions/) 