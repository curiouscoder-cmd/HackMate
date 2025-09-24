'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint?: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const measurePerformance = () => {
      if (typeof window === 'undefined') return;

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint,
        firstContentfulPaint,
      };

      // Try to get LCP
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              metrics.largestContentfulPaint = lastEntry.startTime;
              setMetrics({ ...metrics });
            }
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Stop observing after 5 seconds
          setTimeout(() => observer.disconnect(), 5000);
        } catch (e) {
          // LCP not supported
        }
      }

      setMetrics(metrics);
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, []);

  if (!metrics) return null;

  const getPerformanceColor = (time: number, good: number, poor: number) => {
    if (time <= good) return 'text-green-600';
    if (time <= poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (time: number) => `${Math.round(time)}ms`;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-mono hover:bg-gray-700 transition-colors"
        title="Performance Metrics"
      >
        ⚡ {formatTime(metrics.pageLoadTime)}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-64">
          <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Performance Metrics</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Page Load:</span>
              <span className={getPerformanceColor(metrics.pageLoadTime, 1000, 3000)}>
                {formatTime(metrics.pageLoadTime)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">DOM Ready:</span>
              <span className={getPerformanceColor(metrics.domContentLoaded, 800, 2000)}>
                {formatTime(metrics.domContentLoaded)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">First Paint:</span>
              <span className={getPerformanceColor(metrics.firstPaint, 1000, 2500)}>
                {formatTime(metrics.firstPaint)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">First Content:</span>
              <span className={getPerformanceColor(metrics.firstContentfulPaint, 1200, 3000)}>
                {formatTime(metrics.firstContentfulPaint)}
              </span>
            </div>
            
            {metrics.largestContentfulPaint && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Largest Content:</span>
                <span className={getPerformanceColor(metrics.largestContentfulPaint, 2500, 4000)}>
                  {formatTime(metrics.largestContentfulPaint)}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>🟢 Good: &lt;1s load, &lt;2.5s LCP</div>
              <div>🟡 OK: &lt;3s load, &lt;4s LCP</div>
              <div>🔴 Poor: &gt;3s load, &gt;4s LCP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
