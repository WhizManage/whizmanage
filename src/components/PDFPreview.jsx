import { FileText, ExternalLink, Eye } from "lucide-react";
import { useState } from "react";
const MiniPDFPreview = ({ value, t }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const handlePreviewLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handlePreviewError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2">
        {/* Mini Preview */}
        <div className="relative group">
          <div 
            className="w-12 h-16 bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-sm overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => setShowFullPreview(!showFullPreview)}
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-3 w-3 border border-slate-400 border-t-transparent"></div>
              </div>
            )}
            
            {hasError && (
              <div className="flex items-center justify-center h-full">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
            )}
            
            <iframe
              src={`${value}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
              className={`w-full h-full border-0 pointer-events-none ${isLoading || hasError ? 'hidden' : 'block'}`}
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
              title="Mini PDF Preview"
              style={{ transform: 'scale(0.2)', transformOrigin: 'top left', width: '500%', height: '500%' }}
            />
          </div>
          
          {/* PDF Label */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-red-500 text-white text-xs rounded font-medium">
            PDF
          </div>
          
          {/* Hover Tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {__("Click to preview", "whizmanage")}
          </div>
        </div>

        {/* Open Button */}
        <button
          onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
          className="group relative flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-sm"
        >
          <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-700 dark:text-blue-300 font-medium text-xs">
            {__("Open", "whizmanage")}
          </span>
        </button>
      </div>
      {/* Full Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFullPreview(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {__("PDF Preview", "whizmanage")}
              </h3>
              <button
                onClick={() => setShowFullPreview(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4">
              <iframe
                src={`${value}#toolbar=0&navpanes=0`}
                className="w-full h-96 border-0 rounded"
                title="PDF Full Preview"
              />
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {__("Open in New Tab", "whizmanage")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// גרסה עוד יותר מיני - רק thumbnail
const TinyPDFPreview = ({ value, t }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePreviewLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handlePreviewError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="relative inline-block group">
      <div 
        className="w-8 h-10 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden cursor-pointer hover:border-red-400 hover:shadow-md transition-all duration-200"
        onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-2 w-2 border border-slate-400 border-t-transparent"></div>
          </div>
        )}
        
        {hasError && (
          <div className="flex items-center justify-center h-full">
            <FileText className="w-3 h-3 text-red-500" />
          </div>
        )}
        
        <iframe
          src={`${value}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          className={`w-full h-full border-0 pointer-events-none ${isLoading || hasError ? 'hidden' : 'block'}`}
          onLoad={handlePreviewLoad}
          onError={handlePreviewError}
          title="Tiny PDF Preview"
          style={{ transform: 'scale(0.15)', transformOrigin: 'top left', width: '666%', height: '666%' }}
        />
      </div>
      {/* PDF Badge */}
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold leading-none">P</span>
      </div>
      {/* Hover Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {__("Open PDF", "whizmanage")}
      </div>
    </div>
  );
};

export { MiniPDFPreview, TinyPDFPreview };