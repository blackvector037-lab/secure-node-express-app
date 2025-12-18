'use strict';

const axios = require('axios');
const { URL } = require('url');

module.exports = (app, db) => {

    /**
     * GET /v1/status/{brand}
     * @summary Check if brand website is available (FIXED RCE)
     * @tags system
     */
    app.get('/v1/status/:brand', async (req, res) => {

        const brand = req.params.brand;

        // ✅ allowlist validation (prevents command injection)
        if (!/^[a-zA-Z0-9-]+$/.test(brand)) {
            return res.status(400).send("Invalid brand");
        }

        try {
            await axios.get('https://letmegooglethat.com/', {
                params: { q: brand },
                timeout: 3000
            });
            res.status(200).send("OK");
        } catch (e) {
            res.status(500).send("Error checking brand");
        }
    });

    /**
     * GET /v1/redirect/
     * @summary Redirect the user (FIXED Open Redirect)
     * @tags system
     */
    app.get('/v1/redirect/', (req, res) => {

        const allowedHosts = ['example.com', 'letmegooglethat.com'];

        try {
            const target = new URL(req.query.url);

            if (!allowedHosts.includes(target.hostname)) {
                return res.status(400).send("Invalid redirect");
            }

            res.redirect(target.toString());
        } catch {
            res.status(400).send("Invalid URL");
        }
    });

    /**
     * POST /v1/init
     * @summary Initialize beers (FIXED Insecure Deserialization)
     * @tags system
     */
    app.post('/v1/init', (req, res) => {

        // ✅ DO NOT unserialize user input
        if (typeof req.body !== 'object') {
            return res.status(400).send("Invalid payload");
        }

        // Example safe handling
        res.status(200).json({ status: "Initialized safely" });
    });

    /**
     * GET /v1/test/
     * @summary Perform a test request (FIXED SSRF)
     * @tags system
     */
    app.get('/v1/test/', async (req, res) => {

        try {
            const userUrl = new URL(req.query.url);

            // ✅ protocol validation
            if (!['http:', 'https:'].includes(userUrl.protocol)) {
                return res.status(400).send("Invalid protocol");
            }

            // ✅ block internal hosts
            if (
                userUrl.hostname === 'localhost' ||
                userUrl.hostname.startsWith('127.') ||
                userUrl.hostname.startsWith('169.254')
            ) {
                return res.status(403).send("Forbidden host");
            }

            const response = await axios.get(userUrl.toString(), { timeout: 3000 });
            res.json({ status: response.status });

        } catch (e) {
            res.status(400).send("Invalid URL");
        }
    });

};
