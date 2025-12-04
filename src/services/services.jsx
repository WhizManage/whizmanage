import axios from "axios";

export const getApi = (url) => {
  try {
    const response = axios.get(url, {
      headers: {
        "X-WP-Nonce": window.rest,
      },
    });
    return response;
  } catch (error) {
    return console.log("Error fetching products", error);
  }
};

export const putApi = (url, data) => {
  try {
    if (!window.whizmanagePro) {
      const response = axios.put(url, data, {
        headers: {
          "X-WP-Nonce": window.rest,
        },
      });
      return response;
    }else{
      alert("License problem Please check if the license is active")
    }
  } catch (error) {
    return console.log("Error fetching products", error);
  }
};

export const postApi = (url, data) => {
  try {
    if (!window.whizmanagePro) {
      const response = axios.post(url, data, {
        headers: {
          "X-WP-Nonce": window.rest,
        },
      });
      return response;
    }else{
      alert("License problem Please check if the license is active")
    }
  } catch (error) {
    return console.log("Error fetching products", error);
  }
};

export const deleteApi = (url) => {
  try {
    if (!window.whizmanagePro) {
      const response = axios.delete(url, {
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": window.rest,
        },
        params: {
          force: true,
        },
      });
      return response;
    }else{
      alert("License problem Please check if the license is active")
    }
  } catch (error) {
    return console.log("Error fetching products", error);
  }
};

export const getApiOut = (url) => {
  try {
    const response = axios.get(url);
    return response
  } catch (error) {
    return console.log("Error fetching products", error)
  }
}


export const getApiLice = async (url, onOpen) => {
  try {
    return await axios.get(url
    );
  } catch (error) {
    console.error("An error occurred:", error.code);
    if (error.code != "ERR_NETWORK") {
      onOpen();
    }
    throw error;
  }
}


export const batchUpdateApi = async (endpoint, items, options = {}) => {
  const {
    batchSize = 100, 
    operation = 'update', 
    headers = {},
  } = options;

  const baseUrl = `${window.siteUrl}/wp-json/wc/v3/`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-WP-Nonce': window.rest,
    ...headers
  };

  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const results = [];
  const errors = [];

  try {
    for (const batch of batches) {
      const payload = { [operation]: batch };
      
      const response = await axios.post(
        baseUrl + endpoint,
        payload,
        { headers: defaultHeaders }
      );

      if (response.data[operation]) {
        results.push(...response.data[operation]);
        
        const batchErrors = response.data[operation].filter(item => item?.error);
        if (batchErrors.length > 0) {
          errors.push(...batchErrors);
        }
      }
    }

    return {
      success: true,
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    };

  } catch (error) {
    console.error('Batch update failed:', error);
    return {
      success: false,
      error: error?.response?.data?.message || error.message || 'Unknown error occurred',
      results: [],
      errors: []
    };
  }
};


export const batchUpdateProducts = async (products, options = {}) => {
  if (window.whizmanagePro) {
    alert("License problem Please check if the license is active");
    return {
      success: false,
      error: "License problem",
      results: [],
      errors: []
    };
  }

  return await batchUpdateApi('products/batch', products, {
    ...options,
    operation: 'update'
  });
};



export const batchUpdateCoupons = async (coupons, options = {}) => {
  if (window.whizmanagePro) {
    alert("License problem Please check if the license is active");
    return {
      success: false,
      error: "License problem", 
      results: [],
      errors: []
    };
  }

  return await batchUpdateApi('coupons/batch', coupons, {
    ...options,
    operation: 'update'
  });
};

