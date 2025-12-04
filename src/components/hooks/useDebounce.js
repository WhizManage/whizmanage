// components/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    // יצירת טיימר שיעדכן את הערך לאחר המתנה
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // ניקוי הטיימר אם הקומפוננטה תתרנדר מחדש לפני סיום הטיימר
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}