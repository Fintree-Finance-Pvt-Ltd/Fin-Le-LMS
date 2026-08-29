import React, {
  useEffect,
  useState,
  useMemo
} from "react";

import { useParams } from "react-router-dom";

import {
  Download
} from "lucide-react";

import {
  getExtraCharges
} from "../services/loanService";

import "../styles/ExtraCharges.css";



const formatDate = (value, withTime=false)=>{

    if(!value)
        return "-";


    const date = new Date(value);


    if(Number.isNaN(date.getTime()))
        return value;



    return date.toLocaleString(
        "en-IN",
        withTime
        ?
        {
            day:"2-digit",
            month:"short",
            year:"numeric",
            hour:"2-digit",
            minute:"2-digit",
            hour12:true
        }
        :
        {
            day:"2-digit",
            month:"short",
            year:"numeric"
        }
    );

};




const money = (value)=>{

return Number(value || 0)
.toLocaleString(
"en-IN",
{
minimumFractionDigits:2,
maximumFractionDigits:2
}
);

};




const ExtraCharges = () => {


const {lan}=useParams();


const [rows,setRows]=useState([]);

const [loading,setLoading]=useState(true);

const [error,setError]=useState("");

const [search,setSearch]=useState("");

const [page,setPage]=useState(1);


const rowsPerPage=10;




useEffect(()=>{


const fetchData=async()=>{


try{


const data =
await getExtraCharges(lan);


setRows(data || []);


}
catch(err){

console.error(err);

setError(
err.message ||
"Failed to fetch charges"
);


}
finally{

setLoading(false);

}


};



if(lan)
fetchData();


},[lan]);






const filteredRows =
useMemo(()=>{


return rows.filter(row=>{


const text = `

${row.charge_type}

${row.paid_status}

${row.amount}

${row.charge_date}

`
.toLowerCase();



return text.includes(
search.toLowerCase()
);


});


},[
rows,
search
]);






useEffect(()=>{

setPage(1);

},[search]);







const totals =
useMemo(()=>{


let amount=0;

let paid=0;

let waived=0;



filteredRows.forEach(r=>{


amount += Number(r.amount || 0);


paid += Number(r.paid_amount || 0);


waived += Number(
r.waived_off ||
r.waived_amount ||
0
);



});



return {

amount,

paid,

waived,

outstanding:
amount-paid-waived


};


},[filteredRows]);







const totalPages =
Math.ceil(
filteredRows.length / rowsPerPage
);




const paginatedRows =
filteredRows.slice(
(page-1)*rowsPerPage,
page*rowsPerPage
);







const exportCSV=()=>{


const headers=[

"Charge Date",
"Amount",
"Paid Amount",
"Waived",
"Charge Type",
"Status",
"Payment Time",
"Created At",
"Outstanding"

];



const csvRows=[
headers
];




filteredRows.forEach(row=>{


csvRows.push([


formatDate(row.charge_date),


row.amount || 0,


row.paid_amount || 0,


row.waived_off ||
row.waived_amount ||
0,


row.charge_type || "",


row.paid_status || "",


formatDate(
row.payment_time,
true
),


formatDate(
row.created_at,
true
),



Number(row.amount||0)
-
Number(row.paid_amount||0)
-
Number(
row.waived_off ||
row.waived_amount ||
0
)



]);


});





const csv =
csvRows
.map(row=>
row.join(",")
)
.join("\n");





const blob =
new Blob(
[csv],
{
type:"text/csv;charset=utf-8;"
}
);




const url =
URL.createObjectURL(blob);



const link =
document.createElement("a");


link.href=url;


link.download =
`extra_charges_${lan}.csv`;



document.body.appendChild(link);


link.click();


document.body.removeChild(link);



URL.revokeObjectURL(url);


};







if(loading)

return (
<div className="extra-loading">
Loading extra charges...
</div>
);





if(error)

return (
<div className="error">
{error}
</div>
);







return (

<div className="extra-card">


<h2>
Extra Charges — {lan}
</h2>





<div className="extra-toolbar">


<input

placeholder="Search..."

value={search}

onChange={(e)=>
setSearch(e.target.value)
}

/>



<button
onClick={exportCSV}
>

<Download size={16}/>

Export CSV

</button>


</div>






<div className="chips">


<span>
Total ₹{money(totals.amount)}
</span>


<span>
Paid ₹{money(totals.paid)}
</span>


<span>
Waived ₹{money(totals.waived)}
</span>


<span>
Outstanding ₹{money(totals.outstanding)}
</span>


</div>







<div className="table-wrapper">


<table>


<thead>

<tr>

<th>Charge Date</th>

<th>Amount</th>

<th>Paid</th>

<th>Waived</th>

<th>Charge Type</th>

<th>Status</th>

<th>Payment Time</th>

<th>Created At</th>

<th>Outstanding</th>

</tr>

</thead>





<tbody>


{
paginatedRows.length === 0

?

<tr>
<td colSpan="9">
No results
</td>
</tr>


:

paginatedRows.map(row=>(


<tr key={row.id}>


<td>
{formatDate(row.charge_date)}
</td>



<td>
₹ {money(row.amount)}
</td>



<td>
₹ {money(row.paid_amount)}
</td>



<td>
₹ {money(
row.waived_off ||
row.waived_amount
)}
</td>



<td>
{row.charge_type}
</td>



<td>

<span className="status">

{row.paid_status}

</span>

</td>




<td>
{
formatDate(
row.payment_time,
true
)
}
</td>




<td>
{
formatDate(
row.created_at,
true
)
}
</td>




<td>

₹ {

money(

Number(row.amount||0)

-

Number(row.paid_amount||0)

-

Number(
row.waived_off ||
row.waived_amount ||
0
)

)

}

</td>



</tr>


))


}



</tbody>


</table>


</div>








<div className="pagination">


<button

disabled={page===1}

onClick={()=>
setPage(page-1)
}

>
Prev
</button>



<span>
Page {page} / {totalPages || 1}
</span>




<button

disabled={
page===totalPages ||
totalPages===0
}

onClick={()=>
setPage(page+1)
}

>
Next
</button>



<select disabled>

<option>
10 / page
</option>

</select>


</div>



</div>


);


};


export default ExtraCharges;