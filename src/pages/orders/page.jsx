import { useState, useEffect } from "react";
import { columns } from "./_components/table/Columns";
import { DataTable } from "./_components/table/DataTable";

import { getApi } from "/src/services/services";
import { OrdersContextProvider } from "../../context/OrdersContext";
const columnsCustomOrder = Array.isArray(window?.listOrdersMetaData)
  ? window.listOrdersMetaData
  : [];

export const initialColumnOrder = [
  "select",
  "expand",
  "order",
  "date_created",
  "status",
  "total",
  "payment_method",
  "version",
  "created_via",
  "date_modified",
  "tax",
  "customer_note",
  "note",
  "shipping",
  "billing",
  "shipping_phone",
  "shipping_name",
  "shipping_company",
  "shipping_country",
  "shipping_city",
  "shipping_postcode",
  "shipping_address_1",
  "shipping_address_2",
  "shipping_state",
  "billing_email",
  "billing_phone",
  "billing_name",
  "billing_company",
  "billing_country",
  "billing_city",
  "billing_address_1",
  "billing_address_2",
  "billing_postcode",
  "billing_state",
  "order_summary",
  "actions",
  "items",
  "source",
  ...columnsCustomOrder,
];
const sizeCustomOrder = columnsCustomOrder.reduce((acc, key) => {
  acc[key] = 150;
  return acc;
}, {});

export const initialColumnSizing = {
  select: 50,
  expand: 50,
  order: 130,
  payment_method: 190,
  status: 120,
  date_created: 150,
  total: 100,
  version: 100,
  created_via: 150,
  date_modified: 150,
  tax: 100,
  customer_note: 170,
  note: 150,
  shipping: 200,
  billing: 200,
  shipping_phone: 150,
  shipping_name: 160,
  shipping_company: 150,
  shipping_country: 150,
  shipping_city: 150,
  shipping_address_1: 180,
  shipping_address_2: 180,
  shipping_postcode: 120,
  shipping_state: 100,
  billing_email: 200,
  billing_phone: 150,
  billing_name: 160,
  billing_company: 150,
  billing_country: 150,
  billing_city: 150,
  billing_address_1: 180,
  billing_address_2: 180,
  billing_postcode: 120,
  billing_state: 100,
  order_summary: 170,
  items: 220,
  actions: 100,
  source: 180,
  ...sizeCustomOrder,
};

const showCustomOrder = columnsCustomOrder.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

export const initialReservedData = {
  select: true,
  expand: true,
  order: true,
  date_created: true,
  status: true,
  total: true,
  payment_method: true,
  version: false,
  created_via: false,
  date_modified: false,
  tax: true,
  customer_note: true,
  note: true,
  shipping: true,
  billing: true,
  shipping_phone: false,
  shipping_name: false,
  shipping_company: false,
  shipping_country: false,
  shipping_city: false,
  shipping_address_1: false,
  shipping_address_2: false,
  shipping_postcode: false,
  shipping_state: false,
  billing_email: false,
  billing_phone: false,
  billing_name: false,
  billing_company: false,
  billing_country: false,
  billing_city: false,
  billing_address_1: false,
  billing_address_2: false,
  billing_postcode: false,
  billing_state: false,
  order_summary: true,
  items: true,
  actions: true,
  source: true,
  ...showCustomOrder,
};

