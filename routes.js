const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth, checkUser } = require('./middleware');

const router = Router();

// Public pages
router.get('/',             controllers.home_get);
router.get('/tags',         controllers.tags_get);

router.get('/about',       (req, res) => res.render('about'));
router.get('/favicon.ico', (req, res) => res.status(200).send('image/x-icon'));

router.post('/login',       controllers.login_post);
router.get('/logout',       controllers.logout_get);
router.get('/reader/:slug', controllers.post_get);

// Private Pages
router.get('/admin',        requireAuth, controllers.admin_get);
router.post('/signup',      requireAuth, controllers.signup_post);
router.get('/editor/:slug', requireAuth, controllers.editor_get);
router.get('/editor',       requireAuth, controllers.editor_get);
router.post('/editor',      requireAuth, controllers.editor_post); // 🟢 next, get savepost working then return results

// router.get('*', controllers.handle_error); //TODO: set up error handler
// router.post('*', controllers.handle_error);

module.exports = router;