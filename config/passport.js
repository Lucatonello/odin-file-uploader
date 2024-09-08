//REVIEW THIS FILE LATER

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { getUserByEmail } = require('../db/helpers');
const bcryptjs = require('bcryptjs');

passport.use(new LocalStrategy(
    async (email, password, done) => {
        try {
            const user = await getUserByEmail(email);
            if (!user) {
                return done(null, false, { message: 'No user with that email'});
            }

            const isMatch = await bcryptjs.compare(password, user.password);
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password'});
            }
        } catch(err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    try {
        const user = await getUserByEmail(id);
        done(null, user);
    } catch(err) {
        done(err);
    }
});

