// The browser uses the same host that serves Angular; only the API port differs.
// This works both locally and when the application is opened from a remote server.
export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;
