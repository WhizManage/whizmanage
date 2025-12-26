// src/.../StatusDisplay.jsx (אותו קובץ קיים אצלך - רק שינוי קטן)
import { cn } from "@/lib/utils";

const StatusDisplay = ({ value, __, editOptions }) => {
  const statusKeys = editOptions?.statusKeys || {}; // 👈 מקבל כ-param
  const cls =
    statusKeys?.[value] ||
    "bg-gray-100 border-gray-300 text-gray-700"; // fallback עדין

  return (
    <div
      className={cn(
        "font-semibold px-2 py-0 border rounded-md text-sm w-fit",
        cls
      )}
    >
      {__(value || "draft", "whizmanage")}
    </div>
  );
};

export default StatusDisplay;
