var router = require("express").Router();
var low = require("lowdb");
var path = require("path");
var uuid = require("uuid");
var authService = require("./services/authService");
var passport = require("passport");
const multer = require("multer");
const fs = require("fs");
authService.configurePassport(passport);

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

// display home page

router.get("/", isLoggedIn(), function (req, res) {
  var books = db.get("books").value();
  var authors = db.get("users").value();
  res.render("blog", { books: books, authors: authors });
});

router.get("/", isLoggedOut(), function (req, res) {
  var books = db.get("books").value();
  res.render("books", { books: books });
});

router.get("/blog", function (req, res) {
  var books = db.get("books").value();
  res.render("blog", { books: books });
});

//==========================
// book routes
//==========================

// display all books
router.get("/books", function (req, res) {
  var books = db.get("books").value();
  var authors = db.get("users").value();

  res.render("books", { books: books, authors: authors });
});

//para API tener el libro primero en formato json
router.get("/bookis", function (req, res) {
  var books = db.get("books").value();
  return res.status(200).json(books);
});

// display all books del user
router.get("/task", function (req, res) {
  var dbUser = db.get("users").find({ id: req.user.id }).value();
  var author_id = dbUser.id;

  var array = [];
  var books = db.get("books").value();
  books.forEach((book) => {
    if (book.author_id == author_id) {
      array.push(book.title);
    }
  });

  res.render("tasks", { books: array });
});

//API

//crear post por usuario anonimo

router.get("/post", isLoggedOut(), function (req, res) {
  res.render("post");
});

router.post(
  "/createPost",
  isLoggedOut(),
  multer({ dest: path.join(__dirname, "/public/uploads") }).single("imagen"),
  function (req, res) {
    // get data from form
    var title = req.body.title;
    var desc = req.body.desc;

    var archivo = req.file.originalname;

    //const ext = path.extname(req.file.originalname).toLocaleLowerCase();
    fs.rename(
      req.file.path,
      `./public/uploads/${req.file.originalname}`,
      () => {
        console.log("recibido");
      }
    );

    const ruta = "../public/uploads/" + archivo;
    // insert new book into database
    db.get("books")
      .push({
        title: title,
        desc: desc,
        imagen: "/" + archivo,
        comentario: "No hay",
        id: uuid(),
      })
      .write();

    // redirect
    res.redirect("/blog");
  }
);

//crear comentario por administrador

router.post("/books/:id", function (req, res) {
  const result = db
    .get("books")
    .find({ id: req.params.id })
    .assign(req.body)
    .write();
  // redirect
  res.redirect("/blog");
});

//eliminar post  por administrador

router.get("/delete/:id", function (req, res) {
  const result = db.get("books").remove({ id: req.params.id }).write();
  // redirect
  res.redirect("/blog");
});

// crear post por usuario logueado
router.post("/createBook", function (req, res) {
  var dbUser = db.get("users").find({ id: req.user.id }).value();
  // get data from form
  var title = req.body.title;
  //var author_id = req.body.author_id;
  var author_id = dbUser.id;

  // insert new book into database
  db.get("books")
    .push({ title: title, id: uuid(), author_id: author_id })
    .write();

  // redirect
  res.redirect("/task");
});

// display one book
router.get("/books/:id", function (req, res) {
  var book = db.get("books").find({ id: req.params.id }).value();
  var author;
  if (book) {
    author = db.get("users").find({ id: book.author_id }).value();
  }

  res.render("book", { book: book || {}, author: author || {} });
});

//==========================
// auth routes
//==========================

var signup_view_path = path.join("auth", "signup");
var login_view_path = path.join("auth", "login");

// display signup page only if user is not logged in
/*
router.get("/signup", isLoggedOut(), function (req, res) {
  res.render(signup_view_path);
});*/

router.get("/signup", function (req, res) {
  res.render(signup_view_path);
});

// create user
router.post("/signup", function (req, res) {
  // remove extra spaces
  var username = req.body.username.trim();
  var role = req.body.role;
  var password = req.body.password.trim();
  var password2 = req.body.password2.trim();

  // validate form data
  req
    .checkBody("username", "Username must have at least 3 characters")
    .isLength({ min: 3 });
  req
    .checkBody("password", "Password must have at least 3 characters")
    .isLength({ min: 3 });
  req.checkBody("username", "Username is required").notEmpty();
  req.checkBody("password", "Password is required").notEmpty();
  req.checkBody("password2", "Confirm password is required").notEmpty();
  req.checkBody("password", "Password do not match").equals(password2);

  // check for errors
  var errors = req.validationErrors();
  // if there are errors, display signup page
  if (errors) {
    return res.render(signup_view_path, {
      errors: errors.map(function (error) {
        return error.msg;
      }),
    });
  }

  var options = {
    username: username,
    password: password,
    role: role,
    successRedirectUrl: "/",
    signUpTemplate: signup_view_path,
  };
  authService.signup(options, res);
});

// display login page  if user is not logged in
router.get("/login", isLoggedOut(), function (req, res) {
  res.render(login_view_path, { errors: [] });
});

// peform login
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
    successFlash: "You are logged in",
  })
);

// logout user
router.get("/logout", function (req, res) {
  req.logout();
  req.flash("success", "You are logged out");
  res.redirect("/blog");
});

// display profile page if user is logged in
router.get("/profile", isLoggedIn(), function (req, res) {
  var dbUser = db.get("users").find({ id: req.user.id }).value();

  res.render("profile", { dbUser: dbUser });
});

//==========================
// middleware
//==========================

// isAuthenticated comes from passport;
// when a user is logged in, isAuthenticated return true.

function isLoggedIn() {
  return (req, res, next) => {
    // if there is a logged in user, do the next thing, and execute the
    // function for the route
    if (req.isAuthenticated()) {
      return next();
    }

    // if there isn't a login user, skip the function for the route, and
    // redirect to the login page
    return res.redirect("/login");
  };
}

function isLoggedOut() {
  return (req, res, next) => {
    // if there isn't a login user, execute the function for the route
    if (!req.isAuthenticated()) {
      return next();
    }

    // if there is a logged in user, redirect
    return res.redirect("/");
  };
}

module.exports = router;
