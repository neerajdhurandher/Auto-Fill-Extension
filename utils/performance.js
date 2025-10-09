/**
 * Performance Optimization Utility
 * Manages memory usage, DOM querying efficiency, and background processing
 */

/**
 * Performance Monitor Class
 * Tracks and optimizes extension performance
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      detectionTime: [],
      fillTime: [],
      memoryUsage: [],
      domQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.startTime = Date.now();
  }

  /**
   * Start performance measurement
   * @param {string} operation - Operation name
   * @returns {string} Measurement ID
   */
  startMeasurement(operation) {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (performance.mark) {
      performance.mark(`${id}_start`);
    }
    
    return id;
  }

  /**
   * End performance measurement
   * @param {string} measurementId - Measurement ID
   * @param {string} operation - Operation name
   * @returns {number} Duration in milliseconds
   */
  endMeasurement(measurementId, operation) {
    let duration = 0;
    
    try {
      if (performance.mark && performance.measure) {
        performance.mark(`${measurementId}_end`);
        performance.measure(measurementId, `${measurementId}_start`, `${measurementId}_end`);
        
        const measure = performance.getEntriesByName(measurementId)[0];
        duration = measure ? measure.duration : 0;
        
        // Clean up
        performance.clearMarks(`${measurementId}_start`);
        performance.clearMarks(`${measurementId}_end`);
        performance.clearMeasures(measurementId);
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }

    // Store metric
    if (this.metrics[`${operation}Time`]) {
      this.metrics[`${operation}Time`].push(duration);
      
      // Keep only last 50 measurements
      if (this.metrics[`${operation}Time`].length > 50) {
        this.metrics[`${operation}Time`].shift();
      }
    }

    return duration;
  }

  /**
   * Monitor memory usage
   */
  recordMemoryUsage() {
    if (performance.memory) {
      const usage = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      this.metrics.memoryUsage.push(usage);
      
      // Keep only last 20 measurements
      if (this.metrics.memoryUsage.length > 20) {
        this.metrics.memoryUsage.shift();
      }
      
      // Warn if memory usage is high
      const usagePercent = (usage.used / usage.limit) * 100;
      if (usagePercent > 80) {
        console.warn('High memory usage detected:', usagePercent.toFixed(2) + '%');
        this.optimizeMemory();
      }
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory() {
    // Clear old cache entries
    if (this.cache.size > this.maxCacheSize / 2) {
      const entries = Array.from(this.cache.entries());
      const sortedEntries = entries.sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0));
      
      // Remove oldest 25% of entries
      const toRemove = Math.floor(sortedEntries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
    
    // Trigger garbage collection if available
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (error) {
        // GC not available in production
      }
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    const stats = {
      uptime: Date.now() - this.startTime,
      cache: {
        size: this.cache.size,
        hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
      },
      averageDetectionTime: this.calculateAverage(this.metrics.detectionTime),
      averageFillTime: this.calculateAverage(this.metrics.fillTime),
      totalDomQueries: this.metrics.domQueries,
      memoryTrend: this.getMemoryTrend()
    };

    return stats;
  }

  /**
   * Calculate average from array
   * @param {Array} values - Values to average
   * @returns {number} Average value
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get memory usage trend
   * @returns {string} Trend description
   */
  getMemoryTrend() {
    if (this.metrics.memoryUsage.length < 3) return 'insufficient_data';
    
    const recent = this.metrics.memoryUsage.slice(-3);
    const trend = recent[2].used - recent[0].used;
    
    if (trend > 1000000) return 'increasing'; // 1MB increase
    if (trend < -1000000) return 'decreasing'; // 1MB decrease
    return 'stable';
  }
}

/**
 * DOM Query Optimizer
 * Optimizes DOM queries with caching and batching
 */
class DOMQueryOptimizer {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    this.selectorCache = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
    this.batchDelay = 10; // ms
  }

  /**
   * Optimized query selector with caching
   * @param {string} selector - CSS selector
   * @param {Element} context - Search context
   * @returns {NodeList} Query results
   */
  querySelectorAll(selector, context = document) {
    const cacheKey = `${selector}:${context === document ? 'document' : context.tagName}`;
    
    // Check cache first
    if (this.selectorCache.has(cacheKey)) {
      const cached = this.selectorCache.get(cacheKey);
      
      // Validate cached elements are still in DOM
      if (this.validateCachedElements(cached.elements)) {
        this.performanceMonitor.metrics.cacheHits++;
        cached.lastAccess = Date.now();
        return cached.elements;
      } else {
        this.selectorCache.delete(cacheKey);
      }
    }

    // Perform query
    this.performanceMonitor.metrics.domQueries++;
    this.performanceMonitor.metrics.cacheMisses++;
    
    const elements = context.querySelectorAll(selector);
    
    // Cache results
    this.selectorCache.set(cacheKey, {
      elements: elements,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });
    
    // Clean cache if too large
    if (this.selectorCache.size > 50) {
      this.cleanCache();
    }
    
    return elements;
  }

  /**
   * Batch multiple queries for efficiency
   * @param {Array} queries - Array of query objects
   * @returns {Promise} Promise resolving to results
   */
  batchQuery(queries) {
    return new Promise((resolve) => {
      this.batchQueue.push(...queries.map(q => ({ ...q, resolve })));
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatchQueue();
      }, this.batchDelay);
    });
  }

  /**
   * Process queued batch queries
   */
  processBatchQueue() {
    const queries = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;
    
    // Group by context for efficiency
    const contextGroups = new Map();
    
    queries.forEach(query => {
      const context = query.context || document;
      if (!contextGroups.has(context)) {
        contextGroups.set(context, []);
      }
      contextGroups.get(context).push(query);
    });
    
    // Execute queries by context
    contextGroups.forEach((contextQueries, context) => {
      const results = new Map();
      
      contextQueries.forEach(query => {
        if (!results.has(query.selector)) {
          results.set(query.selector, this.querySelectorAll(query.selector, context));
        }
        
        query.resolve(results.get(query.selector));
      });
    });
  }

  /**
   * Validate cached elements are still in DOM
   * @param {NodeList} elements - Cached elements
   * @returns {boolean} All elements valid
   */
  validateCachedElements(elements) {
    if (elements.length === 0) return true;
    
    // Check first and last elements
    return document.contains(elements[0]) && 
           (elements.length === 1 || document.contains(elements[elements.length - 1]));
  }

  /**
   * Clean old cache entries
   */
  cleanCache() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    for (const [key, value] of this.selectorCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.selectorCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.selectorCache.clear();
  }
}

