// FeaturedCell.jsx
import { cn } from "@/lib/utils";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Star } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const FeaturedCell = ({ row, table, onUpdate }) => {
   
  const isFeatured = row.original.featured === true;

  const handleToggleFeatured = async () => {
    await onUpdate(row.original.id, "featured", !isFeatured, row.original);
  };

  return (
    <div className="flex items-center justify-center h-full w-full">
      <CustomTooltip
        title={isFeatured ? __("Remove from featured", "whizmanage") : __("Add to featured", "whizmanage")}
        instantClose
      >
        <button
          onClick={handleToggleFeatured}
          className={cn(
            "p-1 rounded-md transition-all cursor-pointer",
            "hover:scale-110 active:scale-95",
            isFeatured
              ? "text-fuchsia-600 hover:text-pink-500"
              : "text-gray-300 dark:text-gray-600 hover:text-fuchsia-400/70"
          )}
          aria-label={isFeatured ? "Remove from featured" : "Add to featured"}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-all",
              isFeatured && "fill-fuchsia-600"
            )}
          />
        </button>
      </CustomTooltip>
    </div>
  );
};

export default FeaturedCell;
