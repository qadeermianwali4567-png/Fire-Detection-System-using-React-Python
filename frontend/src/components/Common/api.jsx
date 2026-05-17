const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Check if token has exp claim and if it's expired
    if (payload.exp && payload.exp < currentTime) {
      console.log('Token expired at:', new Date(payload.exp * 1000));
      return true;
    }
    
    // Also check stored expiration time (if available)
    const storedExpiry = localStorage.getItem('token_expires_at');
    if (storedExpiry && Date.now() > parseInt(storedExpiry)) {
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Error checking token expiration:', e);
    return true;
  }
};

// Handle session expiration and redirect to login
const handleSessionExpired = () => {
  const currentPath = window.location.pathname;
  
  // Clear all auth-related data
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('token_expires_at');
  
  // Only redirect if not already on login page
  if (currentPath !== '/login' && !currentPath.includes('/login')) {
    console.log('Session expired, redirecting to login...');
    window.location.href = '/login';
  }
};

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    // Check token expiration before making request
    if (token && isTokenExpired(token)) {
      console.log('Token expired, clearing session...');
      handleSessionExpired();
      throw new Error('Session expired. Please login again.');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        console.log('Received 401 response, session invalid');
        handleSessionExpired();
        throw new Error('Your session has expired. Please login again.');
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        console.log('Received 403 response, access forbidden');
        throw new Error('You do not have permission to access this resource.');
      }

      return response;
    } catch (error) {
      // Re-throw the error after handling
      if (error.message === 'Failed to fetch') {
        console.error('Network error:', error);
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  },
 register: async (username, email, password) => {
    return fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });
  },
  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async logout() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('token_expires_at');
  },

  async getAvailableCameras() {
    const response = await this.request('/dashboard/available-cameras');
    return response.json();
  },

  async getReportSummary() {
    const response = await this.request('/reports/summary');
    return response.json();
  },

  async getLatestIncidents(limit = 15) {
    const response = await this.request(`/incidents/latest?limit=${limit}`);
    return response.json();
  },

  async getIncidents(page = 1, perPage = 10, status = '') {
    let url = `/incidents?page=${page}&per_page=${perPage}`;
    if (status) url += `&status=${status}`;
    const response = await this.request(url);
    return response.json();
  },

  async updateIncidentStatus(id, status) {
    const response = await this.request(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response.json();
  },

  async deleteIncident(id) {
    const response = await this.request(`/incidents/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async getMonthlyReport(year) {
    const response = await this.request(`/reports/monthly?year=${year}`);
    return response.json();
  },

  async getAnnualReport() {
    const response = await this.request('/reports/annual');
    return response.json();
  },

  async getHourlyReport() {
    const response = await this.request('/reports/hourly');
    return response.json();
  },

  async exportCSV() {
    const response = await this.request('/reports/export');
    return response.json();
  },

  async exportPDF() {
    const response = await this.request('/reports/export-pdf');
    return response.blob();
  },

  async getPerformanceSummary() {
    const response = await this.request('/performance/summary');
    const data = await response.json();
    return data;
  },

  async getPerformanceHistory(limit = 10) {
    const response = await this.request(`/performance/history?limit=${limit}`);
    const data = await response.json();
    return data;
  },

  async recordPerformanceMetrics(data) {
    const response = await this.request('/performance/record', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    console.log('Record metrics response:', result);
    return result;
  },
};

// Optional: Set up automatic token check interval
let tokenCheckInterval = null;

export const startTokenMonitoring = () => {
  if (tokenCheckInterval) clearInterval(tokenCheckInterval);
  
  // Check token every minute
  tokenCheckInterval = setInterval(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      console.log('Auto-detected expired token during monitoring');
      handleSessionExpired();
    }
  }, 60000); // Check every minute
};

export const stopTokenMonitoring = () => {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }
};

export { api };