import axios from 'axios';

// Replace with your production API URL
const API_BASE_URL = 'https://gts-api.slpro.in/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
