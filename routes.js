const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth } = require('./middleware');

const router = Router();

/*
* PUBLIC CONTENT
*/

// CONTENT
router.get('/',              controllers.getHome);
router.get('/tag/:tag',      controllers.getEntriesByTag);
router.get('/reader/:slug',  controllers.getOneEntry);
router.get('/reader/id/:id', controllers.getOneEntry);

// GENERAL
router.get('/about',         (req, res) => res.render('getAbout'));
router.get('/favicon.ico',   (req, res) => res.status(200).send('image/x-icon')); // 🟠 create favicon

// ADMIN
router.post('/login',        controllers.login);
router.get('/logout',        controllers.logout);

/*
* PRIVATE CONTENT
*/
router.get('/admin',         requireAuth, controllers.getAdmin);
router.post('/signup',       requireAuth, controllers.signup);
router.get('/editor/:slug',  requireAuth, controllers.getEditor);
router.get('/editor',        requireAuth, controllers.getEditor);
router.post('/editor',       requireAuth, controllers.postEntry);
router.delete('/:_id',       requireAuth, controllers.deleteEntry);

// router.get('*', controllers.handle_error); //TODO: set up error handler
// router.post('*', controllers.handle_error);

module.exports = router;