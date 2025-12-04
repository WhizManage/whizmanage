import { createContext, useContext, useState } from 'react';

const States = createContext();

export const ContextProvider = ({ children }) => {
	return (
		<States.Provider
			value={{
			}}
		>
			{children}
		</States.Provider>
	);
};

export const useGlobalContext = () => useContext(States);
