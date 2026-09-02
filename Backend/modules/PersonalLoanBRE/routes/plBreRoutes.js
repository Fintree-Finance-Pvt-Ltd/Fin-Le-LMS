const express = require("express");

const router = express.Router();

const {
    runPLBREController
} = require("../controllers/plBreController");


router.post("/run/:lan",runPLBREController);


module.exports = router;