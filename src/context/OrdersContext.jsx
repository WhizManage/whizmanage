import { createContext, useContext, useState } from 'react';

const States = createContext();

export const OrdersContextProvider = ({ children, data, setData, ordersData,products}) => {

    return (
        <States.Provider
            value={{
                data,
                setData,
                ordersData,
                products
            }}
        >
            {children}
        </States.Provider>
    );
};

export const useOrdersContext = () => useContext(States);
