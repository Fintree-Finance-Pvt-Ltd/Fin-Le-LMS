// const formatMoney = (value) => {
//   if (value === null || value === undefined) {
//     return "-";
//   }

//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//   }).format(Number(value));
// };

// const formatDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   return new Date(value).toLocaleDateString("en-IN");
// };

// const LoansTable = ({ loans }) => {
//   if (!loans.length) {
//     return <p>No loans found.</p>;
//   }

//   return (
//     <table>
//       <thead>
//         <tr>
//           <th>Customer Name</th>
//           <th>LAN</th>
//           <th>Partner ID</th>
//           <th>Loan Amount</th>
//           <th>Disbursement Amount</th>
//           <th>Disbursement Date</th>
//           <th>Status</th>
//           <th>Action</th>
//         </tr>
//       </thead>

//       <tbody>
//         {loans.map((loan) => (
//           <tr key={loan.id}>
//             <td>{loan.customer_name || "-"}</td>

//             <td>{loan.lan || "-"}</td>

//             <td>
//               {loan.partner_application_number || "-"}
//             </td>

//             <td>
//               {formatMoney(loan.loan_amount)}
//             </td>

//             <td>
//               {formatMoney(loan.disbursal_amount)}
//             </td>

//             <td>
//               {formatDate(loan.disbursement_date)}
//             </td>

//             <td>{loan.status || "-"}</td>

//             <td>
//               <button
//                 type="button"
//                 onClick={() =>
//                   console.log(
//                     "Loan ID:",
//                     loan.partner_loan_id
//                   )
//                 }
//               >
//                 View
//               </button>
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

// export default LoansTable;