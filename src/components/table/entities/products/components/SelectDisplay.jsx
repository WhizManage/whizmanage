// src/products/custom-edit-components/SelectDisplay.jsx

const SelectDisplay = ({ value, editOptions, t }) => {
  if (!value) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const options = editOptions?.options || [];
  
  // אם value הוא array (למקרה של multiple select)
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, index) => {
          const itemValue = typeof item === 'object' ? (item.value || item.id) : item;
          const option = options.find(opt => (opt.value || opt.id) === itemValue);
          const displayText = option ? (option.label || option.name) : itemValue;
          
          return (
            <span 
              key={index} 
              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs"
            >
              {__(displayText, "whizmanage")}
            </span>
          );
        })}
      </div>
    );
  }
  
  // single select - מצא את האופציה המתאימה לפי value
  const currentValue = typeof value === 'object' ? (value.value || value.id) : value;
  const option = options.find(opt => (opt.value || opt.id) === currentValue);
  const displayText = option ? (option.label || option.name) : currentValue;
  
  return <span>{__(displayText, "whizmanage")}</span>;
};

export default SelectDisplay;