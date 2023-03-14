const express = require('express');
const router = express.Router();

module.exports = router;

const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
});
const promisePool = pool.promise();

router.get('/', async function (req, res) {
    res.send("Alla users i systemets");
});

router.get('/:id', async function (req, res) {
    const [rows] = await promisePool.query(`
    SELECT * FROM tn03users WHERE id = ?`, [req.params.id]);
    res.json({ id: req.params.id, user: rows[0] });
});

module.exports = router;