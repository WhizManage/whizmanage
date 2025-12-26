// src/components/forms/core/FormProvider.jsx

import { createContext, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";

const FormContext = createContext(null);

/**
 * Hook לשימוש ב-form context
 * @returns {Object} Form methods from react-hook-form + submit
 * @throws {Error} אם נעשה שימוש מחוץ ל-FormProvider
 */
export const useGenericForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useGenericForm must be used within FormProvider");
  }
  return context;
};

/**
 * FormProvider - מספק context לכל הטופס
 * @param {Object} props
 * @param {Object} props.initialRow - ערכים התחלתיים לטופס
 * @param {Function} props.onSubmit - callback כשהטופס נשלח בהצלחה
 * @param {Function} [props.onError] - callback כשיש שגיאת validation
 * @param {Function} [props.onProductSaved] - callback כשמוצר נשמר (מ-ProductTypeInput) ✅ הוספה
 * @param {ReactNode} props.children
 */
export default function FormProvider({ 
  initialRow = {}, 
  onSubmit, 
  onError,
  onProductSaved, // ✅ הוספה
  children 
}) {
  const methods = useForm({
    mode: "onBlur",
    defaultValues: initialRow || {}
  });

  const { handleSubmit, reset, formState } = methods;

  // Ref לשמירת initialRow עדכני (לשימוש ב-event listeners)
  const initialRowRef = useRef(initialRow);
  useEffect(() => {
    initialRowRef.current = initialRow;
  }, [initialRow]);

  // Reset הטופס כשמשנים את initialRow
  useEffect(() => {
    reset(initialRow || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialRow)]);

  // פונקציית submit עם error handling
  const submit = useCallback(() => {
    handleSubmit(
      async (values) => {
        try {
          await onSubmit?.(values);
        } catch (error) {
          console.error("[FormProvider] Submit error:", error);
        }
      },
      (errors) => {
        console.warn("[FormProvider] Validation errors:", errors);
        onError?.(errors);
      }
    )();
  }, [handleSubmit, onSubmit, onError]);

  // Event listener לשליחה חיצונית (למשל מכפתור במודל)
  useEffect(() => {
    const listener = () => submit();
    window.addEventListener("generic-form-submit", listener);
    return () => window.removeEventListener("generic-form-submit", listener);
  }, [submit]);

  // ✅ Event listener ל-reset (שמור לתאימות לאחור)
  useEffect(() => {
    const listener = () => {
      reset(initialRowRef.current || {}, {
        keepDefaultValues: false,
        keepValues: false,
        keepDirty: false,
        keepErrors: false,
        keepTouched: false,
        keepIsSubmitted: false,
        keepSubmitCount: false,
      });
    };
    window.addEventListener("generic-form-reset", listener);
    return () => window.removeEventListener("generic-form-reset", listener);
  }, [reset]);

  // Value עם memoization למניעת re-renders מיותרים
  const value = useMemo(() => ({ 
    ...methods, 
    submit,
    onProductSaved, // ✅ הוספה - העברה ל-context
    // helper methods נוספים
    isDirty: formState.isDirty,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
  }), [methods, submit, onProductSaved, formState.isDirty, formState.isValid, formState.isSubmitting]); // ✅ הוספה לתלויות

  return (
    <FormContext.Provider value={value}>
      <form 
        onSubmit={handleSubmit(onSubmit, onError)} 
        noValidate
        className="w-full"
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}