'use strict';

const escapeHtml = require('escape-html');

module.exports = (app, db) => {

    /**
     * GET /
     * @summary Front End Entry Page (FIXED SSTI + Reflected XSS)
     */
    app.get('/', (req, res) => {

        const rawMessage = req.query.message || "Please log in to continue";
        const message = escapeHtml(rawMessage);

        res.render('user.html', { message });
    });

    /**
     * GET /register
     * @summary Register Page (FIXED XSS)
     */
    app.get('/register', (req, res) => {

        const rawMessage = req.query.message || "Please log in to continue";
        const message = escapeHtml(rawMessage);

        res.render('user-register.html', { message });
    });

    /**
     * GET /registerform
     * @summary Register user
     */
    app.get('/registerform', async (req, res) => {

        const { email, name, password, address } = req.query;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.redirect("/register?message=Invalid email address");
        }

        if (!password || password.length < 6) {
            return res.redirect("/register?message=Weak password");
        }

        try {
            const md5 = require('md5');

            const newUser = await db.user.create({
                name: escapeHtml(name),
                email,
                role: 'user',
                address: escapeHtml(address),
                password: md5(password)
            });

            res.redirect('/profile?id=' + newUser.id);

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Error registering user');
        }
    });

    /**
     * GET /login
     * @summary Login user
     */
    app.get('/login', async (req, res) => {

        const { email, password } = req.query;

        if (!email || !password) {
            return res.redirect('/?message=Missing credentials');
        }

        try {
            const md5 = require('md5');
            const users = await db.user.findAll({ where: { email } });

            if (!users.length || users[0].password !== md5(password)) {
                return res.redirect('/?message=Invalid credentials');
            }

            req.session.logged = true;
            req.session.userId = users[0].id;

            res.redirect('/profile?id=' + users[0].id);

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Login failed');
        }
    });

    /**
     * GET /profile
     * @summary User profile
     */
    app.get('/profile', async (req, res) => {

        if (!req.session.logged || !req.session.userId) {
            return res.redirect("/?message=Please log in first");
        }

        try {
            const user = await db.user.findOne({
                where: { id: req.session.userId },
                include: ['beers']
            });

            if (!user) {
                return res.redirect('/?message=User not found');
            }

            const beers = await db.beer.findAll();

            res.render('profile.html', { beers, user });

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Profile error');
        }
    });

    /**
     * GET /beer
     * @summary Beer page (FIXED XSS + IDOR)
     */
    app.get('/beer', async (req, res) => {

        if (!req.session.logged || !req.session.userId) {
            return res.redirect("/?message=Please log in");
        }

        const beerId = req.query.id;
        if (!beerId) {
            return res.redirect("/?message=Invalid beer");
        }

        try {
            const beer = await db.beer.findOne({
                where: { id: beerId },
                include: ['users']
            });

            if (!beer) {
                return res.redirect('/?message=Beer not found');
            }

            const user = await db.user.findOne({
                where: { id: req.session.userId }
            });

            const rawMessage = req.query.relationship || "...";
            const safeMessage = escapeHtml(rawMessage);

            res.render('beer.html', {
                beers: beer,
                message: safeMessage,
                user
            });

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Beer error');
        }
    });
};
