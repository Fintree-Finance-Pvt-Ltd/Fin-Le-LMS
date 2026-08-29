import React from "react";
import { useParams } from "react-router-dom";

import Documents from "../components/Documents";


const DocumentsPage = () => {


const {lan} = useParams();



return (

<div
className="
min-h-screen
bg-slate-50
p-6
"
>


<Documents lan={lan}/>


</div>

);


};


export default DocumentsPage;