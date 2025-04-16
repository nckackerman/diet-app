import { logger } from './logger.js';

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const cache = {
  set: (key, data) => {
    try {
      const item = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      logger.error('Failed to set cache', { key, error });
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const { data, timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (error) {
      logger.error('Failed to get cache', { key, error });
      return null;
    }
  },
  clear: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to clear cache', { key, error });
    }
  },
  forceRefresh: async (key, fetchFn) => {
    try {
      // Clear the existing cache
      localStorage.removeItem(key);
      
      // Fetch fresh data
      const freshData = await fetchFn();
      
      // Cache the new data
      const item = {
        data: freshData,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(item));
      
      logger.info('Cache force refreshed', { key });
      return freshData;
    } catch (error) {
      logger.error('Failed to force refresh cache', { key, error });
      throw error;
    }
  }
}; 