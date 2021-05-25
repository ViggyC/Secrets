//jshint esversion:6
require("dotenv").config(); //must be at top, use process.env.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy; //https://www.passportjs.org/packages/passport-google-oauth20/
const findOrCreate = require("mongoose-findorcreate");
//console.log(process.env.API_KEY) -> example of dotenv

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//Use session
app.use(
  session({
    secret: "Secret bitch",
    resave: false,
    saveUninitialized: false,
  })
);

//Init passport with session
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://vignesh:secret101@clustersecret.teogg.mongodb.net/userDB",
  { useUnifiedTopology: true },
  { useNewUrlParser: true }
);

mongoose.set("useCreateIndex", true);

//object from mongoose schema class
const userSchema = new mongoose.Schema({
  email: String,
  password: String, //encrypted below
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose); //for hashing passwords
userSchema.plugin(findOrCreate); //fuck

const User = new mongoose.model("User", userSchema);

//SOme shit
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

console.log()
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

//poop!
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render('secrets', {usersWithSecrets: foundUser})
            }
        }
    });
  
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  console.log(req.user.id);
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("secrets");
        });
      }
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

//Passport
app.post("/register", (req, res) => {
  //using passport function
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

//Passport authentication
app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username, //from html
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});


let port = process.env.PORT;
if(port===null || port === ""){
    port=3000;
}

app.listen(port, function () {
  console.log("Server has started okokokok");
});
