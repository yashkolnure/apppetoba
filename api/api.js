// api/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://88.222.214.15:5000/api', // change this to your backend
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
