import React, { createContext, useContext } from 'react';

// יצירת הקשר (Context) לטבלה
const TableContext = createContext();

export const useTableContext = () => {
  return useContext(TableContext);
};

export const TableProvider = ({ table, children }) => {
  return (
    <TableContext.Provider value={table}>
      {children}
    </TableContext.Provider>
  );
};
