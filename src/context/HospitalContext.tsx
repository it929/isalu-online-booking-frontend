import React, { createContext, useContext } from "react";

const HospitalContext = createContext<any>(null);

export const HospitalProvider = ({ children, value }: { children: React.ReactNode; value: any }) => {
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
};

export const useHospital = () => useContext(HospitalContext);
