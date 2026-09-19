import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";


function Login() {

  const navigate = useNavigate();

  const { login } = useAuth();


  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });


  const [showPassword, setShowPassword] =
    useState(false);


  const [loading, setLoading] =
    useState(false);



  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;


    setFormData((previous)=>({

      ...previous,

      [name]:value,

    }));

  };




  const handleSubmit = async (e) => {

    e.preventDefault();


    setLoading(true);


    try {


      await login({

        email:
          formData.email
          .trim()
          .toLowerCase(),


        password:
          formData.password,

      });



      toast.success(
        "Login successful"
      );



      navigate("/",{
        replace:true,
      });



    }
    catch(error){


      toast.error(

        error.message ||

        "Unable to login. Please try again."

      );


    }
    finally{


      setLoading(false);


    }

  };



  return (

    <div className="min-h-screen bg-slate-950">


      <div className="grid min-h-screen lg:grid-cols-2">



        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">


          <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />



          <div className="relative z-10">


            <div className="flex items-center gap-3">


              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">


                <Landmark size={24}/>


              </div>



              <div>


                <h1 className="text-xl font-bold text-white">

                  LoanLMS

                </h1>


                <p className="text-sm text-slate-400">

                  Personal Loan Management

                </p>


              </div>


            </div>


          </div>




          <div className="relative z-10 max-w-xl">


            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">


              <ShieldCheck size={14}/>

              Secure Financial Workspace


            </div>



            <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">


              Manage personal loan operations{" "}


              <span className="text-emerald-400">

                efficiently.

              </span>


            </h2>


            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">


              Access loan applications,
              customer information,
              credit processing and repayments
              from one secure management system.


            </p>


          </div>




          <p className="relative z-10 text-xs text-slate-600">

            Personal Loan Management System

          </p>



        </section>





        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">


          <div className="w-full max-w-md">


            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">


              <div className="mb-7">


                <p className="mb-2 text-sm font-semibold text-emerald-600">

                  Welcome back

                </p>


                <h2 className="text-2xl font-bold text-slate-900">

                  Login to your account

                </h2>


                <p className="mt-2 text-sm text-slate-500">

                  Enter your registered email and password.

                </p>


              </div>





              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >



                <div>


                  <label className="mb-2 block text-sm font-semibold text-slate-700">

                    Email address

                  </label>



                  <div className="relative">


                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />



                    <input

                      type="email"

                      name="email"

                      value={formData.email}

                      onChange={handleChange}

                      disabled={loading}

                      required

                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4"

                    />


                  </div>


                </div>





                <div>


                  <label className="mb-2 block text-sm font-semibold text-slate-700">

                    Password

                  </label>



                  <div className="relative">


                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />



                    <input

                      type={
                        showPassword
                        ? "text"
                        : "password"
                      }

                      name="password"

                      value={formData.password}

                      onChange={handleChange}

                      disabled={loading}

                      required

                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12"

                    />



                    <button

                      type="button"

                      onClick={()=>setShowPassword(!showPassword)}

                      className="absolute right-3 top-1/2 -translate-y-1/2"

                    >

                      {
                        showPassword
                        ?
                        <EyeOff size={18}/>
                        :
                        <Eye size={18}/>
                      }


                    </button>


                  </div>


                </div>






                <button

                  type="submit"

                  disabled={loading}

                  className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white"

                >

                  {
                    loading
                    ?
                    "Signing in..."
                    :
                    "Login"
                  }


                </button>




              </form>





              <div className="mt-6 flex justify-center gap-2 text-xs text-slate-400">

                <ShieldCheck size={14}/>

                Secure session-based authentication


              </div>



            </div>


          </div>


        </section>



      </div>


    </div>


  );

}


export default Login;