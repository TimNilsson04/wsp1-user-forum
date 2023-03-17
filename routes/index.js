const express = require('express');
const { response } = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../utils/database.js');
const session = require('express-session');
const promisePool = pool.promise();

module.exports = router;

const mysql = require('mysql2');



router.get('/', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM tn03forum");
    res.render('index.njk', {
        rows: rows,
        title: 'Forum',
    });
});

router.get('/forum', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT tn03forum.*, tn03users.name FROM tn03forum JOIN tn03users ON tn03forum.authorId = tn03users.id ORDER BY createdAt DESC");
    res.render('forum.njk', {
        rows: rows,
        title: 'Forum',
    });
});

router.get('/new', async function (req, res, next) {
    if (req.session.login == 1) {

        const [users] = await promisePool.query("SELECT * FROM tn03users");
        res.render('new.njk', {
            title: 'Nytt inlägg',
            users,
        });
    }
    else {
        return res.status(401).send('Access denied')
    }
   
});

router.get('/', async function (req, res, next) {
    const [rows] = await promisePool.query(`
    SELECT tn03forum.*, tn03users.name AS username
    FROM tn03forum
    JOIN tn03users ON tn03forum.authorId = tn03users.id;`);
    res.render('forum.njk', {
        rows: rows,
        title: 'Forum',
    });
});

router.get('/post/:id', async function (req, res) {
    const [rows] = await promisePool.query(
        `SELECT tn03forum.*, tn03users.name AS username
        FROM tn03forum
        JOIN tn03users ON tn03forum.authorId = tn03users.id
        WHERE tn03forum.id = ?;`,
        [req.params.id]
    );

    res.render('post.njk', {
        post: rows[0],
        title: 'Forum',
    });
});

module.exports = router;


router.post('/new', async function (req, res, next) {
    const { author, title, content } = req.body;

    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM tn03users WHERE id = ?', [author]);
    if (!user) {
        user = await promisePool.query('INSERT INTO tn03users (name) VALUES (?)', [author]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren

    console.log(user[0])

    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO tn03forum (authorId, title, content) VALUES (?, ?, ?)', [userId, title, content]);
    res.redirect('/'); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});


//Login




/* GET home page. */


router.get('/index', async function (req, res, next) {

    res.render('login.njk', { title: 'Log' });
});

router.get('/profile', async function (req, res, next) {


    if (req.session.login == 1) {

        res.render('profile.njk', { title: 'Profile', name: req.session.username })
    }
    else {
        return res.status(401).send('Access denied')
    }

});

router.post('/profile', async function (req, res, next) {
    req.body = { logout };


});

router.get('/logout', async function (req, res, next) {

    res.render('logout.njk', { title: 'Logout' });
    req.session.login = 0;
});

router.post('/logout', async function (req, res, next) {


});

router.post('/index', async function (req, res, next) {
    const { username, password } = req.body;


    if (username.length == 0) {
        return res.send('Username is Required')
    }
    if (password.length == 0) {
        return res.send('Password is Required')
    }

    const [user] = await promisePool.query('SELECT * FROM tn03users WHERE name = ?', [username]);


    bcrypt.compare(password, user[0].password, function (err, result) {
        //logga in eller nåt

        if (result === true) {
            // return res.send('Welcome')
            console.log(username)
            req.session.username = username;
            req.session.login = 1;
            return res.redirect('/profile');
        }

        else {
            return res.send("Invalid username or password")
        }

    })


});

router.get('/crypt/:password', async function (req, res, next) {
    const password = req.params.password
    // const [password] = await promisePool.query('SELECT password FROM dbusers WHERE none = ?', [password]);
    bcrypt.hash(password, 10, function (err, hash) {
        return res.json({ hash });

    })
});

router.get('/register', function (req, res, next) {
    res.render('register.njk', { title: 'Register' });

});

router.post('/register', async function (req, res, next) {
    const { username, password, passwordConfirmation } = req.body;

    if (username === "") {
        console.log({ username })
        return res.send('Username is Required')

    }
    else if (password.length === 0) {
        return res.send('Password is Required')
    }
    else if (passwordConfirmation.length === 0) {
        return res.send('Password is Required')
    }
    else if (password !== passwordConfirmation) {
        return res.send('Passwords do not match')
    }

    const [user] = await promisePool.query('SELECT name FROM tn03users WHERE name = ?', [username]);
    console.log({ user })

    if (user.length > 0) {
        return res.send('Username is already taken')
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [creatUser] = await promisePool.query('INSERT INTO tn03users (name, password) VALUES (?, ?)', [username, hash]);
            res.redirect('/')
        })
    }

});

router.get('/delete', async function (req, res, next) {

    res.render('delete.njk', { title: 'Delete' });

});

router.post('/delete', async function (req, res, next) {
    const { username } = req.body;
    if (req.session.login === 1) {
        const [Delet] = await promisePool.query('DELETE FROM tn03users WHERE name = ?', [username]);
        req.session.login = 0
        res.redirect('/')
    }
});

module.exports = router;
