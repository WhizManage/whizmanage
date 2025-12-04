const taxonomyLabel = (taxonomy, index) => ({
    column: taxonomy.name,
    enable: false,
    defaultValues: [""],
    label: taxonomy.label
})
const showTaxonomies = window.listTaxonomies?.map(taxonomyLabel);

export const defaultFilters = [
    { column: "status", enable: true, defaultValues: [""], label: "status" },
    { column: "tags", enable: true, defaultValues: [""], label: "tags" },
    { column: "categories", enable: true, defaultValues: [""], label: "categories" },
    { column: "type", enable: true, defaultValues: [""], label: "type" },
    { column: "downloadable", enable: true, defaultValues: [""], label: "Downloadable" },
    ...showTaxonomies
]

export const couponFilters = [
    { column: "discount_type", enable: true, defaultValues: [""], label: "Discount type" },
    { column: "status", enable: true, defaultValues: [""], label: "status" },
]

export const orderFilters = [
    { column: "status", enable: true, defaultValues: [""], label: "status" },
    { column: "payment_method", enable: true, defaultValues: [""], label: "Payment method" },
];