import Button from "@components/ui/button";
import { cn, Link } from "@heroui/react";
import { RefreshCcwDot, Undo2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
      theme: "light", // ערך ברירת מחדל
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

  render() {
    if (this.state.hasError) {
      return (
        <div className={this.state.theme}>
          <div className="dark:bg-slate-800 h-screen flex items-center justify-center">
            <div className="h-96 flex flex-col gap-2 justify-center items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                id="Layer_1"
                data-name="Layer 1"
                viewBox="0 0 24 24"
              >
                <path
                  fill="rgb(162 28 175 / 0.7"
                  d="M17.672,11c1.202,0,2.333-.468,3.183-1.318l1.413-1.413c.97-.931,.97-2.605,0-3.535l-1.415-1.415c-.838-.838-1.997-1.318-3.182-1.318h-5.171V.5c0-.276-.224-.5-.5-.5s-.5,.224-.5,.5v1.5H5.5c-1.93,0-3.5,1.57-3.5,3.5v2c0,1.93,1.57,3.5,3.5,3.5h6v2H6.329c-1.185,0-2.344,.48-3.182,1.318l-1.415,1.415c-.97,.93-.97,2.604,0,3.535l1.413,1.413c.85,.851,1.98,1.318,3.183,1.318h5.172v1.5c0,.276,.224,.5,.5,.5s.5-.224,.5-.5v-1.5h6c1.93,0,3.5-1.57,3.5-3.5v-2c0-1.93-1.57-3.5-3.5-3.5h-6v-2h5.172Zm3.328,5.5v2c0,1.379-1.121,2.5-2.5,2.5H6.328c-.936,0-1.814-.364-2.476-1.025l-1.413-1.413c-.582-.558-.582-1.563,0-2.121l1.415-1.415c.651-.651,1.554-1.025,2.475-1.025h12.171c1.379,0,2.5,1.121,2.5,2.5ZM3,7.5v-2c0-1.379,1.121-2.5,2.5-2.5h12.171c.921,0,1.823,.374,2.475,1.025l1.415,1.415c.582,.558,.582,1.563,0,2.121l-1.413,1.413c-.661,.661-1.54,1.025-2.476,1.025H5.5c-1.379,0-2.5-1.121-2.5-2.5Zm9-.293l-1.646,1.646c-.195,.195-.512,.195-.707,0s-.195-.512,0-.707l1.646-1.646-1.646-1.646c-.195-.195-.195-.512,0-.707s.512-.195,.707,0l1.646,1.646,1.646-1.646c.195-.195,.512-.195,.707,0s.195,.512,0,.707l-1.646,1.646,1.646,1.646c.195,.195,.195,.512,0,.707s-.512,.195-.707,0l-1.646-1.646Zm-.057,11.538l3.171-3.135c.197-.194,.514-.191,.707,.004,.194,.196,.192,.513-.004,.707l-3.171,3.135c-.726,.719-1.913,.721-2.642,.006l-1.355-1.33c-.196-.193-.199-.51-.006-.707,.193-.196,.51-.2,.707-.006l1.354,1.329c.34,.334,.896,.335,1.238-.003Z"
                />
              </svg>
              <div className="p-4 pb-2 dark:hidden w-60">
                <img
                  src={
                    window.siteUrl +
                    "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE.png"
                  }
                  alt="logo"
                />
              </div>
              <div className="p-2 pt-4 pb-2 hidden dark:block w-60">
                <img
                  src={
                    window.siteUrl +
                    "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE-dark.png"
                  }
                  alt="logo"
                />
              </div>
             <h2 className="text-4xl dark:text-slate-300">{__("Something went wrong!", "whizmanage")}</h2>
              <p className="dark:text-slate-300">{this.state.errorMessage}</p>
              <div className="flex justify-center items-center gap-4">
                <Link href={window.siteUrl + "/wp-admin"} className="w-full">
                  <Button
                    variant="outline"
                    className="gap-4 w-full text-gray-600 dark:text-slate-300 dark:bg-slate-700"
                  >
                    <Undo2 className="text-fuchsia-600 w-4 h-4" />
                    <span>{__("Back to wordpress", "whizmanage")}</span>
                  </Button>
                </Link>
                <Button
                  onClick={() =>
                    // this.setState({ hasError: false, errorMessage: "" })
                       window.location.reload()
                  }
                  className="flex items-center justify-center gap-4"
                >
                  <RefreshCcwDot />
                  {__("Try again", "whizmanage")}
                  
                </Button>
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