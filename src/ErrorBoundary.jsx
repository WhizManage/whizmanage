// src/ErrorBoundary.jsx

import Button from "@components/ui/button";
import { Link } from "@heroui/react";
import { AlertTriangle, ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
      theme: "light",
      isReloading: false,
      isCopied: false,
    };

  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in Error Boundary:", error, errorInfo);
  }

  componentDidMount() {
    const theme = localStorage.getItem("whizmanage-ui-theme") || "light";
    this.setState({ theme });
  }

  handleReload = () => {
    this.setState({ isReloading: true });
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  handleCopyError = () => {
    if (this.state.errorMessage) {
      navigator.clipboard.writeText(this.state.errorMessage);
      this.setState({ isCopied: true });
      setTimeout(() => {
        this.setState({ isCopied: false });
      }, 2000);
    }
  };

  getSupportUrl = () => {
    return window.user_local === "he_IL"
      ? "https://docs.whizmanage.com/he"
      : "https://docs.whizmanage.com/en";
  };

  render() {
    const { __ } = this.props;
    if (this.state.hasError) {
      return (
        <div className={this.state.theme}>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              {/* Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {__("Something went wrong", "whizmanage")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {__("An unexpected error occurred", "whizmanage")}
                    </p>
                  </div>

                  {/* Error message with copy button */}
                  {this.state.errorMessage && (
                    <div className="mb-6 p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono text-center break-all leading-5">
                          {this.state.errorMessage}
                        </p>
                        <button
                          onClick={this.handleCopyError}
                          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                            this.state.isCopied
                              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                              : "text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20"
                          }`}
                        >
                          {this.state.isCopied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>{__("Copied", "whizmanage")}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{__("Copy", "whizmanage")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={this.handleReload}
                      disabled={this.state.isReloading}
                      className="w-full h-10 gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg"
                    >
                      <RefreshCw className={`w-4 h-4 ${this.state.isReloading ? "animate-spin" : ""}`} />
                      {this.state.isReloading ? __("Reloading...", "whizmanage") : __("Try again", "whizmanage")}
                    </Button>
                    <Link
                      href={window.siteUrl + "/wp-admin"}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        className="w-full h-10 gap-2 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{__("Back to wordpress", "whizmanage")}</span>
                      </Button>
                    </Link>
                  </div>

                  {/* Logo */}
                  <div className="flex justify-center mt-8">
                    <img
                      src={
                        window.siteUrl +
                        "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE.png"
                      }
                      alt="WhizManage"
                      className="h-16 dark:hidden"
                    />
                    <img
                      src={
                        window.siteUrl +
                        "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE-dark.png"
                      }
                      alt="WhizManage"
                      className="h-16 hidden dark:block"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    {__("If this problem persists, please", "whizmanage")}{" "}
                    <a
                      href={this.getSupportUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-600 hover:text-fuchsia-700 hover:underline dark:text-fuchsia-400 dark:hover:text-fuchsia-300"
                    >
                      {__("contact support", "whizmanage")}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
