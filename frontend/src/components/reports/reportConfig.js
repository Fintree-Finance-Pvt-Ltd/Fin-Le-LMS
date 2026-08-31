export const REPORTS = [

  {
    id: 1,

    slug:
      "consolidated-mis",

    name:
      "Consolidated MIS",

    category:
      "MIS",

    inputType:
      "dateRange",
  },


  {
    id: 2,

    slug:
      "due-demand-vs-collection-all-products",

    name:
      "Due Demand vs Collection Report(All products)",

    category:
      "Collection",

    inputType:
      "dateRange",
  },


  {
    id: 3,

    slug:
      "cashflow-report",

    name:
      "CashFlow Report",

    category:
      "Finance",

    inputType:
      "dateRange",
  },


  {
    id: 4,

    slug:
      "rps-generate-report",

    name:
      "RPS Generate Report",

    category:
      "Operations",

    inputType:
      "dateRange",
  },


  {
    id: 5,

    slug:
      "cashflow-report-bank-date",

    name:
      "CashFlow Report Bank Date",

    category:
      "Finance",

    inputType:
      "dateRange",
  },

];


export const getReportBySlug = (
  slug
) => {

  return REPORTS.find(
    (report) =>
      report.slug === slug
  );

};