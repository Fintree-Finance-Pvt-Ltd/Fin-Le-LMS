import toast from "react-hot-toast";


const API_URL =
  import.meta.env.VITE_API_URL;



let sessionExpired = false;



export const apiFetch = async (
  path,
  options = {}
) => {


  const {
    skipLoader = false,
    ...fetchOptions
  } = options;



  let loaderTimer = null;

  let loaderVisible = false;



  try {



    if(!skipLoader){


      loaderTimer =
        setTimeout(()=>{


          loaderVisible = true;


          window.dispatchEvent(
            new Event("show-loader")
          );


        },500);


    }





    const response =
      await fetch(

        `${API_URL}${path}`,

        {


          ...fetchOptions,


          headers:{


            ...(fetchOptions.body && {

              "Content-Type":
              "application/json"

            }),


            ...fetchOptions.headers,


          },


          credentials:"include",

        }

      );






    let data = {};



    const contentType =
      response.headers.get(
        "content-type"
      );



    if(
      contentType?.includes(
        "application/json"
      )
    ){

      data =
        await response.json();

    }







    // SESSION EXPIRED
if(response.status === 401){


  const isLoginPage =
    window.location.pathname === "/login";


  if(!isLoginPage){


    toast.error(
      "Session expired. Please login again",
      {
        id:"session-expired"
      }
    );


    setTimeout(()=>{

      window.location.href="/login";

    },1500);


  }



  throw new Error(
    "Session expired"
  );


}

    // FORBIDDEN

    if(response.status === 403){


      toast.error(
        "You don't have permission to perform this action"
      );


      throw new Error(
        "Unauthorized"
      );

    }







    if(!response.ok){



      const error =
        new Error(

          data?.message ||
          "Something went wrong"

        );



      error.status =
        response.status;



      error.response =
        data;



      throw error;


    }





    return data;




  }



  catch(error){



    if(
      error instanceof TypeError
    ){


      toast.error(
        "Network error. Please check your internet connection"
      );


    }



    throw error;



  }



  finally{


    clearTimeout(
      loaderTimer
    );



    if(loaderVisible){


      window.dispatchEvent(
        new Event("hide-loader")
      );


    }


  }


};