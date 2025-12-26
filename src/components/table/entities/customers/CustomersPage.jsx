// src/components/pages/table/customers/CustomersPage.jsx
import EntityDataTableContainer from "@components/table/containers/EntityDataTableContainer";
import { customersConfig } from "@components/table/entities/customers/customers.config.js";

export default function CustomersPage() {
  return <EntityDataTableContainer entityConfig={customersConfig} />;
}
