import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";


const LoadingContext =
  createContext();



export function LoadingProvider({
  children,
}) {


  const [loading,setLoading] =
    useState(false);



  useEffect(()=>{


    const showLoader = () => {
      setLoading(true);
    };


    const hideLoader = () => {
      setLoading(false);
    };


    window.addEventListener(
      "show-loader",
      showLoader
    );


    window.addEventListener(
      "hide-loader",
      hideLoader
    );


    return ()=>{

      window.removeEventListener(
        "show-loader",
        showLoader
      );


      window.removeEventListener(
        "hide-loader",
        hideLoader
      );

    };


  },[]);



  return (

    <LoadingContext.Provider
      value={{
        loading
      }}
    >

      {children}

    </LoadingContext.Provider>

  );

}



export const useLoading = ()=>{

  return useContext(
    LoadingContext
  );

};