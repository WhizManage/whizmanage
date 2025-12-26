import { useState, useCallback } from "react";

export function useTableData(initialData = [], config = {}) {
  const [data, setData] = useState(initialData);
  const [selectedRows, setSelectedRows] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  const handleRowSelect = useCallback((rowId) => {
    setSelectedRows((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  const handleToggleGroup = useCallback((groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const handleToggleAllGroups = useCallback(() => {
    const allGroupIds = data
      .filter((item) => item.subRows && item.subRows.length > 0)
      .map((item) => item.id);

    const allExpanded = allGroupIds.every((id) => expandedGroups[id]);
    const newState = {};
    allGroupIds.forEach((id) => {
      newState[id] = !allExpanded;
    });
    setExpandedGroups(newState);
  }, [data, expandedGroups]);

  const handleCollapseAllGroups = useCallback(() => {
    setExpandedGroups({});
  }, []);

  const handleRowsReorder = useCallback((oldIndex, newIndex) => {
    setData((prev) => {
      const newData = [...prev];
      const [moved] = newData.splice(oldIndex, 1);
      newData.splice(newIndex, 0, moved);
      return newData;
    });
  }, []);

  const handleDataUpdate = useCallback((id, updates) => {
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  return {
    data,
    setData,
    selectedRows,
    expandedGroups,
    actions: {
      onRowSelect: handleRowSelect,
      onClearSelection: handleClearSelection,
      onToggleGroup: handleToggleGroup,
      onToggleAllGroups: handleToggleAllGroups,
      onCollapseAllGroups: handleCollapseAllGroups,
      onRowsReorder: handleRowsReorder,
      onDataUpdate: handleDataUpdate,
    },
  };
}
