// /trash/trashAdapters.js
export const makeTrashAdapters = ({
  idField = "id",
  toActive = (item) => {
    const out = { ...item };
    delete out.date_deleted;
    return out;
  },
  toTrash = (item) => {
    const out = { ...item };
    if (!out.date_deleted) out.date_deleted = new Date().toISOString();
    return out;
  },
} = {}) => ({ idField, toActive, toTrash });

export const defaultAdapters = makeTrashAdapters();
