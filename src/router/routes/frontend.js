'use strict';

module.exports = (app, db) => {

    /**
     * GET /
     * @summary Front End Entry Page (FIXED SSTI + Reflected XSS)
     * @tags frontend
     */
    app.get('/', (req, res) => {

        const message = req.query.message || "Please log in to continue";

        // ✅ No renderString – safe rendering with auto-escaping
        res.render('user.html', {
            message: message
        });
    });

    /**
     * GET /register
     * @summary Front End Register Page (FIXED SSTI + Reflected XSS)
     * @tags frontend
     */
    app.get('/register', (req, res) => {

        const message = req.query.message || "Please log in to continue";

        res.render('user-register.html', {
            message: message
        });
    });

    /**
     * GET /registerform
     * @summary Register user
     * @tags frontend
     */
    app.get('/registerform', async (req, res) => {

        const { email, name, password, address } = req.query;

        // ✅ basic input validation
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
                name,
                email,
                role: 'user',
                address,
                password: md5(password)
            });

            res.redirect('/profile?id=' + newUser.id);
        } catch (e) {
            console.error(e);
            res.redirect('/?message=Error registering, please try again');
        }
    });

    /**
     * GET /login
     * @summary Login user (Improved auth handling)
     * @tags frontend
     */
    app.get('/login', async (req, res) => {

        const { email, password } = req.query;

        if (!email || !password) {
            return res.redirect('/?message=Missing credentials');
        }

        try {
            const md5 = require('md5');
            const users = await db.user.findAll({ where: { email } });

            if (users.length === 0) {
                return res.redirect('/?message=Invalid credentials');
            }

            if (users[0].password !== md5(password)) {
                return res.redirect('/?message=Invalid credentials');
            }

            // ✅ successful login
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
     * @summary User profile (Improved access control)
     * @tags frontend
     */
    app.get('/profile', async (req, res) => {

        // ✅ require login
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

            res.render('profile.html', {
                beers,
                user
            });

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Error loading profile');
        }
    });

    /**
     * GET /beer
     * @summary Beer page (Improved IDOR handling)
     * @tags frontend
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

            let loveMessage = "...";

            if (req.query.relationship) {
                loveMessage = req.query.relationship;
            }

            res.render('beer.html', {
                beers: beer,
                message: loveMessage,
                user
            });

        } catch (e) {
            console.error(e);
            res.redirect('/?message=Error loading beer');
        }
    });
};
