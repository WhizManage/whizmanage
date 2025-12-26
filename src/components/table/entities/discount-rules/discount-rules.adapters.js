// src/components/table/entities/discount-rules/discount-rules.adapters.js

export const discountRulesAdapters = {
  fromApi(row) {
    const status = ["publish", "draft", "trash"].includes(row?.status)
      ? row.status
      : "draft";
    return { ...row, status };
  },
  toApi(row) {
    let status = row?.status;
    if (status === 1 || status === true) status = "publish";
    if (status === 0 || status === false) status = "draft";
    if (!["publish", "draft", "trash"].includes(status)) status = "draft";
    return { ...row, status };
  },
};
