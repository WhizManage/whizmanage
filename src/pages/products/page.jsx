import { useState, useEffect } from "react";
import { columns, metaDataColumns } from "./_components/table/Columns";
import { DataTable } from "./_components/table/DataTable";
import { ProductsContextProvider } from "../../context/ProductsContext";
import { getApi, postApi } from "/src/services/services";

export const initialColumnOrder = [
  "select",
  "expand",
  "name",
  "status",
  "image",
  "price",
  "description",
  "short_description",
  "type",
  "attributes",
  "tags",
  "categories",
  "date_on_sale_from",
  "downloadable",
  "shipping_class",
  "sold_individually",
  "stock_quantity",
  "weight",
  "sku",
  "global_unique_id",
  "dimensions",
  "meta_data",
  "images",
  "upsell_ids",
  "post_password",
  "date_created",
  "menu_order",
  "yoast",
  "featured",
  "slug",
  "purchase_note",
];

export const initialColumnSizing = {
  select: 50,
  expand: 50,
  image: 150,
  name: 150,
  status: 150,
  description: 150,
  short_description: 150,
  date_created: 150,
  attributes: 150,
  type: 150,
  post_password: 150,
  tags: 150,
  categories: 150,
  price: 150,
  date_on_sale_from: 150,
  downloadable: 150,
  sold_individually: 150,
  shipping_class: 150,
  stock_quantity: 150,
  weight: 150,
  sku: 150,
  global_unique_id: 150,
  dimensions: 150,
  meta_data: 150,
  upsell_ids: 150,
  images: 150,
  menu_order: 150,
  yoast: 150,
  featured: 130,
  slug: 150,
  purchase_note: 150,
};

export const initialReservedData = {
  select: true,
  expand: true,
  name: true,
  status: true,
  image: true,
  price: true,
  description: true,
  short_description: true,
  type: true,
  attributes: false,
  tags: true,
  categories: true,
  date_on_sale_from: false,
  downloadable: false,
  shipping_class: true,
  sold_individually: true,
  stock_quantity: true,
  weight: false,
  sku: true,
  global_unique_id: false,
  dimensions: false,
  meta_data: true,
  images: true,
  upsell_ids: true,
  post_password: true,
  date_created: true,
  menu_order: false,
  featured: true,
  slug: true,
  yoast: true,
   purchase_note: true,
};

