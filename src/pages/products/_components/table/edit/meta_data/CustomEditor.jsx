import React, { useEffect, useState } from "react";
import { Input } from "@components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@components/ui/select";
import WysiwygEditor from "./WysiwygEditor";
import { Textarea } from "@components/ui/textarea";
import GalleryMetaEdit from "./GalleryMetaEdit";
import { HTMLToText } from "../../Columns";
import ImageMetaEdit from "./ImageMetaEdit";
import { __ } from '@wordpress/i18n';
import { Switch } from "@components/ui/switch";

const CustomEditor = ({ row, custom, edit }) => {
      const valueFromRow = row.original.meta_data?.find(meta => meta.key === custom.key)?.value;

    // ברירת מחדל רק לשדה title של Yoast
    let finalValue =
        (!valueFromRow || valueFromRow === "") && custom.key === "_yoast_wpseo_title"
            ? row.original?.name + " - " + (window.store_name || "") || __("No Value", "whizmanage")
            : valueFromRow ?? custom.value ?? "";

    // יצירת displayValue בהתאם לסוג
    const displayValue =
        ["gallery", "image", "media"].includes(custom.type)
            ? {
                ...custom,
                value: typeof finalValue === "object" ? finalValue : [],
            }
            : {
                ...custom,
                value: typeof finalValue === "string" ? finalValue : "",
            };

    const value = displayValue.value;


    const handleValueChange = (value) => {
        const metaIndex = row.original.meta_data.findIndex(
            (metaProduct) => metaProduct.key === custom.key
        );

        if (metaIndex > -1) {
            row.original.meta_data[metaIndex].value = value;
        } else {
            row.original.meta_data.push({
                key: custom.key,
                value,
            });
        }

        if (custom.key === '_yoast_wpseo_slug') {
            row.original.slug = newValue;
        }
    };
    if (edit) {
        switch (custom.type) {
            case "text":
                return (
                    <Input
                        type="text"
                        defaultValue={displayValue.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        className="w-full h-6 p-1 rounded-sm border !border-slate-200 dark:!border-slate-800 dark:!text-slate-200 dark:placeholder:!text-slate-200"
                        onFocus={(event) => event.target.select()}
                    />
                );

            case "date":
                const [dateValue, setDateValue] = useState(displayValue.value || "");

                useEffect(() => {
                    setDateValue(displayValue.value || ""); // עדכון הערך כאשר displayValue.value משתנה
                }, [displayValue.value]);
                return (
                    <Input
                        className="w-full"
                        type="date"
                        value={dateValue}
                        onChange={(event) => {
                            setDateValue(event.target.value); // עדכון התצוגה מידית
                            handleValueChange(event.target.value); // שליחת הערך החדש
                        }}
                    />
                );

            case "select":
                return (
                    <Select
                        defaultValue={displayValue.value}
                        onValueChange={handleValueChange}
                        className="w-full !max-h-6 p-1 rounded-sm"
                    >
                        <SelectTrigger className="w-full !max-h-8">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(custom.choices || {}).map(
                                ([value, label]) => (
                                    <SelectItem
                                        key={value}
                                        value={value}
                                        className="!max-h-6"
                                    >
                                        {label}
                                    </SelectItem>
                                )
                            )}
                        </SelectContent>
                    </Select>
                );

            case "textarea":
                return (
                    <Textarea
                        defaultValue={displayValue.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        onFocus={(event) => event.target.select()}
                        rows="2"
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:text-slate-200"
                        placeholder="Enter your text here"
                    />
                );

            case "checkbox":
                const [isCheckedBox, setIsCheckedBox] = useState(value == "1");
                return (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isCheckedBox}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setIsCheckedBox(checked);
                                handleValueChange(checked ? "1" : "0");
                            }}
                            className="mr-2"
                        />
                        <label>{custom.label}</label>
                    </div>
                );

            case "wysiwyg":
                return (
                    <WysiwygEditor
                        item={{
                            key: custom.key,
                            value: displayValue.value,
                        }}
                        handleInputChange={(key, value) => handleValueChange(value)}
                        isColumns={true}
                    />
                );

            case "gallery":
                return (
                    <GalleryMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={true}
                        isColumn={true}
                    />
                );

            case "image":
                return (
                    <ImageMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={true}
                        isColumn={true}
                    />
                );
            case "media":
                return (
                    <ImageMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={true}
                        isColumn={true}
                    />
                );
            case "switcher":
                const [isChecked, setIsChecked] = useState(displayValue.value == '1' ? true : false);
                const handleChange = () => {
                    const newValue = !isChecked
                    setIsChecked(newValue);

                    handleValueChange(newValue ? "1" : '0')
                };
                return (
                    <Switch
                        className=""
                        id="airplane-mode"
                        checked={isChecked}
                        onCheckedChange={handleChange}
                    />
                );
            default:
                return null;
        }
    } else {
        switch (custom.type) {
            case "gallery":
                return (
                    <GalleryMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={false}
                        isColumn={true}
                    />
                );

            case "image":
                return (
                    <ImageMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={false}
                        isColumn={true}
                    />
                );
            case "media":
                return (
                    <ImageMetaEdit
                        handleInputChange={(key, value) => handleValueChange(value)}
                        row={displayValue}
                        edit={false}
                        isColumn={true}
                    />
                );
            case "switcher":
                return (
                    <div className="!line-clamp-2 truncate text-wrap">
                        {displayValue.value == "1" ? __("yes", "whizmanage") : __("no", "whizmanage")}
                    </div>
                );
            default:
                return (
                    <div title={custom.label}  className="capitalize truncate description-img !line-clamp-2 text-wrap max-sm:!hidden">
                        {HTMLToText(displayValue.value)}
                    </div>
                );
        }
    }
}


export default CustomEditor;