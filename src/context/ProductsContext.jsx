import { createContext, useContext, useState } from 'react';

const States = createContext();

export const ProductsContextProvider = ({ children, data, setData, coupons, setCoupons ,dataProducts,isTableImport, setIsTableImport}) => {

	return (
		<States.Provider
			value={{
				data,
				setData,
				dataProducts,
				isTableImport,
				setIsTableImport
			}}
		>
			{children}
		</States.Provider>
	);
};

export const useProductsContext = () => useContext(States);
