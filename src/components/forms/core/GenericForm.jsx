// src/components/forms/core/GenericForm.jsx

 import { __ } from "@wordpress/i18n";
import AdditionalTaxonomiesInput from "./fields/AdditionalTaxonomiesInput";
import AddressInput from "./fields/AddressInput";
import ConditionsField from "./fields/ConditionsField";
import CouponCodeInput from "./fields/CouponCodeInput";
import CustomFieldsInput from "./fields/CustomFieldsInput";
import CustomFieldsKeyValueInput from "./fields/CustomFieldsKeyValueInput";
import CustomerSelectInput from "./fields/CustomerSelectInput";
import DateRangeInput from "./fields/DateRangeInput";
import DateTimeInput from "./fields/DateTimeInput";
import DownloadableInput from "./fields/DownloadableInput";
import EmailsInput from "./fields/EmailsInput";
import FiltersField from "./fields/FiltersField";
import ImageInput from "./fields/ImageInput";
import InventoryInput from "./fields/InventoryInput";
import JsonInput from "./fields/JsonInput";
import MultiSelectInput from "./fields/MultiSelectInput";
import NumberInput from "./fields/NumberInput";
import OrderLineItemsInput from "./fields/OrderLineItemsInput";
import ProductIdsInput from "./fields/ProductIdsInput";
import ProductTypeInput from "./fields/ProductTypeInput";
import SelectInput from "./fields/SelectInput";
import SwitchInput from "./fields/SwitchInput";
import TextInput from "./fields/TextInput";
import TextareaInput from "./fields/TextareaInput";
import TypeWithDiscountSettings from "./fields/TypeWithDiscountSettings";
import WysiwygInput from "./fields/WysiwygInput";

const FIELD_COMPONENTS = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  switch: SwitchInput,
  textarea: TextareaInput,
  image: ImageInput,
  wysiwyg: WysiwygInput,
  inventory: InventoryInput,
  json: JsonInput,
  conditions: ConditionsField,
  filters: FiltersField,
  multiselect: MultiSelectInput,
  daterange: DateRangeInput,
  downloadable: DownloadableInput,
  customfields: CustomFieldsInput,
  producttype: ProductTypeInput,
  typewithsettings: TypeWithDiscountSettings,
  additionaltaxonomies: AdditionalTaxonomiesInput,
  emails: EmailsInput,
  productids: ProductIdsInput,
  couponcode: CouponCodeInput,
  customerselect: CustomerSelectInput,
  address: AddressInput,
  orderlineitems: OrderLineItemsInput,
  customfieldskeyvalue: CustomFieldsKeyValueInput,
  datetime: DateTimeInput, // ✅ חדש
};

/**
 * GenericForm
 * מעוצב בדיוק כמו הטופס הישן - 2 עמודות עם קבוצות
 */
export default function GenericForm({ groups = [] }) {
   
  if (!groups || groups.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No form groups found. Make sure you pass a valid config to
        GenericItemModal.
      </div>
    );
  }

  const renderField = (field) => {
    const Component = FIELD_COMPONENTS[field.type] || TextInput;

    return (
      <Component
        key={field.name}
        {...field}
        label={field.label ? __(field.label, "whizmanage") : field.label}
        placeholder={field.placeholder ? __(field.placeholder, "whizmanage") : field.placeholder}
        helperText={field.helperText ? __(field.helperText, "whizmanage") : field.helperText}
      />
    );
  };

  // חלוקה לשתי עמודות
  const midPoint = Math.ceil(groups.length / 2);
  const leftGroups = groups.slice(0, midPoint);
  const rightGroups = groups.slice(midPoint);

  const renderGroup = (group, idx) => (
    <div key={group.title || idx} className="flex flex-col gap-4">
      {/* כותרת הקבוצה - בדיוק כמו בטופס הישן */}
      {group.title && (
        <div className="flex items-center gap-x-2">
          {group.icon && (
            <div className="p-2 rounded-md bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 dark:from-fuchsia-900/40 dark:to-fuchsia-800/40 shadow-sm dark:shadow-lg">
              <group.icon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
          )}
          <h2 className="text-xl dark:text-slate-300">{__(group.title, "whizmanage")}</h2>
        </div>
      )}

      {/* השדות של הקבוצה */}
      {group.fields?.map((field) => renderField({
        ...field,
        description: field.description ? __(field.description, "whizmanage") : field.description
      }))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1.5">
      {/* עמודה שמאלית */}
      <div className="flex flex-col gap-6 overflow-auto scrollbar-whiz py-6">
        {leftGroups.map(renderGroup)}
      </div>

      {/* עמודה ימנית */}
      <div className="flex flex-col gap-6 overflow-auto scrollbar-whiz py-6">
        {rightGroups.map(renderGroup)}
      </div>
    </div>
  );
}
