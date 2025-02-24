// Create new file for API configuration
console.log("process.env.REACT_APP_BACKEND_URL", process.env.REACT_APP_BACKEND_URL);
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

