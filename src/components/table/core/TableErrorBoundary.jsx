// src/components/table/TableErrorBoundary.jsx
import { toast } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
 import { __ } from "@wordpress/i18n";

/**
 * Error Boundary Component for Table
 * מטפל בשגיאות ברמת הטבלה ומספק UI ידידותי למשתמש
 */
class TableErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    // עדכון state כך שהרנדר הבא יציג את ה-fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // לוג השגיאה לשירותי monitoring
    console.error("Table Error:", error, errorInfo);
    
    // עדכון state עם פרטי השגיאה
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // הצגת toast notification
    toast.error(error.toString());

    // קריאה ל-callback אם הועבר
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // שליחה לשירות monitoring (לדוגמה: Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    // ניסיון לאפס את הטבלה
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });

    // קריאה ל-callback אם הועבר
    if (this.props.onReset) {
      this.props.onReset();
    }

    toast.success("Table reset successfully");
  };

  handleReload = () => {
    // רענון העמוד
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount, showDetails } = this.state;
      const isDevelopment = process.env.NODE_ENV === "development";

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-red-200 dark:border-red-900 overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-900/20 p-6 border-b border-red-200 dark:border-red-900">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Oops! Something went wrong
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      An unexpected error occurred while loading the table.
                      {errorCount > 1 && (
                        <span className="block mt-1 text-red-600 dark:text-red-400">
                          This is error #{errorCount} in sequence. We recommend refreshing the page.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* הודעת שגיאה ראשית */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                      {error?.toString() || "Unknown error"}
                    </p>
                  </div>

                  {/* כפתור להצגת פרטים נוספים */}
                  {isDevelopment && (
                    <button
                      onClick={this.toggleDetails}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                      {showDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {showDetails ? "Hide" : "Show"} technical details
                    </button>
                  )}

                  {/* פרטים טכניים - רק ב-development */}
                  {isDevelopment && showDetails && errorInfo && (
                    <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Component Stack:
                      </h4>
                      <pre className="text-xs text-slate-600 dark:text-slate-300 overflow-x-auto scrollbar-whiz whitespace-pre-wrap font-mono">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  {/* אפשרויות פעולה */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      onClick={this.handleReset}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>
                    
                    <button
                      onClick={this.handleReload}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reload page
                    </button>

                    {this.props.onNavigateHome && (
                      <button
                        onClick={this.props.onNavigateHome}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                      >
                        <Home className="h-4 w-4" />
                        Go to home
                      </button>
                    )}
                  </div>

                  {/* הצעות לפתרון */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      💡 Error solutions:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• Try refreshing the page (F5)</li>
                      <li>• Check your internet connection</li>
                      <li>• Clear your browser cache</li>
                      {errorCount > 2 && (
                        <li>• Contact technical support if the problem persists</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // אם אין שגיאה, הצג את הילדים
    return this.props.children;
  }
}

/**
 * Higher Order Component לעטיפת קומפוננטות עם Error Boundary
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = (props) => (
    <TableErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </TableErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook לטיפול בשגיאות אסינכרוניות
 */
export function useAsyncError() {
  const [, setError] = React.useState();
  
  return React.useCallback(
    (error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

/**
 * Hook לטיפול בשגיאות בפעולות טבלה
 */
export function useTableErrorHandler() {
  const throwError = useAsyncError();
  
  const handleTableError = React.useCallback((error, context = "") => {
    console.error(`Table Error${context ? ` in ${context}` : ""}:`, error);
    
    // הצגת toast notification
    toast.error(error.message || "An unexpected error occurred");
    
    // זריקת השגיאה ל-Error Boundary אם היא קריטית
    if (error.critical) {
      throwError(error);
    }
  }, [throwError]);

  const wrapAsync = React.useCallback((asyncFn, context = "") => {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        handleTableError(error, context);
        throw error; // העבר את השגיאה הלאה
      }
    };
  }, [handleTableError]);

  return {
    handleTableError,
    wrapAsync,
    throwError,
  };
}

export default TableErrorBoundary;

/**
 * Safe Table Wrapper - עוטף את הטבלה עם Error Boundary ו-Suspense
 */
export function SafeTable({ children, ...props }) {
  return (
    <TableErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Table crashed:", error, errorInfo);
      }}
      onReset={() => {
      }}
      {...props}
    >
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Loading table...</p>
            </div>
          </div>
        }
      >
        {children}
      </React.Suspense>
    </TableErrorBoundary>
  );
}