function OrdersPage() {
  const [data, setData] = useState(window.listOrders);
  const [products, setProducts] = useState([]);
  const [ordersData, setOrderData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrash, setIsTrash] = useState(false);
  const [countRefresh, setCountRefresh] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(10);

  const dataColumnsToDisplay =
    window.getWhizmanage.find((column) => column.name === "orders_visible_columns")
      ?.reservedData || null;
  const dataOrder =
    window.getWhizmanage.find((column) => column.name === "orders_columns_order")
      ?.reservedData || null;

  const mergeObjects = (obj1, obj2) => {
    const updatedObject = { ...obj1 };

    for (const key in obj2) {
      if (!updatedObject.hasOwnProperty(key)) {
        updatedObject[key] = obj2[key];
      }
    }

    return updatedObject;
  };

  const mergeArrays = (arr1, arr2) => {
    const mergedSet = new Set([...arr1, ...arr2]);
    return Array.from(mergedSet);
  };

  const [columnsToVisible, setColumnsToVisible] = useState(() => {
    if (dataColumnsToDisplay) {
      const updatedObject = mergeObjects(
        dataColumnsToDisplay,
        initialReservedData
      );
      return updatedObject;
    } else {
      return initialReservedData;
    }
  });

  const combinedColumnOrder =
    // mergeArrays(
    initialColumnOrder;
  // , metadataColumnsToDisplay
  // );

  const [columnOrder, setColumnOrder] = useState(() => {
    if (dataOrder) {
      const updatedArray = mergeArrays(dataOrder, initialColumnOrder);
      const filterArray = updatedArray.filter((value) =>
        combinedColumnOrder.includes(value)
      );
      return filterArray;
    } else {
      return combinedColumnOrder;
    }
  });

  useEffect(async () => {
    const fetchCurrency = async () => {
      const url = window.siteUrl + "/wp-json/wc/v3/system_status/";
      const response = await getApi(url);
      window.currency = response.data.settings.currency_symbol;
    };
    fetchCurrency();
  }, []);

  useEffect(() => {
    window.listProducts = [];
    const fetchDataProducts = async () => {
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000; // מספר המוצרים לטעינה בכל בקשה
      let allProducts = [];
      let currentPage = 1;

      try {
        while (true) {
          // קריאה ל-API עם עמוד וגודל עמוד
          const resProduct = await getApi(
            `${url}?page=${currentPage}&perPage=${perPage}`
          );
          const parseProducts = JSON.parse(resProduct.data);
          // שטח את המוצרים ואת תתי-המוצרים שלהם
          const flattenedProducts = parseProducts.flatMap((product) => [
            product,
            ...(product.subRows || []),
          ]);

          // הוספת מוצרים למערך הכללי
          allProducts = [...allProducts, ...flattenedProducts];

          // עדכון המידע המצטבר בכל סיבוב
          setProducts([...allProducts]);
          window.listProducts = [...allProducts];
          // עצירה אם אין מוצרים נוספים לטעינה
          if (flattenedProducts.length < perPage) {
            break;
          }
          currentPage++; // מעבר לעמוד הבא
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    // קריאה לפונקציה
    fetchDataProducts();
  }, []);

  const fetchData = async (loading, start_data, end_date) => {
    if (!isTrash) {
      if (!loading) {
        setIsLoading(true);
      }
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_orders`;
      const resOrders = await getApi(url);
      console.log(resOrders.data);
      setData(resOrders.data);
      setIsLoading(false);
    } else if (isTrash) {
      setIsLoading(true);
      const initialUrl = `${window.siteUrl}/wp-json/wc/v3/orders?status=trash&page=1&per_page=100`;
      const firstPageResponse = await getApi(initialUrl);
      let allData = firstPageResponse.data;
      setData([...allData]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (countRefresh > 0) {
      fetchData();
    }
    setCountRefresh(1);
  }, [isTrash]);

  return (
    <div className="max-w-full overflow-x-auto overflow-hidden min-h-full">
      <OrdersContextProvider
        data={data}
        setData={setData}
        ordersData={ordersData}
        products={products}
      >
        <DataTable
          columns={columns}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          fetchData={fetchData}
          isTrash={isTrash}
          setIsTrash={setIsTrash}
          columnsToVisible={columnsToVisible}
          setColumnsToVisible={setColumnsToVisible}
          loadingMessage={loadingMessage}
          loadingProgress={loadingProgress}
          columnOrder={columnOrder}
          setColumnOrder={setColumnOrder}
          ordersData={ordersData}
        />
      </OrdersContextProvider>
    </div>
  );
}

export default OrdersPage;
