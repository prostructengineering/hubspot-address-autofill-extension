# HubSpot Address Autocomplete Extension

A Chrome extension that helps your sales team quickly find and copy properly formatted addresses using Google Maps API.

![HubSpot Address Autocomplete Extension](https://via.placeholder.com/640x400?text=HubSpot+Address+Autocomplete)

## Project Overview

This project provides a Chrome extension that allows your sales team to:

1. Type in addresses and get Google Maps API address autocomplete suggestions
2. One-click copy the formatted address to paste into HubSpot
3. Save time by ensuring addresses are properly formatted

## Project Structure

- `extension/` - Chrome extension files
- `backend/` - Backend server for securely managing the Google Maps API key

## Getting Started

For detailed setup instructions, please see the [SETUP_GUIDE.md](SETUP_GUIDE.md) file.

## Features

### Chrome Extension
- Clean, intuitive popup interface
- Google Maps-powered address autocomplete
- One-click copy functionality
- Works in any Chrome tab

### Backend Server
- Securely manages the Google Maps API key
- Simple Express.js server
- Easy to deploy on platforms like Render

### Security Features
- API key is never exposed in client-side code
- Secure backend integration
- Background script with caching to minimize API requests
- Content Security Policy protections
- Detailed security recommendations in setup guide

## Requirements

- Chrome browser
- Google Maps Platform API key
- Node.js for backend deployment

## Security Best Practices

This extension follows security best practices to protect your Google Maps API key:

1. The API key is stored securely on the server, not in the extension code
2. The background script securely fetches and temporarily caches the key
3. Requests to Google APIs are made with proper security measures
4. The setup guide includes instructions for restricting the API key in Google Cloud Console

## License

This project is proprietary and intended for internal use only.

## Support

For support or feature requests, please contact the development team. 