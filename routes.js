const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth } = require('./middleware');

const router = Router();

/*
* PUBLIC CONTENT
*/

// CONTENT
router.get('/',              controllers.home_get);
router.get('/tag/:tag',      controllers.tag_get);
router.get('/reader/:slug',  controllers.post_get);
router.get('/reader/id/:id', controllers.post_get);

// GENERAL
router.get('/about',         (req, res) => res.render('about'));
router.get('/favicon.ico',   (req, res) => res.status(200).send('image/x-icon')); // 🟠 create favicon

// ADMIN
router.post('/login',        controllers.login_post);
router.get('/logout',        controllers.logout_get);

/*
* PRIVATE CONTENT
*/
router.get('/admin',         requireAuth, controllers.admin_get);
router.post('/signup',       requireAuth, controllers.signup_post);
router.get('/editor/:slug',  requireAuth, controllers.editor_get);
router.get('/editor',        requireAuth, controllers.editor_get);
router.post('/editor',       requireAuth, controllers.editor_post);
router.delete('/:_id',       requireAuth, controllers.editor_delete);

// router.get('*', controllers.handle_error); //TODO: set up error handler
// router.post('*', controllers.handle_error);

module.exports = router;