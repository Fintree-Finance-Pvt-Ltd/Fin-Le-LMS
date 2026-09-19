import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import { authService } from "../services/authService";


const AuthContext = createContext(null);



export function AuthProvider({
  children,
}) {


  const [user, setUser] =
    useState(null);


  const [loading, setLoading] =
    useState(true);



  // ====================================================
  // LOAD CURRENT USER
  // ====================================================

  const refreshUser = async () => {

    const data =
      await authService.getMe();


    setUser(data.user);


    return data.user;

  };




  // ====================================================
  // CHECK SESSION
  // ====================================================

  useEffect(() => {


    const loadUser = async () => {

      try {


        await refreshUser();


      }
      catch(error){


        setUser(null);


      }
      finally{


        setLoading(false);


      }

    };


    loadUser();


  }, []);





  // ====================================================
  // LOGIN
  // ====================================================


  const login = async(credentials)=>{


    if(
      !credentials ||
      typeof credentials !== "object"
    ){

      throw new Error(
        "Invalid login credentials"
      );

    }



    const {
      email,
      password
    } = credentials;



    if(!email || !password){

      throw new Error(
        "Email and password are required"
      );

    }




    await authService.login({

      email:email.trim(),

      password,

    });




    const currentUser =
      await refreshUser();




    return currentUser;


  };





  // ====================================================
  // LOGOUT
  // ====================================================


  const logout = async()=>{


    try{


      await authService.logout();



      toast.success(
        "Logout successful",
        {
          icon:"👋"
        }
      );



    }
    catch(error){



      toast.error(

        error.message ||
        "Logout failed"

      );



    }
    finally{


      setUser(null);


    }


  };





  return (

    <AuthContext.Provider

      value={{

        user,

        loading,

        login,

        logout,

        refreshUser,

      }}

    >

      {children}


    </AuthContext.Provider>

  );

}





export const useAuth =()=>{


  const context =
    useContext(AuthContext);



  if(!context){


    throw new Error(
      "useAuth must be used inside AuthProvider"
    );


  }



  return context;


};