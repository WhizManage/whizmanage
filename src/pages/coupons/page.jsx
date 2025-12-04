import React, { useEffect } from "react";
import { columns } from "./_components/table/Columns";
import { DataTable } from "./_components/table/DataTable";

import { getApi, postApi } from "/src/services/services";
import { RefreshCcw } from "lucide-react";
import { __ } from '@wordpress/i18n';
import { CouponsContextProvider } from "../../context/CouponsContext";


export const initialColumnOrder = [
  "select",
  "code",
  "discount_type",
  "amount",
  "product_ids",
  "excluded_product_ids",
  "product_categories",
  "excluded_product_categories",
  "usage_limit",
  "date_expires",
  "status",
  "description",
  "individual_use",
  "exclude_sale_items",
  "free_shipping",
  "email_restrictions",
  "minimum_spend",
  "maximum_spend",
  "date"
];

export const initialColumnSizing = {
  select: 50,
  code: 150,
  status: 150,
  date: 150, // Note: The size definition used 'date_created_gmt' in columnSizes, but the accessorKey is 'date_created'. Using the default 150.
  discount_type: 150,
  amount: 150,
  minimum_spend: 150,
  maximum_spend: 150,
  description: 150,
  product_ids: 150,
  excluded_product_ids: 150,
  product_categories: 150,
  excluded_product_categories: 150,
  email_restrictions: 150,
  usage_limit: 150,
  date_expires: 150,
  free_shipping: 150,
  individual_use: 150,
  exclude_sale_items: 150,
};

export const initialReservedData = {
  select: true,
  code: true,
  discount_type: true,
  amount: true,
  minimum_spend: true,
  maximum_spend: true,
  product_ids: true,
  excluded_product_ids: true,
  product_categories: true,
  excluded_product_categories: true,
  usage_limit: true,
  date_expires: true,
  status: true,
  description: true,
  individual_use: false,
  exclude_sale_items: false,
  free_shipping: false,
  email_restrictions: true,
  date: true
};

function CouponsPage() {
  const [data, setData] = React.useState(window.listCoupons);
  const [dataProducts, setDataProducts] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTrash, setIsTrash] = React.useState(false);
  const [countRefresh, setCountRefresh] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState("");
  const [loadingProgress, setLoadingProgress] = React.useState(10);


   

  const updatedReservedData =
    // metaDataColumns.reduce(
    //   (acc, key) => {
    //     acc[key] = false;
    //     return acc;
    //   },
    { ...initialReservedData };
  // );

  const dataColumnsToDisplay = window.getWhizmanage.find((column) => column.name === "coupons_visible_columns")?.reservedData || null;
  const dataOrder = window.getWhizmanage.find((column) => column.name === "coupons_columns_order")?.reservedData || null;

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

  const [columnsToVisible, setColumnsToVisible] = React.useState(() => {
    if (dataColumnsToDisplay) {
      const updatedObject = mergeObjects(dataColumnsToDisplay, initialReservedData);
      return updatedObject;
    } else {
      return updatedReservedData;
    }
  });

  const combinedColumnOrder =
    // mergeArrays(
    initialColumnOrder;
  // , metadataColumnsToDisplay
  // );


  const [columnOrder, setColumnOrder] = React.useState(() => {
    if (dataOrder) {
      const updatedArray = mergeArrays(dataOrder, combinedColumnOrder);
      const filterArray = updatedArray.filter((value) =>
        combinedColumnOrder.includes(value)
      );
      return filterArray;
    } else {
      return combinedColumnOrder;
    }
  });

  React.useEffect(async () => {
    const fetchCurrency = async () => {
      const url = window.siteUrl + "/wp-json/wc/v3/system_status/";
      const response = await getApi(url);
      window.currency = response.data.settings.currency_symbol;
    };
    fetchCurrency();
  }, []);

  React.useEffect(async () => {
    // const initialUrl = `${window.siteUrl}/wp-json/wc/v3/coupons`;
    // const firstPageResponse = await getApi(initialUrl);
    //  console.log(firstPageResponse.data);
    console.log(window.listCoupons);
  }, []);

  useEffect(() => {
    window.listProducts = []
    const fetchDataProducts = async () => {
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000; // מספר המוצרים לטעינה בכל בקשה
      let allProducts = [];
      let currentPage = 1;

      try {
        while (true) {
          // קריאה ל-API עם עמוד וגודל עמוד
          const resProduct = await getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
          const parseProducts = JSON.parse(resProduct.data);
          // שטח את המוצרים ואת תתי-המוצרים שלהם
          const flattenedProducts = parseProducts.flatMap((product) => [
            product,
            ...(product.subRows || []),
          ]);

          // הוספת מוצרים למערך הכללי
          allProducts = [...allProducts, ...flattenedProducts];

          // עדכון המידע המצטבר בכל סיבוב
          setDataProducts([...allProducts]);
          window.listProducts = [...allProducts]
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

  React.useEffect(() => {
    if (countRefresh > 0) {
      fetchData();
    }
    setCountRefresh(1);
  }, [isTrash]);

  const fetchData = async (loading) => {
    if (!isTrash) {
      if (!loading) {
        setIsLoading(true);
      }
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_coupons/`;
      const resProduct = await getApi(url);
      setData(JSON.parse(resProduct.data));
      setIsLoading(false);
    } else if (isTrash) {
      setIsLoading(true);
      const initialUrl = `${window.siteUrl}/wp-json/wc/v3/coupons?status=trash&page=1&per_page=100`;
      const firstPageResponse = await getApi(initialUrl);
      let allData = firstPageResponse.data;
      setData([...allData]);
      setIsLoading(false);
    }
  };

  const handleEnableCoupons = async () => {
    setIsLoading(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/toggle-coupons`,
        { enable: "yes" }
      );
      if (response.data.status === "success") {
        window.statusCoupons = "yes";
      }
    } catch (error) {
      console.error("Failed to enable coupons:", error);
    }
    setIsLoading(false);
  };

  if (window.statusCoupons !== "yes") {
    return (
      <div className="max-w-full overflow-x-auto overflow-hidden min-h-full">
        <div className="text-center w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-4 p-4">
          <div className="flex flex-col items-center justify-center">
            <p className="text-xl font-semibold text-muted-foreground">
              {__("Coupons are currently disabled.", "whizmanage")}
            </p>
            <p className="text-lg text-muted-foreground">
              {__(
                "Enable them to allow customers to apply coupon codes from the cart and checkout pages.",
                "whizmanage"
              )}
            </p>
          </div>
          <button
            onClick={handleEnableCoupons}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-slate-100 font-semibold text-base py-2 px-4 rounded w-fit flex gap-2"
          >
            <span>
              {isLoading && (
                <RefreshCcw className="text-white w-5 h-5 animate-spin" />
              )}
            </span>
            <span>{__("Enable Coupons", "whizmanage")}</span>
          </button>
        </div>
      </div>
    );
  } else
    return (
      <div className="max-w-full overflow-x-auto overflow-hidden min-h-full">
   
          <CouponsContextProvider data={data} setData={setData} dataProducts={dataProducts}>
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
              dataProducts={dataProducts}
            />
          </CouponsContextProvider>
      </div>
    );
}

export default CouponsPage;
