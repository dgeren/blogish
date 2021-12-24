const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth, checkUser } = require('./middleware');

const router = Router();

// Public pages
router.get('/',             controllers.home_get);

router.get('about', (req, res) => res.render('about'));
router.get('tags',  (req, res) => res.render('tags'));

router.post('/login',       controllers.login_post);
router.get('/logout',       controllers.logout_get);
router.get('/reader/:slug',  controllers.post_get);

//Private Pages
router.get('/admin',        requireAuth, controllers.admin_get);
router.post('/signup',      requireAuth, controllers.signup_post);
router.get('/editor',       requireAuth, controllers.editor_get);
router.get('/editor/:slug', requireAuth, controllers.editor_get); // 🟢 HERE after savePost response
router.post('/savePost',    requireAuth, controllers.editor_post); // 🟢 next, set up response for save attempt

module.exports = router;