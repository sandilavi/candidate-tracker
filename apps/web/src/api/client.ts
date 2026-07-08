import axios from 'axios';

// Create an Axios instance configured to talk to our Fastify backend
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
