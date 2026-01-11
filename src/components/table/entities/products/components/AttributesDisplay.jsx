// src/components/table/products/components/AttributesDisplay.jsx

import { Chip } from "@heroui/chip";
import { Layers, Package, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ManageVariationsModal from "./variation/components/ManageVariationsModal";

const AttributesDisplay = ({ value, row, __, isEditing = false, onCancel }) => {
  const containerRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ חילוץ המוצר מהשורה
  const product = row?.original;

  // ✅ וידוא ש-attributes הוא תמיד מערך
  const safeProduct = product ? {
    ...product,
    attributes: Array.isArray(product.attributes) ? product.attributes : [],
  } : null;

  // ✅ פתיחה אוטומטית של המודל כשנכנסים למצב עריכה
  useEffect(() => {
    if (isEditing && safeProduct) {
      setIsModalOpen(true);
    }
  }, [isEditing, safeProduct]);

  // ✅ כשהמודל נסגר, גם יוצאים ממצב עריכה
  const handleModalOpenChange = (open) => {
    setIsModalOpen(open);
    if (!open && onCancel) {
      onCancel();
    }
  };

  const attributes = Array.isArray(value) ? value : (value ? [value] : []);

  // הצג רק את 2 הראשונות + מספר
  const displayAttributes = attributes.slice(0, 2);
  const remainingCount = attributes.length - 2;

  // אם אין תכונות
  if (attributes.length === 0) {
    return (
      <>
        <div
          ref={containerRef}
          className="flex items-center gap-2 w-full h-full"
        >
          {isEditing && (
            <Settings2 className="size-4 text-fuchsia-600 flex-shrink-0" />
          )}
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Package className="size-3.5" />
            {__("No attributes", "whizmanage")}
          </span>
        </div>
        {/* מודל */}
        {safeProduct && (
          <ManageVariationsModal
            product={safeProduct}
            mode="attributes-only"
            showTour={false}
            isOpen={isModalOpen}
            onOpenChange={handleModalOpenChange}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex items-center gap-2 max-w-full w-full h-full"
        title={attributes.map((attr) => attr.name).join(", ")}
      >
        {/* אייקון עריכה במצב editing */}
        {isEditing && (
          <Settings2 className="size-4 text-fuchsia-600 flex-shrink-0" />
        )}

        {/* אייקון + מספר תכונות */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="size-3.5" />
          <span className="text-xs font-medium">{attributes.length}</span>
        </div>

        {/* תצוגת Badges */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {displayAttributes.map((attr, index) => {
            const isGlobal = attr.id && attr.id !== 0;

            return (
              <Chip
                key={attr.id || attr.name || index}
                size="sm"
                variant="solid"
                className="!text-xs shadow-sm"
                classNames={{
                  base: "bg-slate-100 dark:bg-slate-600 opacity-100 !rounded-sm !text-xs shadow-sm dark:shadow-xl h-5",
                  content: "dark:text-slate-300 !text-xs",
                }}
                title={`${attr.name}${isGlobal ? " (Global)" : " (Product)"}`}
              >
                {attr.name}
              </Chip>
            );
          })}

          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              +{remainingCount}
            </span>
          )}
        </div>
      </div>

      {/* מודל */}
      {safeProduct && (
        <ManageVariationsModal
          product={safeProduct}
          mode="attributes-only"
          showTour={false}
          isOpen={isModalOpen}
          onOpenChange={handleModalOpenChange}
        />
      )}
    </>
  );
};

export default AttributesDisplay;
