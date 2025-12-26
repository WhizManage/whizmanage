// src/components/table/products/components/RichTextDisplay.jsx
import CustomTooltip from "@/components/ui/nextUI/Tooltip";

const RichTextDisplay = ({ value, column, t }) => {
  // פונקציה להסרת תגיות HTML
  const HTMLToText = (html) => {
    if (!html) return "";
    const temp = document.createElement( "div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const plainText = HTMLToText(value);
  
  if (!plainText || plainText.trim() === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  // 🔥 אם הטקסט ארוך מ-20 תווים, הצג Tooltip עם HTML מעוצב
  if (plainText.length > 20) {
    const truncated = plainText.substring(0, 20) + "...";
    
    return (
      <CustomTooltip
        title={column?.columnDef?.header || __("Content", "whizmanage")}
        description={
          <div 
            className="prose prose-sm dark:prose-invert max-w-md max-h-96 overflow-y-auto scrollbar-whiz p-2"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        }
        contentClassName="max-w-2xl"
        instantClose
      >
        <div className="line-clamp-2 text-sm cursor-help">
          {truncated}
        </div>
      </CustomTooltip>
    );
  }

  // אם הטקסט קצר, הצג ישירות
  return (
    <div className="line-clamp-2 text-sm">
      {plainText}
    </div>
  );
};

export default RichTextDisplay;