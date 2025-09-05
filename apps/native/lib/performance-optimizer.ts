/**
 * CivicLens - Performance Optimizer
 * Optimizes app performance, memory usage, and loading times
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceMetrics {
  appStartTime: number;
  screenLoadTimes: Record<string, number>;
  apiResponseTimes: Record<string, number>;
  memoryUsage: number;
  cacheHitRatio: number;
  offlineDataSize: number;
  lastOptimization: string;
}

export interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // bytes
  compressionEnabled: boolean;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics;
  private cache: Map<string, { data: any; timestamp: number; size: number }> = new Map();
  private cacheConfig: CacheConfig = {
    maxAge: 15 * 60 * 1000, // 15 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    compressionEnabled: true
  };

  private constructor() {
    this.metrics = {
      appStartTime: Date.now(),
      screenLoadTimes: {},
      apiResponseTimes: {},
      memoryUsage: 0,
      cacheHitRatio: 0,
      offlineDataSize: 0,
      lastOptimization: new Date().toISOString()
    };
    
    this.initializeOptimizations();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Initialize performance optimizations
   */
  private async initializeOptimizations(): Promise<void> {
    // Preload critical data
    await this.preloadCriticalData();
    
    // Setup memory monitoring
    this.startMemoryMonitoring();
    
    // Setup cache cleanup
    this.scheduleCacheCleanup();
    
    // Optimize images
    this.optimizeImageSettings();
    
    console.log('Performance optimizations initialized');
  }

  /**
   * Track screen load performance
   */
  trackScreenLoad(screenName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      this.metrics.screenLoadTimes[screenName] = loadTime;
      
      // Log slow screens
      if (loadTime > 2000) {
        console.warn(`Slow screen load: ${screenName} took ${loadTime}ms`);
      }
    };
  }

  /**
   * Track API response times
   */
  trackApiCall(endpoint: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const responseTime = Date.now() - startTime;
      this.metrics.apiResponseTimes[endpoint] = responseTime;
      
      // Log slow APIs
      if (responseTime > 5000) {
        console.warn(`Slow API call: ${endpoint} took ${responseTime}ms`);
      }
    };
  }

  /**
   * Intelligent caching with compression
   */
  async cacheData(key: string, data: any, customTtl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      const compressed = this.cacheConfig.compressionEnabled 
        ? await this.compressString(serialized)
        : serialized;
      
      const cacheItem = {
        data: compressed,
        timestamp: Date.now(),
        size: new Blob([compressed]).size
      };
      
      // Check cache size limit
      await this.enforcesCacheSizeLimit(cacheItem.size);
      
      this.cache.set(key, cacheItem);
      
      // Persist important cache items
      if (this.isCriticalData(key)) {
        await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      }
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Retrieve cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      let cacheItem = this.cache.get(key);
      
      // Try persistent storage if not in memory
      if (!cacheItem && this.isCriticalData(key)) {
        const stored = await AsyncStorage.getItem(`cache_${key}`);
        if (stored) {
          cacheItem = JSON.parse(stored);
          this.cache.set(key, cacheItem!);
        }
      }
      
      if (!cacheItem) return null;
      
      // Check expiration
      const maxAge = this.cacheConfig.maxAge;
      if (Date.now() - cacheItem.timestamp > maxAge) {
        this.cache.delete(key);
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      // Decompress if needed
      const data = this.cacheConfig.compressionEnabled
        ? await this.decompressString(cacheItem.data)
        : cacheItem.data;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Optimize image loading
   */
  optimizeImageUri(uri: string, width?: number, height?: number): string {
    if (!uri) return uri;
    
    const screenData = Dimensions.get('screen');
    const pixelRatio = PixelRatio.get();
    
    // Calculate optimal dimensions
    const optimalWidth = Math.round((width || screenData.width) * pixelRatio);
    const optimalHeight = Math.round((height || screenData.height) * pixelRatio);
    
    // Add optimization parameters for supported services
    if (uri.includes('cloudinary.com')) {
      return `${uri}?w_${optimalWidth},h_${optimalHeight},c_fill,f_auto,q_auto`;
    }
    
    if (uri.includes('imagekit.io')) {
      return `${uri}?tr=w-${optimalWidth},h-${optimalHeight},fo-auto`;
    }
    
    return uri;
  }

  /**
   * Batch API calls to reduce network overhead
   */
  async batchApiCalls<T>(
    calls: Array<() => Promise<T>>,
    batchSize: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(call => call())
      );
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch API call failed:', result.reason);
        }
      });
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Lazy load data with pagination
   */
  createLazyLoader<T>(
    fetchFunction: (page: number, size: number) => Promise<T[]>,
    pageSize: number = 20
  ) {
    let currentPage = 0;
    let isLoading = false;
    let hasMore = true;
    
    return {
      loadMore: async (): Promise<T[]> => {
        if (isLoading || !hasMore) return [];
        
        isLoading = true;
        try {
          const data = await fetchFunction(currentPage, pageSize);
          
          if (data.length < pageSize) {
            hasMore = false;
          }
          
          currentPage++;
          return data;
        } finally {
          isLoading = false;
        }
      },
      reset: () => {
        currentPage = 0;
        hasMore = true;
        isLoading = false;
      },
      isLoading: () => isLoading,
      hasMore: () => hasMore
    };
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let lastCall = 0;
    
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return func.apply(null, args);
      }
    }) as T;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateCacheMetrics();
    return { ...this.metrics };
  }

  /**
   * Export performance report
   */
  exportPerformanceReport(): string {
    const metrics = this.getMetrics();
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      screen: Dimensions.get('screen'),
      pixelRatio: PixelRatio.get()
    };
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      deviceInfo,
      metrics,
      recommendations: this.generateRecommendations()
    }, null, 2);
  }

  // Private helper methods

  private async preloadCriticalData(): Promise<void> {
    // Preload frequently accessed data
    const criticalKeys = [
      'user_preferences',
      'offline_data_status',
      'app_config'
    ];
    
    await Promise.allSettled(
      criticalKeys.map(key => this.getCachedData(key))
    );
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      if (performance?.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        
        // Warn if memory usage is high
        if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
          console.warn('High memory usage detected:', this.metrics.memoryUsage);
          this.optimizeMemoryUsage();
        }
      }
    }, 30000);
  }

  private scheduleCacheCleanup(): void {
    // Clean cache every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);
  }

  private optimizeImageSettings(): void {
    // Configure image optimization settings
    if (Platform.OS === 'ios') {
      // iOS-specific optimizations
    } else {
      // Android-specific optimizations
    }
  }

  private async enforcesCacheSizeLimit(newItemSize: number): Promise<void> {
    let currentSize = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.size, 0);
    
    // Remove oldest items if cache is too large
    while (currentSize + newItemSize > this.cacheConfig.maxSize) {
      const oldestKey = this.getOldestCacheKey();
      if (!oldestKey) break;
      
      const oldItem = this.cache.get(oldestKey);
      if (oldItem) {
        currentSize -= oldItem.size;
        this.cache.delete(oldestKey);
      }
    }
  }

  private getOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const maxAge = this.cacheConfig.maxAge;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.cache.delete(key);
        AsyncStorage.removeItem(`cache_${key}`);
      }
    }
  }

  private isCriticalData(key: string): boolean {
    return key.includes('user_') || key.includes('config_') || key.includes('offline_');
  }

  private updateCacheMetrics(): void {
    const totalRequests = this.cache.size + 100; // Approximate
    const cacheHits = this.cache.size;
    this.metrics.cacheHitRatio = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  }

  private optimizeMemoryUsage(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear non-critical cache items
    const criticalKeys = Array.from(this.cache.keys())
      .filter(key => this.isCriticalData(key));
    
    this.cache.clear();
    
    // Restore critical items from persistent storage
    criticalKeys.forEach(async key => {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        this.cache.set(key, JSON.parse(stored));
      }
    });
  }

  private async compressString(str: string): Promise<string> {
    // Simple compression (in production, use a proper compression library)
    return str; // TODO: Implement compression
  }

  private async decompressString(str: string): Promise<string> {
    // Simple decompression
    return str; // TODO: Implement decompression
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;
    
    // Screen load time recommendations
    const slowScreens = Object.entries(metrics.screenLoadTimes)
      .filter(([_, time]) => time > 2000);
    
    if (slowScreens.length > 0) {
      recommendations.push(`Optimize slow screens: ${slowScreens.map(([name]) => name).join(', ')}`);
    }
    
    // API response time recommendations
    const slowApis = Object.entries(metrics.apiResponseTimes)
      .filter(([_, time]) => time > 5000);
    
    if (slowApis.length > 0) {
      recommendations.push(`Optimize slow API calls: ${slowApis.map(([name]) => name).join(', ')}`);
    }
    
    // Cache recommendations
    if (metrics.cacheHitRatio < 70) {
      recommendations.push('Improve caching strategy to increase cache hit ratio');
    }
    
    // Memory recommendations
    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('Reduce memory usage by optimizing data structures and clearing unused objects');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();