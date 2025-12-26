// src/components/table/products/components/InventoryDisplay.jsx
import { getInventoryConfig, getInventoryBadgeClasses } from "@/data/inventoryStyles";
import { __ } from "@wordpress/i18n";

const InventoryDisplay = ({ value, row }) => {
  // שילוב נתונים מ-value (accessorFn) ומ-row.original עבור שדות נוספים כמו type
  const originalData = row?.original || {};
  const inventoryData = value || {};

  // מיזוג הנתונים - value מכיל את השדות המעודכנים, originalData מכיל שדות נוספים כמו type
  const data = {
    ...originalData,
    ...inventoryData,
  };

  if (!data || Object.keys(data).length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const productType = data.type;
  if (productType === "external") {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const { manage_stock, stock_quantity } = data;
  const config = getInventoryConfig(data);
  const classes = getInventoryBadgeClasses(data);

  const label = __(String(config.label ?? ""), "whizmanage") || config.label;

  if (productType === "grouped") {
    return (
      <div className={classes.container}>
        <div className={classes.dot} />
        <span className={classes.text}>{label}</span>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.dot} />
      <span className={classes.text}>
        {manage_stock ? stock_quantity : label}
      </span>
    </div>
  );
};

export default InventoryDisplay;
