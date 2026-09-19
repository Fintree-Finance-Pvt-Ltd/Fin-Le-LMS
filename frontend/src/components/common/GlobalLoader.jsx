import {
  useLoading
} from "../../context/LoadingContext";


function GlobalLoader(){


const {
  loading
}=useLoading();



if(!loading)
return null;



return (

<div
className="
fixed
inset-0
z-[9999]
flex
items-center
justify-center
bg-slate-950/40
backdrop-blur-sm
"
>


<div
className="
flex
flex-col
items-center
gap-3
"
>


<div
className="
h-14
w-14
rounded-full
border-4
border-emerald-500
border-t-transparent
animate-spin
"
/>


<p
className="
rounded-lg
bg-slate-950
px-4
py-2
text-sm
font-semibold
text-white
"
>
Loading...
</p>


</div>


</div>

);


}


export default GlobalLoader;