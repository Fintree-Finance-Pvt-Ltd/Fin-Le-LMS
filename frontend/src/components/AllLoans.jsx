import { useEffect, useState } from "react";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  WalletCards,
  FileText
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { getAllLoans } from "../services/loanService";


function AllLoans() {


const navigate = useNavigate();


const [loans,setLoans] = useState([]);

const [loading,setLoading] = useState(true);

const [error,setError] = useState("");

const [page,setPage] = useState(1);

const [search,setSearch] = useState("");



const [pagination,setPagination] = useState({

page:1,
pageSize:25,
total:0,
totalPages:0

});





const fetchLoans = async(
targetPage=page,
targetSearch=search
)=>{


try{


setLoading(true);

setError("");



const data =
await getAllLoans({

page:targetPage,

pageSize:25,

search:targetSearch,

sortBy:"created_at",

sortDir:"desc"

});



setLoans(
data.rows || []
);



setPagination(

data.pagination || {

page:1,

pageSize:25,

total:0,

totalPages:0

}

);



}

catch(err){

console.log(err);


setError(
err.message ||
"Failed to load loans"
);


}

finally{

setLoading(false);

}


};






useEffect(()=>{


fetchLoans(page,search);


// eslint-disable-next-line

},[page]);







const handleSearch=()=>{


if(page!==1){

setPage(1);

}
else{

fetchLoans(1,search);

}


};






const formatMoney=(value)=>{


if(
value===null ||
value===undefined ||
value===""
)

return "—";



return new Intl.NumberFormat(
"en-IN",
{

style:"currency",

currency:"INR",

maximumFractionDigits:2

}

).format(Number(value));


};






const formatDate=(value)=>{


if(!value)

return "—";



const date=new Date(value);



if(Number.isNaN(date.getTime()))

return "—";



return date.toLocaleDateString(
"en-IN"
);


};






const getStatusStyle=(status="")=>{


const value=status.toLowerCase();



if(
value.includes("approved") ||
value.includes("accepted") ||
value.includes("disbursed")
)

return "border-emerald-200 bg-emerald-50 text-emerald-700";



if(
value.includes("rejected") ||
value.includes("failed")
)

return "border-red-200 bg-red-50 text-red-700";



if(
value.includes("pending") ||
value.includes("processing")
)

return "border-amber-200 bg-amber-50 text-amber-700";



return "border-slate-300 bg-slate-100 text-slate-700";


};

const handleDocuments=(loan)=>{

navigate(
`/documents/${loan.lan}`
);

};

return (


<div className="w-full">



<div
className="
overflow-hidden
rounded-2xl
border
border-slate-200
bg-white
shadow-sm
"
>



<div
className="
flex
flex-col
gap-4
border-b
border-slate-100
px-5
py-5
lg:flex-row
lg:items-center
lg:justify-between
"
>



<div
className="
flex
items-center
gap-3
"
>


<div
className="
flex
h-10
w-10
items-center
justify-center
rounded-xl
bg-emerald-500
text-white
"
>

<WalletCards size={20}/>

</div>




<div>

<h1
className="
text-xl
font-bold
text-slate-950
"
>

Personal Loan All Loans

</h1>


<p
className="
text-xs
text-slate-500
"
>

View all Personal Loan applications

</p>


</div>


</div>







<div
className="
flex
flex-col
gap-3
sm:flex-row
"
>



<button

className="
flex
items-center
gap-2
rounded-xl
bg-slate-950
px-4
py-2
text-sm
font-semibold
text-white
hover:bg-slate-800
"

>

<Download size={15}/>

Export CSV

</button>





<div className="relative">


<Search

size={16}

className="
absolute
left-3
top-1/2
-translate-y-1/2
text-slate-400
"

/>



<input

value={search}

onChange={
e=>setSearch(e.target.value)
}


onKeyDown={
e=>{

if(e.key==="Enter")

handleSearch();

}

}


placeholder="Search LAN, name, mobile..."


className="
h-10
rounded-xl
border
border-slate-300
pl-9
pr-3
text-sm
outline-none
focus:border-emerald-500
"

/>


</div>




<div className="text-sm text-slate-600">


<span className="font-bold">

{pagination.total || 0}

</span>

{" "}Records


</div>



</div>



</div>






{
error &&

<div
className="
mx-5
mt-5
rounded-xl
bg-red-50
p-3
text-sm
text-red-700
"
>

{error}

</div>

}





<div
className="
m-5
overflow-x-auto
rounded-xl
border
border-slate-200
"
>


<table
className="
w-full
border-collapse
"
>


<thead>


<tr className="bg-slate-50">


{
[
"Customer Name",
"LAN",
"Partner ID",
"Loan Amount",
"Disbursement Amount",
"Disbursement Date",
"Status",
"Action"

].map((head)=>(


<th

key={head}

className="
px-4
py-4
text-left
text-[11px]
font-bold
uppercase
tracking-wide
text-slate-500
"

>

{head}

</th>


))

}


</tr>


</thead>






<tbody>


{
loading ?


<tr>

<td
colSpan="8"

className="
py-20
text-center
text-slate-500
"
>

Loading loans...

</td>

</tr>



:


loans.map((loan)=>(


<tr

key={
loan.id || loan.lan
}

className="
transition
duration-200
hover:bg-emerald-50/40
"

>


<td className="px-4 py-4">


<button

onClick={()=>navigate(
`/loan-details/${loan.lan}`
)}

className="
font-semibold
uppercase
text-slate-900
transition
hover:translate-x-1
hover:text-emerald-600
"

>

{loan.customer_name || "—"}

</button>


<p
className="
text-xs
text-slate-400
"
>

{loan.mobile}

</p>


</td>







<td className="px-4 py-4">


<button

onClick={()=>navigate(
`/loan-details/${loan.lan}`
)}

className="
rounded-md
border
border-slate-200
bg-slate-50
px-3
py-1
font-mono
text-xs
transition
hover:border-emerald-400
hover:bg-emerald-50
hover:text-emerald-700
"

>

{loan.lan}

</button>


</td>







<td className="px-4 py-4 text-xs">


{loan.partner_application_number || "—"}


</td>







<td className="px-4 py-4 font-semibold">

{formatMoney(
loan.loan_amount
)}

</td>






<td className="px-4 py-4 font-bold">

{formatMoney(
loan.disbursal_amount
)}

</td>






<td className="px-4 py-4">

{formatDate(
loan.disbursement_date
)}

</td>






<td className="px-4 py-4">


<span

className={`
rounded-lg
border
px-3
py-1
text-[10px]
font-bold
${getStatusStyle(
loan.status
)}
`}

>

{loan.status || "—"}

</span>


</td>






<td className="px-4 py-4">


<button

onClick={()=>handleDocuments(loan)}

className="
flex
items-center
gap-2
rounded-lg
border
border-emerald-200
bg-emerald-50
px-3
py-2
text-xs
font-semibold
text-emerald-700
transition
hover:bg-emerald-100
"

>

<FileText size={14}/>

Documents


</button>


</td>






</tr>


))


}



</tbody>


</table>


</div>







<div
className="
flex
justify-center
gap-3
p-4
"
>



<button

disabled={page<=1}

onClick={()=>setPage(page-1)}

className="
rounded-lg
border
px-3
py-2
disabled:opacity-40
"

>

<ChevronLeft size={16}/>

</button>




<div
className="
rounded-lg
bg-emerald-500
px-4
py-2
text-white
"
>

{page}

</div>




<button

disabled={
page>=pagination.totalPages
}

onClick={()=>setPage(page+1)}

className="
rounded-lg
border
px-3
py-2
disabled:opacity-40
"

>

<ChevronRight size={16}/>

</button>



</div>





</div>


</div>


);


}


export default AllLoans;