import axios, { AxiosRequestConfig } from 'axios';

interface CacheItem {
  data: any;
  timestamp: number;
  expiresIn: number;
}

class ApiCache {
  private cache: Map<string, CacheItem> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_CACHE_DURATION = 60 * 1000; // 1 minute default

  getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
  }

  set(key: string, data: any, expiresIn: number = this.DEFAULT_CACHE_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
  }

  getPendingRequest(key: string): Promise<any> | null {
    return this.pendingRequests.get(key) || null;
  }

  clearPendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

const apiCache = new ApiCache();

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request deduplication and caching interceptor
api.interceptors.request.use(async (config) => {
  // Skip caching for non-GET requests or if cache is explicitly disabled
  if (config.method !== 'get' || config.headers?.['x-skip-cache']) {
    return config;
  }

  const cacheKey = apiCache.getCacheKey(config);
  
  // Check for cached response
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return Promise.reject({
      config,
      response: { data: cachedResponse, status: 304 },
      isCache: true
    });
  }

  // Check for pending request
  const pendingRequest = apiCache.getPendingRequest(cacheKey);
  if (pendingRequest) {
    return Promise.reject({
      config,
      response: pendingRequest,
      isPending: true
    });
  }

  return config;
});

// Add request interceptor to inject auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor for caching and error handling
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && !response.config.headers?.['x-skip-cache']) {
      const cacheKey = apiCache.getCacheKey(response.config);
      apiCache.set(cacheKey, response.data);
      apiCache.clearPendingRequest(cacheKey);
    }
    return response;
  },
  async (error) => {
    // Handle cached responses
    if (error.isCache) {
      return Promise.resolve({ data: error.response.data, status: 304, cached: true });
    }

    // Handle pending requests
    if (error.isPending) {
      return error.response;
    }

    // Handle unauthorized access
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return api.request(error.config);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      // Retry the request once for network errors
      if (!error.config.__isRetry) {
        error.config.__isRetry = true;
        return api.request(error.config);
      }
    }

    return Promise.reject(error);
  }
);

// Export cache control functions
export const clearApiCache = () => apiCache.clear();
export const skipCache = (config: AxiosRequestConfig) => {
  if (!config.headers) config.headers = {};
  config.headers['x-skip-cache'] = true;
  return config;
};

export { api }; 