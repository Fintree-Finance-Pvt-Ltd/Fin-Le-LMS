import {
  useEffect,
  useState,
} from "react";

import {
  useOutletContext,
} from "react-router-dom";

import {
  apiFetch,
} from "../../services/api";

import "../../styles/ReportsDownload.css";


function DownloadedReports() {

  const { report } =
    useOutletContext();


  const [downloads, setDownloads] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {

    let mounted = true;

    let firstLoad = true;


    const fetchDownloads =
      async () => {

        try {

          if (!firstLoad && mounted) {
            setRefreshing(true);
          }


          const data =
            await apiFetch(
              `/reports/downloads?reportId=${encodeURIComponent(
                report.slug
              )}`
            );


          if (!mounted) {
            return;
          }


          setDownloads(
            Array.isArray(data)
              ? data
              : []
          );

          setError("");

        } catch (error) {

          console.error(
            "Download list error:",
            error
          );


          if (!mounted) {
            return;
          }


          setError(
            error?.message ||
              "Failed to load reports."
          );

        } finally {

          if (!mounted) {
            return;
          }


          if (firstLoad) {
            setLoading(false);
            firstLoad = false;
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


    return () => {

      mounted = false;

      clearInterval(
        interval
      );

    };

  }, [report.slug]);


  return (
    <div className="mis-downloads">

      {/* =========================
          HEADER
      ========================= */}

      <div className="mis-downloads-top">

        <div>

          <h3>
            Downloaded Reports
          </h3>

          <p>
            Generated reports will
            appear here automatically.
          </p>

        </div>


        {(loading || refreshing) && (

          <span className="mis-refreshing">
            {loading
              ? "Loading..."
              : "Refreshing..."}
          </span>

        )}

      </div>


      {/* =========================
          ERROR
      ========================= */}

      {error && (

        <div className="mis-download-error">
          {error}
        </div>

      )}


      {/* =========================
          TABLE
      ========================= */}

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

            {/* Loading */}

            {loading ? (

              <tr>

                <td
                  colSpan="8"
                  className="mis-no-data"
                >
                  Loading generated reports...
                </td>

              </tr>

            ) : error ? (

              /* Error */

              <tr>

                <td
                  colSpan="8"
                  className="mis-no-data"
                >
                  Unable to load generated reports.
                </td>

              </tr>

            ) : downloads.length > 0 ? (

              /* Records */

              downloads.map(
                (item) => {

                  const status =
                    String(
                      item.status || ""
                    )
                      .trim()
                      .toLowerCase();


                  const isCompleted =
                    status ===
                    "completed";


                  return (

                    <tr
                      key={
                        item.id ||
                        item.file_name
                      }
                    >

                      {/* Report / Download */}

                      <td>

                        {isCompleted &&
                        item.downloadUrl ? (

                          <a
                            href={
                              item.downloadUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.file_name ||
                              "Download"}
                          </a>

                        ) : (

                          item.file_name ||
                          "-"

                        )}

                      </td>


                      {/* Report ID */}

                      <td>
                        {item.report_id ||
                          "-"}
                      </td>


                      {/* Status */}

                      <td>

                        <span
                          className={
                            `mis-status ${status}`
                          }
                        >
                          {item.status ||
                            "Unknown"}
                        </span>

                      </td>


                      {/* Time Taken */}

                      <td>
                        {item.time_taken ||
                          "In progress"}
                      </td>


                      {/* Description */}

                      <td>
                        {item.description ||
                          "-"}
                      </td>


                      {/* Product */}

                      <td>
                        {item.product ||
                          "-"}
                      </td>


                      {/* Created By */}

                      <td>
                        {item.created_by ||
                          "-"}
                      </td>


                      {/* Generated At */}

                      <td>

                        {item.generated_at
                          ? new Date(
                              item.generated_at
                            ).toLocaleString()
                          : "-"}

                      </td>

                    </tr>

                  );

                }
              )

            ) : (

              /* Empty */

              <tr>

                <td
                  colSpan="8"
                  className="mis-no-data"
                >
                  No generated reports yet.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}


export default DownloadedReports;