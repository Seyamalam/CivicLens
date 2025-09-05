/**
 * CivicLens - Comprehensive Error Handling System
 * Provides robust error handling, logging, and user feedback for all modules
 */

import * as Sentry from '@sentry/react-native';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  module: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  critical: boolean;
}

export interface ErrorMetrics {
  totalErrors: number;
  moduleErrors: Record<string, number>;
  criticalErrors: number;
  networkErrors: number;
  syncErrors: number;
}

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static errorListeners: ((error: AppError) => void)[] = [];

  /**
   * Handle and log application errors
   */
  static handleError(
    error: Error | string,
    module: string,
    context?: any,
    critical: boolean = false
  ): AppError {
    const appError: AppError = {
      code: this.generateErrorCode(module),
      message: error instanceof Error ? error.message : error,
      userMessage: this.getUserFriendlyMessage(error, module),
      module,
      details: {
        stack: error instanceof Error ? error.stack : undefined,
        context,
        platform: 'mobile',
        version: '1.0.0'
      },
      timestamp: new Date(),
      critical
    };

    // Store error
    this.errors.push(appError);

    // Log to console in development
    if (__DEV__) {
      console.error(`[${module}] ${appError.message}`, appError.details);
    }

    // Log to crash reporting service
    if (critical) {
      Sentry.captureException(error instanceof Error ? error : new Error(appError.message), {
        tags: { module },
        extra: appError.details
      });
    }

    // Notify listeners
    this.errorListeners.forEach(listener => listener(appError));

    return appError;
  }

  /**
   * Handle network errors with retry logic
   */
  static async handleNetworkError<T>(
    operation: () => Promise<T>,
    module: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    throw this.handleError(
      `Network operation failed after ${maxRetries} attempts: ${lastError!.message}`,
      module,
      { lastError: lastError!.message, attempts: maxRetries },
      true
    );
  }

  /**
   * Handle sync errors with offline queue
   */
  static handleSyncError(
    operation: string,
    data: any,
    error: Error
  ): void {
    const syncError = this.handleError(
      `Sync failed for ${operation}: ${error.message}`,
      'sync',
      { operation, data },
      false
    );

    // Queue for retry when online
    this.queueFailedSync(operation, data, syncError.code);
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(
    field: string,
    value: any,
    rule: string,
    module: string
  ): AppError {
    return this.handleError(
      `Validation failed for ${field}: ${rule}`,
      module,
      { field, value, rule },
      false
    );
  }

  /**
   * Handle permission errors
   */
  static handlePermissionError(
    permission: string,
    module: string
  ): AppError {
    return this.handleError(
      `Permission denied: ${permission}`,
      module,
      { permission },
      false
    );
  }

  /**
   * Get error metrics for monitoring
   */
  static getErrorMetrics(): ErrorMetrics {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentErrors = this.errors.filter(e => e.timestamp > last24Hours);
    
    const moduleErrors: Record<string, number> = {};
    recentErrors.forEach(error => {
      moduleErrors[error.module] = (moduleErrors[error.module] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      moduleErrors,
      criticalErrors: recentErrors.filter(e => e.critical).length,
      networkErrors: recentErrors.filter(e => e.message.includes('network') || e.message.includes('fetch')).length,
      syncErrors: recentErrors.filter(e => e.module === 'sync').length
    };
  }

  /**
   * Export errors for debugging
   */
  static exportErrors(): string {
    const metrics = this.getErrorMetrics();
    const recentErrors = this.errors.slice(-50); // Last 50 errors

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      metrics,
      errors: recentErrors.map(error => ({
        ...error,
        details: error.details ? JSON.stringify(error.details) : undefined
      }))
    }, null, 2);
  }

  /**
   * Clear old errors (keep last 100)
   */
  static cleanup(): void {
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  /**
   * Add error listener
   */
  static addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  static removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  // Private helper methods

  private static generateErrorCode(module: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${module.toUpperCase()}_${timestamp}_${random}`;
  }

  private static getUserFriendlyMessage(error: Error | string, module: string): string {
    const message = error instanceof Error ? error.message : error;
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    // Validation errors
    if (message.includes('validation')) {
      return 'Please check your input and try again.';
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    // Module-specific messages
    switch (module) {
      case 'procurement':
        return 'Unable to load procurement data. Please try again later.';
      case 'services':
        return 'Unable to load service information. Please try again later.';
      case 'rti':
        return 'Unable to process RTI request. Please try again later.';
      case 'bribe':
        return 'Unable to log report. Your data is saved offline and will sync when connection is restored.';
      case 'permit':
        return 'Unable to track permit status. Please try again later.';
      case 'budget':
        return 'Unable to load budget information. Please try again later.';
      case 'sync':
        return 'Data synchronization issue. Your offline data is safe and will sync automatically.';
      default:
        return 'Something went wrong. Please try again later.';
    }
  }

  private static isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    
    // Don't retry validation, authentication, or permission errors
    return (
      message.includes('validation') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('bad request') ||
      error?.status === 400 ||
      error?.status === 401 ||
      error?.status === 403 ||
      error?.status === 404
    );
  }

  private static queueFailedSync(operation: string, data: any, errorCode: string): void {
    // In a real implementation, this would use the SyncService queue
    console.warn(`Queued failed sync: ${operation}`, { data, errorCode });
  }
}

/**
 * Error boundary hook for React components
 */
export const useErrorHandler = () => {
  const handleError = (error: Error, module: string, context?: any) => {
    return ErrorHandler.handleError(error, module, context, false);
  };

  const handleCriticalError = (error: Error, module: string, context?: any) => {
    return ErrorHandler.handleError(error, module, context, true);
  };

  const handleNetworkOperation = async <T,>(
    operation: () => Promise<T>,
    module: string,
    maxRetries?: number
  ): Promise<T> => {
    return ErrorHandler.handleNetworkError(operation, module, maxRetries);
  };

  return {
    handleError,
    handleCriticalError,
    handleNetworkOperation,
    getMetrics: ErrorHandler.getErrorMetrics,
    exportErrors: ErrorHandler.exportErrors
  };
};

/**
 * Global error boundary component
 */
export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: AppError }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    const appError = ErrorHandler.handleError(
      error,
      'app',
      { boundary: 'global' },
      true
    );
    
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorHandler.handleError(
      error,
      'react',
      { errorInfo },
      true
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.userMessage || 'An unexpected error occurred.'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ marginTop: 10, padding: '10px 20px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}