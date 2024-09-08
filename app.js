require("dotenv").config();
const express = require("express");
const session = require("express-session");
const LocalStrategy = require('passport-local').Strategy;
const bcryptjs = require('bcryptjs');
const passport = require("passport");
const { Pool } = require('pg');
const { getUserByEmail } = require("./db/helpers")
const passportConfig = require('./config/passport');
const app = express();
const path = require("path");
const userRoutes = require('./routes/route');
const PORT = process.env.PORT || 3000;

//midleware configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'uploads')));

//init session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

//connect db
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

//define local strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async(email, password, done) => {
    try {
      const user = await getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Incorrect mail'});
      }
      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, {message: 'Incorrect password'});
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

//serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
  });

//deserialize user
passport.deserializeUser(async (id, done) => {
    try {
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, user.rows[0]);
    } catch (err) {
      done(err);
    }
  });

app.use(passport.initialize());
app.use(passport.session());

app.use('/', userRoutes);

app.listen(PORT, () => console.log('server running on port ', PORT));