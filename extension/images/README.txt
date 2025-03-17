Please replace these with actual icon files before using the extension:

1. icon16.png - 16x16 pixels
2. icon48.png - 48x48 pixels
3. icon128.png - 128x128 pixels

Icon recommendations:
- Use a simple, recognizable design
- Include a location pin or map marker
- Use HubSpot brand colors if possible (orange #ff7a59, dark blue #33475b)
- Make sure the icon is clearly visible at smaller sizes

Security recommendations for the Google Maps API key:
- Restrict the API key in the Google Cloud Console to:
  - Only allow specific HTTP referrers (your extension's ID)
  - Only enable the specific APIs you need (Places API, Maps JavaScript API)
  - Set quotas and alert notifications for usage
- Never embed the API key directly in client-side code
- Use the backend server to securely provide the API key
- Consider implementing a token-based authentication system for the backend
