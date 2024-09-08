const express = require('express');
const router = express.Router();
const passport = require('passport');
const { createUser } = require('../db/helpers');

router.get('/', (req, res) => {
    res.render("index");
});

router.get('/signup', (req, res) => {
    res.render("signup");
});
router.post('/signup', async(req, res) => {
    const { email, password } = req.body;
    try {
        await createUser(email, password);
        res.redirect("/login");
    } catch (err) {
        console.error("Error during signup:", err);
        res.redirect("/signup");
    }
});

router.get('/login', (req, res) => {
    res.render("login");
});
router.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
}))

router.get('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) {
            console.log('error loging out', err);
            return res.redirect('/home');
        }
        res.redirect("/");
    });
  });

router.get('/home', (req, res) => {
    res.render('home');
});

module.exports = router;