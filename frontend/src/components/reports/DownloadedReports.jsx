import {
  useEffect,
  useState,
} from "react";


import {
  useOutletContext,
} from "react-router-dom";


import toast from "react-hot-toast";


import {
  apiFetch,
} from "../../services/api";


import "../../styles/ReportsDownload.css";



function DownloadedReports() {


  const {
    report
  } = useOutletContext();




  const [downloads, setDownloads] =
    useState([]);



  const [loading, setLoading] =
    useState(true);



  const [refreshing, setRefreshing] =
    useState(false);








  useEffect(()=>{


    let mounted = true;


    let firstLoad = true;





    const fetchDownloads = async()=>{


      try{


        if(
          !firstLoad &&
          mounted
        ){

          setRefreshing(true);

        }





        const data =
          await apiFetch(

            `/reports/downloads?reportId=${encodeURIComponent(
              report.slug
            )}`

          );





        if(!mounted){

          return;

        }





        setDownloads(

          Array.isArray(data)

          ?

          data

          :

          []

        );





      }
      catch(error){



        console.error(
          "Download list error:",
          error
        );



        if(mounted){


          toast.error(

            error?.message ||

            "Failed to load reports"

          );


        }



      }
      finally{



        if(!mounted){

          return;

        }




        if(firstLoad){


          setLoading(false);


          firstLoad=false;


        }



        setRefreshing(false);



      }


    };





    fetchDownloads();






    const interval =
      setInterval(

        fetchDownloads,

        3000

      );






    return()=>{


      mounted=false;


      clearInterval(interval);


    };



  },[report.slug]);








  const handleDownloadClick = ()=>{


    toast.success(
      "Report download started"
    );


  };







  return (

    <div className="mis-downloads">





      <div className="mis-downloads-top">


        <div>


          <h3>

            Downloaded Reports

          </h3>


          <p>

            Generated reports will appear here automatically.

          </p>


        </div>





        {(loading || refreshing) && (

          <span className="mis-refreshing">

            {
              loading
              ?
              "Loading..."
              :
              "Refreshing..."
            }


          </span>

        )}




      </div>








      <div className="mis-table-wrapper">



        <table>



          <thead>


            <tr>


              <th>
                Report
              </th>


              <th>
                Report ID
              </th>


              <th>
                Status
              </th>


              <th>
                Time Taken
              </th>


              <th>
                Description
              </th>


              <th>
                Product
              </th>


              <th>
                Created By
              </th>


              <th>
                Generated At
              </th>



            </tr>


          </thead>








          <tbody>




          {
            loading ?

            (

              <tr>

                <td
                  colSpan="8"
                  className="mis-no-data"
                >

                  Loading generated reports...

                </td>

              </tr>


            )

            :


            downloads.length > 0 ?


            (

              downloads.map(
                (item)=>{


                  const status =
                    String(
                      item.status || ""
                    )
                    .trim()
                    .toLowerCase();




                  const isCompleted =
                    status === "completed";




                  return (


                    <tr

                      key={
                        item.id ||
                        item.file_name
                      }

                    >





                      <td>


                        {
                          isCompleted &&
                          item.downloadUrl

                          ?

                          (

                            <a

                              href={
                                item.downloadUrl
                              }

                              target="_blank"

                              rel="noreferrer"


                              onClick={
                                handleDownloadClick
                              }

                            >

                              {
                                item.file_name ||
                                "Download"
                              }


                            </a>


                          )


                          :

                          (

                            item.file_name ||
                            "-"

                          )


                        }


                      </td>






                      <td>

                        {
                          item.report_id ||
                          "-"
                        }

                      </td>






                      <td>


                        <span

                          className={
                            `mis-status ${status}`
                          }

                        >

                          {
                            item.status ||
                            "Unknown"
                          }


                        </span>


                      </td>







                      <td>


                        {
                          item.time_taken ||
                          "In progress"
                        }


                      </td>







                      <td>


                        {
                          item.description ||
                          "-"
                        }


                      </td>







                      <td>


                        {
                          item.product ||
                          "-"
                        }


                      </td>








                      <td>


                        {
                          item.created_by ||
                          "-"
                        }


                      </td>







                      <td>


                        {
                          item.generated_at

                          ?

                          new Date(
                            item.generated_at
                          )
                          .toLocaleString()

                          :

                          "-"

                        }


                      </td>





                    </tr>



                  );


                }

              )


            )

            :

            (

              <tr>


                <td

                  colSpan="8"

                  className="mis-no-data"

                >

                  No generated reports yet.

                </td>


              </tr>


            )

          }





          </tbody>




        </table>



      </div>




    </div>


  );

}


export default DownloadedReports;