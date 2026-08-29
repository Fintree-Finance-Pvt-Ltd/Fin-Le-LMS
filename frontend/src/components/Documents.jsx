import React, { useEffect, useState } from "react";

import {
    FiFileText,
    FiUpload,
    FiEye,
    FiDownload,
    FiRefreshCw,
    FiTrash2
} from "react-icons/fi";

import axios from "axios";

import "../styles/Documents.css";

const Documents = ({ lan }) => {


    const [documents,setDocuments] = useState([]);
    const [file,setFile] = useState(null);
    const [documentName,setDocumentName] = useState("");
    const [loading,setLoading] = useState(false);



    const fetchDocuments = async()=>{

        try{

            const res =
            await axios.get(
                `/api/documents/${lan}`
            );


            setDocuments(
                res.data.data || []
            );


        }
        catch(error){

            console.log(error);

        }

    };



    useEffect(()=>{

        if(lan){
            fetchDocuments();
        }

    },[lan]);

const uploadDocument = async () => {

    if (!lan) {

        alert("LAN is missing");

        return;

    }


    if (!documentName.trim()) {

        alert(
            "Please enter document name"
        );

        return;

    }


    if (!file) {

        alert(
            "Please select a file"
        );

        return;

    }


    try {

        setLoading(true);


        const formData =
            new FormData();


        formData.append(
            "lan",
            lan
        );


        formData.append(
            "documentName",
            documentName.trim()
        );


        formData.append(
            "document",
            file
        );


        await axios.post(
            "/api/documents/upload",
            formData
        );


        setFile(null);

        setDocumentName("");


        await fetchDocuments();


        alert(
            "Document uploaded successfully"
        );

    }
    catch (error) {

        console.error(
            "UPLOAD ERROR:",
            error.response?.data ||
            error
        );


        alert(
            error.response?.data?.message ||
            "Document upload failed"
        );

    }
    finally {

        setLoading(false);

    }

};

    const deleteDocument = async(id)=>{


        if(!window.confirm(
            "Delete document?"
        ))
        {
            return;
        }


        await axios.delete(
            `/api/documents/${id}`
        );


        fetchDocuments();

    };





    const previewDocument=(doc)=>{

        window.open(
            doc.source_url,
            "_blank"
        );

    };




    const downloadDocument=(doc)=>{

        window.open(
            doc.source_url,
            "_blank"
        );

    };




return (

<div className="documents-container">


<div className="document-header-card">


<div className="title-row">

<FiFileText/>

<div>

<h2>
Documents
</h2>


<p>
Upload and manage customer documents
</p>


</div>


</div>


</div>






<div className="document-card">


<div className="card-heading">

<FiUpload/>

<span>
Manage Documents
</span>


</div>




<div className="form-grid">



<div className="form-group">

<label>
LAN ID
</label>

<input
value={lan || ""}
readOnly
/>

</div>




<div className="form-group">

<label>
DOCUMENT NAME
</label>


<input

placeholder="Enter document name"

value={documentName}

onChange={
e=>setDocumentName(e.target.value)
}

/>


</div>





<div className="form-group">

<label>
DOCUMENT STATUS
</label>


<input
value="ACTIVE"
readOnly
/>

</div>


</div>





<div className="file-section">


<label>
SELECT FILE
</label>


<input

type="file"

onChange={
e=>setFile(e.target.files[0])
}

/>


</div>





<button

className="upload-btn"

onClick={uploadDocument}

>

<FiUpload/>

{
loading
?
"Uploading..."
:
"Upload Document"
}


</button>


</div>







<div className="document-card">


<div className="card-heading">

<FiFileText/>

<span>
Uploaded Documents
</span>

</div>




<div className="table-wrapper">


<table>


<thead>

<tr>

<th>
FILE NAME
</th>


<th>
DOCUMENT
</th>


<th>
UPLOADED AT
</th>


<th>
ACTIONS
</th>


</tr>

</thead>



<tbody>


{
documents.map((doc)=>(


<tr key={doc.id}>


<td>
{doc.file_name}
</td>


<td>
{doc.doc_name || doc.document_type}
</td>


<td>

{
new Date(
doc.uploaded_at
).toLocaleString()
}

</td>



<td>


<button
className="action-btn"
onClick={()=>previewDocument(doc)}
>

<FiEye/>

</button>




<button
className="action-btn"
onClick={()=>downloadDocument(doc)}
>

<FiDownload/>

</button>




<button
className="action-btn"
>

<FiRefreshCw/>

</button>





<button

className="delete-btn"

onClick={()=>
deleteDocument(doc.id)
}

>

<FiTrash2/>

</button>



</td>


</tr>


))

}



</tbody>


</table>


</div>



</div>




</div>


);


};


export default Documents;