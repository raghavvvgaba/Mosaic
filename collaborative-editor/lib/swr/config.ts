import { SWRConfiguration } from 'swr';

/**
 * Global SWR Configuration
 *
 * This configuration applies to all SWR hooks in the application.
 * You can override these settings per-hook if needed.
 */
export const swrConfig: SWRConfiguration = {
  // Revalidate on focus (when user returns to the tab)
  revalidateOnFocus: false,

  // Revalidate on network reconnection
  revalidateOnReconnect: true,

  // Revalidate when component mounts (if data is stale)
  revalidateOnMount: true,

  // How often to automatically revalidate (in milliseconds)
  // Set to 0 to disable automatic revalidation
  refreshInterval: 0,

  // Number of milliseconds to deduplicate requests with the same key
  dedupingInterval: 2000,

  // Error retry strategy
  onErrorRetry: (error, key, config, revalidate, opts) => {
    // Don't retry on 401 (unauthorized) or 403 (forbidden) errors
    const shouldNotRetry = error.status === 401 || error.status === 403;
    if (shouldNotRetry) return;

    // Only retry up to 3 times
    if (opts.retryCount > 3) return;

    // Retry after 5 seconds (exponential backoff)
    setTimeout(() => revalidate({ retryCount: opts.retryCount + 1 }), 5000);
  },

  // Global error handler
  onError: (error, key) => {
    // Log errors but don't show toasts here (let components handle UI)
    if (error.status !== 401 && error.status !== 403) {
      console.error('SWR Error:', key, error);
    }
  },

  // Focus throttling - prevent too many revalidations on quick tab switches
  focusThrottleInterval: 5000,

  // Loading timeout - show error if data takes too long to load
  loadingTimeout: 30000,
};

/**
 * Fetcher utility for SWR
 * Wraps any async function and handles errors
 */
export async function swrFetcher<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Enhance error with status code if available
    if (error.response) {
      throw {
        ...error,
        status: error.response.status,
        message: error.message || 'An error occurred',
      };
    }
    throw error;
  }
}

/**
 * Create a fetcher that checks if user is authenticated
 */
export function createAuthenticatedFetcher<T>(
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error: any) {
      // Handle authentication errors
      if (error.code === 401 || error.type === 'user_unauthorized') {
        // Redirect to login or show auth modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('authError'));
        }
      }
      throw error;
    }
  };
}
