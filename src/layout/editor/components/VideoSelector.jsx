import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@components/ui/button';
import { Edit, Trash2, Maximize } from 'lucide-react';
import { useTheme } from '../../ThemeProvider';
import { confirm } from '@components/CustomConfirm';


const VideoSelector = ({ editorRef, execCommand, onContentChange }) => {
   
  const { theme } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    
    const doc = editorRef.current.contentDocument;
    if (!doc) return;

    // סגנונות לסימון וידאו נבחר
    const style = doc.createElement('style');
    style.textContent = `
      iframe:hover, video:hover {
        outline: 2px solid #3b82f6;
        cursor: pointer;
      }
      iframe.selected, video.selected {
        outline: 2px solid #3b82f6;
      }
    `;
    doc.head.appendChild(style);

    // טיפול בלחיצה על וידאו
    const handleVideoClick = (e) => {
      if (e.target.tagName === 'IFRAME' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
        e.stopPropagation();
        
        // הסרת סימון מוידאו אחרים
        doc.querySelectorAll('iframe.selected, video.selected').forEach(video => {
          if (video !== e.target) {
            video.classList.remove('selected');
          }
        });
        
        // סימון הוידאו הנבחר
        e.target.classList.add('selected');
        setSelectedVideo(e.target);
        
        // מיקום סרגל הכלים
        positionToolbar(e.target);
        setShowToolbar(true);
      } else if (!e.target.closest('.video-toolbar')) {
        // הסרת סימון מכל הוידאו בלחיצה מחוץ לוידאו
        doc.querySelectorAll('iframe.selected, video.selected').forEach(video => {
          video.classList.remove('selected');
        });
        setSelectedVideo(null);
        setShowToolbar(false);
      }
    };

    const positionToolbar = (videoElement) => {
      const rect = videoElement.getBoundingClientRect();
      const iframeRect = editorRef.current.getBoundingClientRect();
      
      setToolbarPosition({
        top: rect.top + iframeRect.top - 40,
        left: rect.left + iframeRect.left,
        width: rect.width,
      });
    };

    doc.addEventListener('click', handleVideoClick);
    
    return () => {
      doc.removeEventListener('click', handleVideoClick);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [editorRef.current]);

  const handleDelete = async () => {
    if (selectedVideo) {
      const isConfirmed = await confirm({
        title: __("Delete Video", "whizmanage"),
        message: __("Are you sure you want to delete this video?", "whizmanage"),
        confirmText: __("Delete", "whizmanage"),
        cancelText: __("Cancel", "whizmanage"),
      });

      if (isConfirmed) {
        selectedVideo.remove();
        setSelectedVideo(null);
        setShowToolbar(false);
        
        if (editorRef.current) {
          const newContent = editorRef.current.contentDocument.body.innerHTML;
          onContentChange(newContent);
        }
      }
    }
  };

  const handleResize = () => {
    if (selectedVideo) {
      const currentWidth = selectedVideo.width || selectedVideo.getAttribute('width') || 560;
      const currentHeight = selectedVideo.height || selectedVideo.getAttribute('height') || 315;
      
      const newWidth = prompt(t('Enter new width:'), currentWidth);
      const newHeight = prompt(t('Enter new height:'), currentHeight);
      
      if (newWidth && newHeight) {
        selectedVideo.width = newWidth;
        selectedVideo.height = newHeight;
        selectedVideo.setAttribute('width', newWidth);
        selectedVideo.setAttribute('height', newHeight);
        
        if (editorRef.current) {
          const newContent = editorRef.current.contentDocument.body.innerHTML;
          onContentChange(newContent);
        }
      }
    }
  };

  const renderToolbar = () => {
    if (!showToolbar || !selectedVideo) return null;
    
    const isDarkMode = theme === 'dark';
    
    const toolbarStyle = {
      position: 'fixed',
      top: `${toolbarPosition.top}px`,
      left: `${toolbarPosition.left}px`,
      zIndex: 1000,
      display: 'flex',
      gap: '4px',
      background: isDarkMode ? '#1e293b' : 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '4px',
      pointerEvents: 'auto',
      border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
    };
    
    return createPortal(
      <div 
        ref={toolbarRef}
        className="video-toolbar"
        style={toolbarStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={handleResize}
          className="size-8"
          title={__('Resize video', "whizmanage")}
        >
          <Maximize className="size-4" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDelete}
          className="size-8"
          title={__('Delete video', "whizmanage")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>,
      document.body
    );
  };

  return renderToolbar();
};

export default VideoSelector;