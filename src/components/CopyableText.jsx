import { useState } from "react";
import { Copy, Check } from "lucide-react";

const CopyableText = ({ 
  text, 
  children, 
  className = "", 
  showIcon = true, 
  showTooltip = true,
  truncate = true,
  maxLines = 2,
  timeout = 2000,
  onCopy = null,
  variant = "default" // "default", "minimal", "button", "inline"
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const textToCopy = text || (typeof children === 'string' ? children : '');
    
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      
      // Call callback if provided
      if (onCopy) {
        onCopy(textToCopy);
      }
      
      // Reset the copied state after specified timeout
      setTimeout(() => {
        setCopied(false);
      }, timeout);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      if (onCopy) {
        onCopy(textToCopy);
      }
      setTimeout(() => {
        setCopied(false);
      }, timeout);
    }
  };

  // Base classes for different variants
  const variantClasses = {
    default: "group relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 rounded-md p-2 -m-2 flex items-center gap-2",
    minimal: "group relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 rounded p-1 -m-1 flex items-center gap-1",
    button: "group relative cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-2 border border-slate-200 dark:border-slate-600",
    inline: "group relative cursor-pointer flex items-center gap-1 transition-opacity duration-200"
  };

  // Truncate classes
  const truncateClasses = truncate ? 
    `line-clamp-${maxLines} truncate text-wrap` : 
    "";

  const displayText = text || children;

  return (
    <div
      title={typeof displayText === 'string' ? displayText : ''}
      className={`${variantClasses[variant]} ${truncateClasses} ${className}`}
      onClick={copyToClipboard}
    >
      <span className="flex-1 select-none">
        {displayText}
      </span>
      
      {/* Copy/Check Icon */}
      {showIcon && (
        <div className="flex items-center">
          {copied ? (
            <Check className="w-4 h-4 text-green-500 animate-in fade-in-0 zoom-in-95 duration-200" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          )}
        </div>
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {copied ? "Copied!" : "Click to copy"}
        </div>
      )}
    </div>
  );
};

export default CopyableText;