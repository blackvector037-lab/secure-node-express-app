require('dotenv').config();
'use strict';

const express = require('express');
const config = require('./config');
const router = require('./router');
const bodyParser = require('body-parser');
const db = require('./orm');

const cookieParser = require('cookie-parser');
const session = require('express-session');

const expressJSDocSwagger = require('express-jsdoc-swagger');
const expressNunjucks = require('express-nunjucks');
const formidableMiddleware = require('express-formidable');
const sjs = require('sequelize-json-schema');

const app = express();
const PORT = config.PORT;

/* =========================
   Basic Middleware
========================= */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   Session Middleware (FIXED)
========================= */
if (!process.env.SESSION_SECRET) {
  console.error('[!] SESSION_SECRET is not set');
  process.exit(1);
}

app.use(session({
  name: 'sessionID',
  secret: process.env.SESSION_SECRET,   // ✅ REQUIRED
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                     // ✅ Fix XSS risk
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',                    // ✅ CSRF mitigation
    path: '/',
    maxAge: 1000 * 60 * 60,             // 1 hour
  }
}));

/* =========================
   Routes
========================= */
router(app, db);

/* =========================
   Swagger (API Docs)
========================= */
const docOptions = {
  info: {
    version: '1.0.0',
    title: 'Damn Vulnerable App',
    license: { name: 'MIT' },
  },
  security: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
    },
  },
  baseDir: __dirname,
  filesPattern: './../**/*.js',
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true,
  exposeApiDocs: true,
  apiDocsPath: '/v1/api-docs',
};

expressJSDocSwagger(app)(docOptions);

/* =========================
   Templating Engine (Nunjucks)
========================= */
app.set('views', __dirname + '/templates');
expressNunjucks(app, {
  watch: true,
  noCache: true            // ❗ intentionally insecure (SSTI lab)
});

/* =========================
   Static Files
========================= */
app.use(express.static('src/public'));

/* =========================
   Form Handling
========================= */
app.use(formidableMiddleware());

/* =========================
   Database Init
========================= */
db.sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`[+] Express listening on port: ${PORT}`);
  });
});

/* =========================
   Sequelize Schema Export
========================= */
const options = { exclude: ['id', 'createdAt', 'updatedAt'] };
sjs.getSequelizeSchema(db.sequelize, options);
