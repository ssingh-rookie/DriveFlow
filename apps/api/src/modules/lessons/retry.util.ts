/**
 * Simple retry utility for cron operations
 * MVP: Basic exponential backoff implementation
 * Post-MVP: More sophisticated retry strategies
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs?: number
  backoffFactor?: number
  jitter?: boolean
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalTimeMs: number
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 30000, // 30 seconds max delay
    backoffFactor = 2,
    jitter = true,
  } = options

  const startTime = Date.now()
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation()
      return {
        success: true,
        result,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't wait after the last attempt
      if (attempt === maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        baseDelayMs * Math.pow(backoffFactor, attempt - 1),
        maxDelayMs
      )

      // Add jitter to prevent thundering herd
      if (jitter) {
        delay *= 0.5 + Math.random() * 0.5
      }

      console.log(`[RETRY] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`)
      await sleep(delay)
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: maxAttempts,
    totalTimeMs: Date.now() - startTime,
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry configuration presets for common scenarios
 */
export const RETRY_PRESETS = {
  // Quick retries for transient errors
  fast: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
  },

  // Standard retries for network operations
  standard: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },

  // Patient retries for critical operations
  patient: {
    maxAttempts: 10,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },

  // Database operation retries
  database: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    jitter: true,
  },
} as const