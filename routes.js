var router = require("express").Router();
var low = require("lowdb");
var path = require("path");
var uuid = require("uuid");

const multer = require("multer");
const fs = require("fs");

// connect to database
// path.join will take the parameters and create a path using the
// right type of slashes (\ vs /) based on the operatin system
var db = low(path.join("data", "db.json"));

const storage = multer.diskStorage({
  destination: path.join(__dirname, "/public/uploads"),
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const uploadImage = multer({
  storage,
  limits: { fileSize: 1000000 },
}).single("imagen");
//==========================
// root route
//==========================

//==========================
// book routes
//==========================

// display all books
router.get("/books", function (req, res) {
  var books = db.get("books").value();

  res.render("books", { books: books });
});

router.post(
  "/createPost",
  multer({ dest: path.join(__dirname, "/public/uploads") }).single("image"),
  function (req, res) {
    // get data from form
    var title = req.body.title;
    var url = req.body.url;

    var archivo = req.file.originalname;

    //const ext = path.extname(req.file.originalname).toLocaleLowerCase();
    fs.rename(
      req.file.path,
      `./public/uploads/${req.file.originalname}`,
      () => {
        console.log("1");
      }
    );

    const ruta = "../public/uploads/" + archivo;
    // insert new book into database
    db.get("books")
      .push({
        title: title,
        url: url,
        image: "/" + archivo,
        id: uuid(),
      })
      .write();

    res.send("1");
  }
);

router.get("/post", function (req, res) {
  res.render("post");
});

router.get("/blog", function (req, res) {
  var books = db.get("books").value();
  res.render("blog", { books: books });
});

router.get("/", function (req, res) {
  var books = db.get("books").value();
  res.render("blog", { books: books });
});

//eliminar post  por administrador

router.get("/delete/:id", function (req, res) {
  const result = db.get("books").remove({ id: req.params.id }).write();

  var books = db.get("books").value();

  res.render("books", { books: books });
});

// display one book
router.get("/books/:id", function (req, res) {
  var book = db.get("books").find({ id: req.params.id }).value();

  res.render("book", { book: book });
});

// Para API

router.get("/bookis", function (req, res) {
  var books = db.get("books").value();
  return res.status(200).json(books);
});

router.get("/bookis/:id", function (req, res) {
  var book = db.get("books").find({ id: req.params.id }).value();

  return res.status(200).json(book);
});

module.exports = router;
