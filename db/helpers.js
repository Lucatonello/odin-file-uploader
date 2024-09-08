const pool = require('./pool');
const bcryptjs = require('bcryptjs');

const getUserByEmail = async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
};

const createUser = async (email, password) => {
    const hashedPassword = await bcryptjs.hash(password, 10);
    await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword]);
};

module.exports = { getUserByEmail, createUser };