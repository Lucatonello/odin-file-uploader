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
        const folderName = req.params.folder;
        const folderPath = path.join(__dirname, '..', 'uploads', req.params[0] || '');

        fs.mkdir(folderPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating folder:', err);
                return cb(err, folderPath);
            }
            cb(null, folderPath);
        });
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
    successRedirect: '/files',
    failureRedirect: '/login'
}))

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.log('error loging out', err);
            return res.redirect('/files');
        }
        res.redirect("/");
    });
  });

// router.get('/home', (req, res) => {
//     res.render('home');
// });

router.post('/upload/*', upload.single('file'), async function (req, res, next) {
    if (req.file) {
        try {
            const { filename, path: filepath, size} = req.file;
            const folderPath = req.params[0] || '';

            await pool.query('INSERT INTO FILES (filename, filepath, size) VALUES ($1, $2, $3)', [filename, filepath, size]);
            res.redirect(`/files/${encodeURIComponent(folderPath)}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("error saving file");
        }        
    } else {
        res.status(400).send('No file uploaded.');
    }
});

router.post('/upload/files/:folder', upload.single('file'), async function (req, res, next) {
    const folderName = req.params.folder;
    if (req.file) {
        try {
            const { filename, path: filepath, size} = req.file;
            const folderPath = path.join(__dirname, '..', 'uploads', folderName, filename);

            await pool.query('INSERT INTO FILES (filename, filepath, size) VALUES ($1, $2, $3)', [filename, filepath, size]);
            
            res.redirect(`/files/${encodeURIComponent(folderName)}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("error saving file");
        }        
    } else {
        res.status(400).send('No file uploaded.');
    }
});

router.post('/newfolder/:parentFolder', async (req, res) => {
    const folderName = req.body.folderName;
    const parentFolder = req.params.parentFolder || '';
    const folderPath = path.join(__dirname, '..', 'uploads', parentFolder, folderName);

    try {
        await pool.query('INSERT INTO folders (foldername, folderpath) VALUES ($1, $2)', [folderName, folderPath]);

        fs.mkdir(folderPath, { recursive: true }, (err) => {
            if (err) {
                console.err(err);
                return res.status(500).send("Error creating folder");
            }
            res.redirect(`/files/${encodeURIComponent(parentFolder)}`);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding folder to the database");
    }

    
});

router.get('/files/*', (req, res) => {
    const folderPath = path.join(__dirname, '..', 'uploads', req.params[0]);    
    const pageUrl = req.originalUrl;

    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send("error reading files");
        }
        const filesWithUrls = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            url: path.join(req.params[0], file.name)
        }));
        res.render('files', { files: filesWithUrls, currentPath: path.join('/', req.params[0]), pageUrl: pageUrl });
    });
});

router.get('/files/:folder', (req, res) => {
    const folderName = req.params.folder;
    const folderPath = path.join(__dirname, '..', 'uploads', folderName);
    const pageUrl = req.originalUrl;


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
        res.render('files', { files: filesWithUrls, currentPath: path.join('/', req.params.folder), pageUrl: pageUrl });    
    });
});
module.exports = router;