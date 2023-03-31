const express = require('express');
const { response } = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../utils/database.js');
const session = require('express-session');
const promisePool = pool.promise();
const validator = require('validator')
var Filter = require('bad-words'),
    filter = new Filter();
    filter.addWords('agel')

module.exports = router;

const mysql = require('mysql2');



router.get('/', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM tn03forum");
    res.render('index.njk', {
        rows: rows,
        title: 'Forum',
    });
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
        return res.redirect('/denied');
    }

});

router.post('/new', async function (req, res, next) {
    const { author, title, content } = req.body;
    const response = {
        errors:[],
    };
    if (req.session.login == 1) {
        if (!title) response.errors.push('Title is required');
        if (!content)  response.errors.push('Content is required');
        if (title && title.length <= 3)
        response.errors.push('Title must be at least 3 characters');
        if (content && content.length <= 10)
        response.errors.push('Content must be at least 10 characters');
            
     
        if ( response.errors.length === 0) {
            console.log(response.errors)
            // sanitize title och body, tvätta datan
            const sanitize = (str) => {
                let temp = str.trim();
                temp = validator.stripLow(temp);
                temp = validator.escape(temp);
                return temp;
            };
            if (title) sanitizedTitle = filter.clean(sanitize(title));
            if (content) sanitizedContent = filter.clean(sanitize(content));

        
        const [rows] = await promisePool.query('INSERT INTO tn03forum (authorId, title, content) VALUES (?, ?, ?)',
        [req.session.userid, sanitizedTitle, sanitizedContent]);
        res.redirect('/forum');
        }
    }
    else
    {
        return res.redirect('/denied')
    }
});


router.get('/post/:id', async function (req, res) {
    const [rows] = await promisePool.query(
        `SELECT tn03forum.*, tn03users.name AS username
        FROM tn03forum
        JOIN tn03users ON tn03forum.authorId = tn03users.id
        WHERE tn03forum.id = ?;`,
        [req.params.id]
    );
    const [comment] = await promisePool.query(
        `SELECT tn03forum.*, tn03comments.content AS ucomment, tn03comments.authorid AS userid, tn03users.name
        FROM tn03forum
        JOIN tn03comments ON tn03forum.Id = tn03comments.postId
        JOIN tn03users ON tn03comments.authorId = tn03users.id
        WHERE tn03forum.id = ?`,
        [req.params.id]
    );

    res.render('post.njk', {
        post: rows[0],
        rows: comment,
        title: 'Post',
        loggedin: req.session.login,
    });
});

router.post('/comment', async function (req, res, next) {
    const {postId, content} = req.body;


    const errors = [];

    if (!content) errors.push('Content is required');
    if (content && content.length <= 10)
        errors.push('Content must be at least 10 characters');

    if (errors.length === 0) {
        // sanitize title och body, tvätta datan
        const sanitize = (str) => {
            let temp = str.trim();
            temp = validator.stripLow(temp);
            temp = validator.escape(temp);
            return temp;
        };
        if (content) sanitizedContent = filter.clean(sanitize(content));
    } else {
        return res.render('denied.njk')
    }

    
    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM tn03users WHERE id = ?', [req.session.userid]);
    if (!user) {
        user = await promisePool.query('INSERT INTO tn03users (name) VALUES (?)', [req.session.userid]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren
console.log(user[0])
    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO tn03comments (authorId, postId, content) VALUES (?, ?, ?)', [userId, postId, sanitizedContent]);
    res.redirect('/forum'); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});

router.get('/comment/:postid', async function (req, res, next) {
    if (req.session.login === 0) {
        
        res.redirect('/denied')
    } else {
        const [post] = await promisePool.query(
            `SELECT tn03forum.*, tn03users.name AS username
        FROM tn03forum
        JOIN tn03users ON tn03forum.authorId = tn03users.id
        WHERE tn03forum.id = ?;`,
            [req.params.postid]
        );
    res.render('comment.njk', {
        title: 'Ny kommentar',
        post: post[0],
        userId: req.session.userid,
        loggedin: req.session.loggedin,
    });
}
});


router.get('/index', async function (req, res, next) {

    res.render('login.njk', { title: 'Log' });
});

router.post('/index', async function (req, res, next) {
    const { username, password } = req.body;

    const [user] = await promisePool.query('SELECT * FROM tn03users WHERE name = ?', [username]);


    bcrypt.compare(password, user[0].password, function (err, result) {
        //logga in eller nåt

        if (result === true) {
            // return res.send('Welcome')
           
            req.session.username = username;
            req.session.login = 1;
            req.session.userid = user[0].id;
            return res.redirect('/profile');
        }
    

        else {
            return res.send("Invalid username or password")
        }
    })
    


});

router.get('/profile', async function (req, res, next) {


    if (req.session.login == 1) {

        res.render('profile.njk', { title: 'Profile', name: req.session.username })
    }
    else {
        return res.redirect('/denied');
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



router.get('/crypt/:password', async function (req, res, next) {
    const password = req.params.password
    // const [password] = await promisePool.query('SELECT password FROM dbusers WHERE none = ?', [password]);
    bcrypt.hash(password, 10, function (err, hash) {
        return res.json({ hash });

    })
});

router.get('/register', function (req, res, next) {
    
    if(req.session.login === undefined || req.session.login === 0){
    res.render('register.njk', { title: 'Register' });
    }
    else{
        return res.redirect('/denied');
}
});

router.post('/register', async function (req, res, next) {
    const { username, password, passwordConfirmation } = req.body;
    const char1 = ';';
    const char2 = '\'';
    const char3 = '*';
    
    if(req.session.login === undefined || req.session.login === 0){

    if (username < 3) {
        return res.send('Username needs at least 3 characters')
    }
    else if (username.includes(char1) ) {
        return res.send('Can\'t have ; in your username')
    }
    else if (username.includes(char2) ) {
        return res.send('Can\'t have \' in your username')
    }
    else if (username.includes(char3) ) {
        return res.send('Can\'t have * in your username')
    }
    else if (password.length < 8) {
        return res.send('Password needs at least 8 characters')
    }
    else if (passwordConfirmation.length < 8) {
        return res.send('PasswordConfirmation needs at least 8 characters')
    }
    else if (password !== passwordConfirmation) {
        return res.send('Passwords do not match')
    }

    const [user] = await promisePool.query('SELECT name FROM tn03users WHERE name = ?', [username]);


    if (user.length > 0) {
        return res.send('Username is already taken')
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [creatUser] = await promisePool.query('INSERT INTO tn03users (name, password) VALUES (?, ?)', [username, hash]);
            res.redirect('/')
        })
    }
}
else {
    return res.redirect('/denied');
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

router.get('/denied', async function (req, res, next) {

    res.render('denied.njk', { title: 'Access denied' });

});


module.exports = router;
