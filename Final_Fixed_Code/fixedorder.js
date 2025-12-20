'use strict';
const fs = require('fs');
const path = require('path');

module.exports = (app, db) => {

    /**
     * GET /v1/order
     * @summary Use to list all available beer
     * @tags beer
     */
    app.get('/v1/order', async (req, res) => {
        const beers = await db.beer.findAll({ include: 'users' });
        res.json(beers);
    });

    /**
     * GET /v1/beer-pic/
     * @summary Get a picture of a beer (FIXED Path Traversal)
     * @tags beer
     */
    app.get('/v1/beer-pic/', (req, res) => {

        const filename = req.query.picture;

        // ✅ strict filename validation
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).send('Invalid filename');
        }

        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(filename).toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            return res.status(400).send('Invalid file type');
        }

        const uploadsDir = path.resolve(__dirname, '../../../uploads');
        const requestedPath = path.resolve(uploadsDir, filename);

        // ✅ robust traversal prevention
        const relative = path.relative(uploadsDir, requestedPath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            return res.status(403).send('Access denied');
        }

        fs.readFile(requestedPath, (err, data) => {
            if (err) {
                return res.status(404).send('File not found');
            }
            res.type(ext);
            res.send(data);
        });
    });

    /**
     * GET /v1/search/{filter}/{query}
     * @summary Search for a specific beer (FIXED SQL Injection)
     * @tags beer
     */
    app.get('/v1/search/:filter/:query', async (req, res) => {

        const allowedFilters = ['id', 'name', 'type', 'price'];
        const { filter, query } = req.params;

        // ✅ column allow-list
        if (!allowedFilters.includes(filter)) {
            return res.status(400).send('Invalid filter');
        }

        try {
            const sql = `SELECT * FROM beers WHERE ${filter} = :value`;
            const beers = await db.sequelize.query(sql, {
                replacements: { value: query },
                type: db.sequelize.QueryTypes.SELECT
            });

            res.status(200).json(beers);
        } catch (err) {
            res.status(500).send('Query failed');
        }
    });
};
