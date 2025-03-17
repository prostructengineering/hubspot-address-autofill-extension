# HubSpot Address Autocomplete Chrome Extension

A Chrome extension that helps your sales team quickly find and copy properly formatted addresses using Google Maps API.

## Features

- Address autocomplete powered by Google Maps API
- One-click copy of formatted addresses
- Clean, intuitive interface
- Designed for the HubSpot workflow

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `extension` folder from this repository
5. The extension icon should now appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Start typing an address in the input field
3. Select an address from the dropdown suggestions
4. Click "Copy Full Address" to copy the formatted address to your clipboard
5. Paste the address in HubSpot

## Backend Setup

This extension relies on a small backend server to securely manage the Google Maps API key. The backend is deployed at https://prostruct-engineering-hs-autocomplete.onrender.com.

If you need to deploy your own backend:

1. Navigate to the `backend` folder
2. Create a `.env` file with your Google Maps API key: `GOOGLE_MAPS_API_KEY=your_api_key_here`
3. Install dependencies: `npm install`
4. Start the server: `npm start`
5. Update the API endpoint in `popup.js` to point to your deployment

## Development

To modify the extension:

1. Make changes to the files in the `extension` folder
2. Reload the extension in Chrome to see your changes

## License

This project is proprietary and intended for internal use only.

## Support

For support or feature requests, please contact the development team.

