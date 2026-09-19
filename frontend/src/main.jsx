import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { LoadingProvider } from "./context/LoadingContext";

import { Toaster } from "react-hot-toast";

import "./index.css";


createRoot(
  document.getElementById("root")
).render(

  <StrictMode>

    <BrowserRouter>


      <LoadingProvider>


        <AuthProvider>


          <App />


        </AuthProvider>


      </LoadingProvider>



      <Toaster

        position="top-right"

        reverseOrder={false}

        gutter={12}


        toastOptions={{

          duration: 3500,


          style: {

            minWidth: "360px",

            maxWidth: "420px",

            padding: "16px 20px",

            borderRadius: "14px",

            fontSize: "15px",

            fontWeight: "600",

            boxShadow:
              "0 10px 30px rgba(15,23,42,0.15)",

          },


          success: {

            iconTheme: {

              primary: "#10b981",

              secondary: "#ffffff",

            },


            style: {

              background: "#ffffff",

              color: "#0f172a",

              border:
                "1px solid #d1fae5",

            },

          },


          error: {

            iconTheme: {

              primary: "#ef4444",

              secondary: "#ffffff",

            },


            style: {

              background: "#ffffff",

              color: "#0f172a",

              border:
                "1px solid #fee2e2",

            },

          },

        }}

      />


    </BrowserRouter>


  </StrictMode>

);