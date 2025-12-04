import { createContext, useContext, useState } from 'react';

const States = createContext();

export const CouponsContextProvider = ({ children, data, setData, dataProducts}) => {

	return (
		<States.Provider
			value={{
				data,
				setData,
				dataProducts
			}}
		>
			{children}
		</States.Provider>
	);
};

export const useCouponsContext = () => useContext(States);
