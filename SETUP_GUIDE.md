# HubSpot Address Autocomplete Extension Setup Guide

This guide will walk you through setting up and deploying the HubSpot Address Autocomplete extension for your sales team.

## Prerequisites

1. A Google Cloud account with Google Maps Platform API access
2. A server to host the backend (we recommend [Render](https://render.com) for easy deployment)
3. Chrome browser for your sales team

## Step 1: Set Up the Google Maps API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable the following APIs:
   - Places API
   - Maps JavaScript API
5. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
6. Secure your API key:
   - After creating the key, click "Restrict Key"
   - Under "Application restrictions", select "HTTP referrers (websites)"
   - Add your extension's Chrome extension ID as a referrer: `chrome-extension://YOUR_EXTENSION_ID/*` 
     (You'll get this ID after loading the extension in Chrome)
   - Add your backend domain: `https://your-backend-url.com/*`
   - Under "API restrictions", restrict the key to only:
     - Places API
     - Maps JavaScript API
   - Set usage limits in the "Quotas" section to prevent unexpected charges
7. Copy your API key for the next step

## Step 2: Deploy the Backend

### Option 1: Deploy to Render

1. Fork this repository to your own GitHub account
2. Go to [Render](https://render.com) and sign up or log in
3. Click "New" > "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - Name: `hs-address-autocomplete`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node backend/server.js`
   - Add the environment variable:
     - Key: `GOOGLE_MAPS_API_KEY`
     - Value: Your Google Maps API key from Step 1
6. Click "Create Web Service"
7. Wait for deployment to complete and note the URL (e.g., `https://your-service-name.onrender.com`)

### Option 2: Manual Deployment

If you prefer to deploy to your own server:

1. Clone this repository
2. Navigate to the `backend` folder
3. Create a `.env` file with your Google Maps API key:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
4. Install dependencies: `npm install`
5. Start the server: `npm start`
6. Make sure your server is accessible from the internet
7. Note the URL of your server

## Step 3: Configure the Extension

1. Open the `extension/background.js` file
2. Update the `BACKEND_URL` constant with your backend URL from Step 2:
   ```javascript
   const BACKEND_URL = 'https://your-service-name.onrender.com';
   ```
3. Save the file
4. Also update the same URL in `extension/popup.js` if needed

## Step 4: Add Security Measures (Recommended)

For added security, consider implementing these additional measures:

1. Add authentication to your backend API:
   - Implement an API key or token system for the extension to authenticate with the backend
   - Use HTTPS for all communications
   - Add rate limiting to prevent abuse

2. Update your CORS settings in the backend to only allow requests from your extension:
   ```javascript
   app.use(cors({
     origin: ['chrome-extension://YOUR_EXTENSION_ID'],
     methods: ['GET'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

3. Consider encryption for the API key storage in the extension

## Step 5: Add Icons

1. Create three icon files in the `extension/images` folder:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
2. You can use a location pin design with HubSpot colors (#ff7a59 and #33475b)

## Step 6: Install the Extension for Testing

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the `extension` folder
4. Note your extension ID (you'll need this to update your Google API key restrictions)
5. Go back to the Google Cloud Console and add your extension ID to the API key restrictions
6. Test the extension by:
   - Clicking the extension icon
   - Typing an address
   - Selecting from the suggestions
   - Copying the formatted address

## Step 7: Deploy to Your Team

For internal distribution:

1. Zip the `extension` folder
2. Share the ZIP file with your team
3. Instruct team members to:
   - Extract the ZIP file
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extracted folder

For Chrome Web Store distribution (recommended for larger teams):

1. Create a developer account on the [Chrome Web Store](https://chrome.google.com/webstore/devconsole/)
2. Create a new item
3. Upload a ZIP of the `extension` folder
4. Fill out the required information
5. Submit for review
6. Once approved, share the Chrome Web Store link with your team

## Usage Instructions for Sales Team

1. Click the extension icon in the Chrome toolbar
2. Start typing an address in the input field
3. Select from the Google Maps suggestions
4. Click "Copy Full Address" to copy the properly formatted address
5. Paste the address into HubSpot

## Troubleshooting

- **API Key Issues**: If the extension shows an API key error, check that your backend is running and the API key is correctly set up
- **Address Not Showing**: Make sure you've enabled the Places API in your Google Cloud Console
- **Extension Not Working**: Try reloading the extension in `chrome://extensions/`
- **CORS Errors**: Ensure your backend CORS settings allow requests from your extension

## Support

For issues or questions, please contact your IT department or the extension developer. 