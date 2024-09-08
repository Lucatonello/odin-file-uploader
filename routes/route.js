const express = require('express');
const router = express.Router();
const passport = require('passport');
const { createUser } = require('../db/helpers');
const multer = require('multer');
const pool = require('../db/pool');
const fs = require('fs');
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

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
    req.logout((err) => {
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

router.post('/upload', upload.single('file'), async function (req, res, next) {
    if (req.file) {
        try {
            const { filename, path: filepath, size} = req.file;
            await pool.query('INSERT INTO FILES (filename, filepath, size) VALUES ($1, $2, $3)', [filename, filepath, size]);
            res.send('File uploaded successfully.');
        } catch (err) {
            console.error(err);
            res.status(500).send("error saving file");
        }        
    } else {
        res.status(400).send('No file uploaded.');
    }
});

router.post('/newfolder', (req, res) => {
    const folderName = req.body.folderName;
    const folderPath = path.join(__dirname, '..', 'uploads', folderName);
    
    fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
            console.err(err);
            return res.status(500).send("Error creating folder");
        }
        res.send("Foder created succesfully");
    });
});

router.get('/files', (req, res) => {
    const uploadsPath = path.join(__dirname, '..', 'uploads');

    fs.readdir(uploadsPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send("error reading files");
        }
        const filesWithUrls = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            url: file.isDirectory() ? file.name : encodeURIComponent(file.name)
        }));
        res.render('files', { files: filesWithUrls, currentPath: '/' });
    });
});

router.get('/files/:folder', (req, res) => {
    const folderName = req.params.folder;
    const folderPath = path.join(__dirname, '..', 'uploads', folderName);

    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send("error reading folder");
        }
        const filesWithUrls = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            url: path.join(req.params.folder, file.name) // Construct path for folder
        }));
        res.render('files', { files: filesWithUrls, currentPath: path.join('/', req.params.folder) });    
    });
});
module.exports = router;