/**
 * Background Task Manager
 * Manages background processing to avoid blocking UI
 */
class BackgroundTaskManager {
  constructor() {
    this.taskQueue = [];
    this.isProcessing = false;
    this.maxTasksPerFrame = 3;
    this.frameTimeout = 16; // ~60fps
  }

  /**
   * Schedule task for background processing
   * @param {Function} task - Task function
   * @param {number} priority - Task priority (higher = more urgent)
   * @returns {Promise} Task completion promise
   */
  scheduleTask(task, priority = 1) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Sort by priority
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  /**
   * Process task queue in background
   */
  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0) {
      const frameStartTime = performance.now();
      let tasksProcessed = 0;
      
      // Process tasks until frame budget exhausted
      while (
        this.taskQueue.length > 0 && 
        tasksProcessed < this.maxTasksPerFrame &&
        (performance.now() - frameStartTime) < this.frameTimeout
      ) {
        const taskItem = this.taskQueue.shift();
        
        try {
          const result = await taskItem.task();
          taskItem.resolve(result);
        } catch (error) {
          taskItem.reject(error);
        }
        
        tasksProcessed++;
      }
      
      // Yield control back to browser
      if (this.taskQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Clear all pending tasks
   */
  clearTasks() {
    this.taskQueue.forEach(task => {
      task.reject(new Error('Task cancelled'));
    });
    this.taskQueue = [];
  }

  /**
   * Get queue status
   * @returns {Object} Queue information
   */
  getQueueStatus() {
    return {
      pendingTasks: this.taskQueue.length,
      isProcessing: this.isProcessing,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  /**
   * Calculate average wait time for tasks
   * @returns {number} Average wait time in ms
   */
  calculateAverageWaitTime() {
    if (this.taskQueue.length === 0) return 0;
    
    const now = Date.now();
    const totalWaitTime = this.taskQueue.reduce((sum, task) => {
      return sum + (now - task.timestamp);
    }, 0);
    
    return totalWaitTime / this.taskQueue.length;
  }
}

/**
 * Resource Manager
 * Manages extension resources and cleanup
 */
class ResourceManager {
  constructor() {
    this.resources = new Set();
    this.cleanupInterval = null;
    this.setupCleanup();
  }

  /**
   * Register resource for management
   * @param {Object} resource - Resource to manage
   * @param {Function} cleanup - Cleanup function
   */
  register(resource, cleanup) {
    this.resources.add({ resource, cleanup, timestamp: Date.now() });
  }

  /**
   * Setup automatic cleanup
   */
  setupCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Perform resource cleanup
   */
  performCleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const item of this.resources) {
      if (now - item.timestamp > maxAge) {
        try {
          item.cleanup();
        } catch (error) {
          console.warn('Resource cleanup failed:', error);
        }
        this.resources.delete(item);
      }
    }
  }

  /**
   * Manual cleanup of all resources
   */
  cleanup() {
    for (const item of this.resources) {
      try {
        item.cleanup();
      } catch (error) {
        console.warn('Resource cleanup failed:', error);
      }
    }
    this.resources.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create global instances
const performanceMonitor = new PerformanceMonitor();
const domOptimizer = new DOMQueryOptimizer(performanceMonitor);
const taskManager = new BackgroundTaskManager();
const resourceManager = new ResourceManager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
  window.domOptimizer = domOptimizer;
  window.taskManager = taskManager;
  window.resourceManager = resourceManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PerformanceMonitor,
    DOMQueryOptimizer,
    BackgroundTaskManager,
    ResourceManager,
    performanceMonitor,
    domOptimizer,
    taskManager,
    resourceManager
  };
}