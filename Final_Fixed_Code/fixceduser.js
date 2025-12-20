'use strict';
require('dotenv').config();

const jwt = require("jsonwebtoken");

module.exports = (app, db) => {

    /* =========================
       🔐 HELPER: Verify JWT
    ========================== */
    function verifyJWT(req) {
        if (!req.headers.authorization) {
            throw new Error("Missing token");
        }

        const token = req.headers.authorization.split(' ')[1];

        return jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256'],
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE
            }
        );
    }

    /* =========================
       ADMIN – LIST USERS
    ========================== */
    app.get('/v1/admin/users/', async (req, res) => {
        try {
            const decoded = verifyJWT(req);

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: "Admin only" });
            }

            const users = await db.user.findAll({ include: "beers" });
            res.json(users);

        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    });

    /* =========================
       USER – GET USER (IDOR still exists but JWT ok)
    ========================== */
 app.get('/v1/user/:id', async (req, res) => {
  try {
    const decoded = verifyJWT(req);

    if (decoded.role !== 'admin' && decoded.id != req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await db.user.findOne({
      where: { id: req.params.id },
      include: 'beers'
    });

    res.json(user);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

    /* =========================
       USER – DELETE (JWT enforced)
    ========================== */
    app.delete('/v1/user/:id', async (req, res) => {
        try {
            const decoded = verifyJWT(req);

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: "Admin only" });
            }

            await db.user.destroy({ where: { id: req.params.id } });
            res.json({ result: "deleted" });

        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    });

    /* =========================
       LOGIN → ISSUE JWT
    ========================== */
    app.post('/v1/user/token', async (req, res) => {

        const { email, password } = req.body;

        const users = await db.user.findAll({ where: { email } });
        if (users.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const md5 = require('md5');
        if (users[0].password !== md5(password)) {
            return res.status(401).json({ error: "Wrong password" });
        }

        const payload = {
            id: users[0].id,
            role: users[0].role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '1h',
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE
            }
        );

        res.json({ jwt: token });
    });

    /* =========================
       ADMIN – PROMOTE USER
    ========================== */
    app.put('/v1/admin/promote/:id', async (req, res) => {
        try {
            const decoded = verifyJWT(req);

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: "Admin only" });
            }

            await db.user.update(
                { role: 'admin' },
                { where: { id: req.params.id } }
            );

            res.json({ result: "User promoted" });

        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    });
};
