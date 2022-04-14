var express = require("express");

var bodyParser = require("body-parser");
var expressValidator = require("express-validator");

var path = require("path");

const multer = require("multer");
const fs = require("fs");

var routes = require("./routes");

var app = express();
app.use(express.static(path.join(__dirname, "public/uploads")));
// set view engine
app.set("view engine", "ejs");

// bodyParser reads a form's input and stores it in request.body
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies

// form and url validation
app.use(expressValidator());

// routes
app.use("/", routes);

// Static files

// start server
app.listen(3001, function () {
  console.log("server on port 3001");
});