function ProductsPage() {
  const [data, setData] = useState(
    window.listProduct ? window.listProduct : []
  );

  
  const [isLoading, setIsLoading] = useState(false);
  const [isTrash, setIsTrash] = useState(false);
  const [countRefresh, setCountRefresh] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(10);

  const [isTableImport, setIsTableImport] = useState(false);
  const taxonomies = window.listTaxonomies?.map((item) => item.name);

  const updatedReservedData = (metaDataColumns, taxonomies) => {
    const allKeys = [...metaDataColumns, ...taxonomies];

    return allKeys.reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      { ...initialReservedData } // שימור האובייקט המקורי אם קיים
    );
  };

  const result = updatedReservedData(metaDataColumns, taxonomies);
  const dataColumnsToDisplay =
    window.getWhizmanage.find((column) => column.name === "products_visible_columns")
      ?.reservedData || null;
  const allColumns =
    window.getWhizmanage.find((column) => column.name === "products_columns_order")?.reservedData ||
    null;

  const mergeObjects = (obj1, obj2) => {
    const updatedObject = { ...obj1 };

    for (const key in obj2) {
      if (!updatedObject.hasOwnProperty(key)) {
        updatedObject[key] = obj2[key];
      }
    }

    return updatedObject;
  };

  const mergeArrays = (...arrays) => {
    const mergedSet = new Set(arrays.flat()); // איחוד כל המערכים למערך אחד ואז לסט
    return Array.from(mergedSet); // המרה חזרה למערך
  };

  const [columnsToVisible, setColumnsToVisible] = useState(() => {
    if (dataColumnsToDisplay) {
      const updatedObject = mergeObjects(dataColumnsToDisplay, result);
      return updatedObject;
    } else {
      return result;
    }
  });

  const combinedColumnOrder = mergeArrays(
    initialColumnOrder,
    metaDataColumns,
    taxonomies
  );

  const [columnOrder, setColumnOrder] = useState(() => {
    if (allColumns) {
      const updatedArray = mergeArrays(allColumns, combinedColumnOrder);
      const filterArray = updatedArray.filter((value) =>
        combinedColumnOrder.includes(value)
      );
      return filterArray;
    } else {
      return combinedColumnOrder;
    }
  });

  useEffect(async () => {
    // fetchColumnsToVisible();
    fetchCurrency();
    // const result = await fetch(
    //   `${window.siteUrl}/wp-json/whizmanage/v1/history`
    // );
    // const response = await result.json();

    // console.log(response);
    // const initialUrl = `${window.siteUrl}/wp-json/wc/v3/products/17158/variations`;
    // const firstPageResponse = await getApi(initialUrl);
    //  console.log(firstPageResponse);
    // const initialUrl = `${window.siteUrl}/wp-json/wc/v3/products/attributes/212/terms`;
    //   const firstPageResponse = await getApi(initialUrl);
    //    console.log(firstPageResponse);
  }, []);

  useEffect(() => {
    fetchData();
    // }
    setCountRefresh(1);
  }, [isTrash]);

  const fetchData = async (loading, productIds) => {
    if (!isTrash) {
      // if (!loading) {
      //   setIsLoading(true);
      // }

      if (productIds?.length > 0) {
        const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
        const resProduct = await postApi(url, {
          product_ids: productIds,
        });
        setData((prevData) => {
          const newData = JSON.parse(resProduct.data); // הנתונים החדשים מהתגובה
          // יצירת מערך מעודכן, מחליפים איברים עם מזהים תואמים או מוסיפים חדשים
          const updatedData = prevData.map((item) => {
            const updatedItem = newData.find(
              (newItem) => newItem.id === item.id
            );
            return updatedItem ? updatedItem : item; // מחליפים אם יש התאמה, אחרת משאירים
          });
          // הוספת איברים חדשים שאינם קיימים במערך הקיים
          const newItems = newData.filter(
            (newItem) => !prevData.some((item) => item.id === newItem.id)
          );

          return [...updatedData, ...newItems];
        });

        setIsLoading(false);
      } else {
        // const  totalProduct=window.totalProducts;
        //   const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
        //   const resProduct = await getApi(url);
        //   setData(
        //     JSON.parse(resProduct.data));
        //   setIsLoading(false);
        const totalProduct = window.totalProducts; // מספר המוצרים הכולל
        const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
        const perPage = 1500; // מספר המוצרים שנטען בכל בקשה
        let allProducts = [];
        let currentPage = 1;
        if (countRefresh == 0) {
          allProducts = window.listProduct ? window.listProduct : [];
          currentPage = 2;
        }
        try {
          while (allProducts.length < totalProduct) {
            // קריאה ל-API עם page ו-perPage
            const res = await getApi(
              `${url}?page=${currentPage}&perPage=${perPage}`
            );
            // console.log(JSON.parse(res.data));

            const parsedData = JSON.parse(res.data);

            // הוספת המוצרים שהוחזרו למערך הכולל
            allProducts = [...allProducts, ...parsedData];

            // עדכון המידע ב-setData בכל סיבוב
            setData([...allProducts]);

            // עצור אם אין מוצרים נוספים
            if (parsedData.length < perPage) {
              break;
            }

            currentPage++; // מעבר לעמוד הבא
          }
        } catch (error) {
          console.error("Failed to fetch products:", error);
        } finally {
          setIsLoading(false); // עצירת מצב טעינה
        }
      }
    } else if (isTrash) {
      setIsLoading(true);
      const initialUrl = `${window.siteUrl}/wp-json/wc/v3/products?status=trash&page=1&per_page=100`;
      const firstPageResponse = await getApi(initialUrl);
      let allData = firstPageResponse.data;
      setData([...allData]);
      setIsLoading(false);
    }
  };

  // const fetchColumnsToVisible = async () => {
  //   const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/y";
  //   const response = await getApi(url);
  //   setColumnsToVisible(window.getWhizmanage[0].reservedData);
  // };

  const fetchCurrency = async () => {
    const url = window.siteUrl + "/wp-json/wc/v3/system_status/";
    const response = await getApi(url);
    window.currency = response.data.settings?.currency_symbol;
  };

  return (
    <div className="max-w-full overflow-x-auto overflow-hidden min-h-full">
      <ProductsContextProvider
        data={data}
        setData={setData}
        isTableImport={isTableImport}
        setIsTableImport={setIsTableImport}
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
          isTableImport={isTableImport}
        />
      </ProductsContextProvider>
    </div>
  );
}

export default ProductsPage;
