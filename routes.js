const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth, checkUser } = require('./middleware');

const router = Router();
router.get('/',           controllers.home_get);

router.get('about', (req, res) => res.render('about'));
router.get('tags', (req, res) => res.render('tags'));

router.post('/login',     controllers.login_post);
router.get('/logout',     controllers.logout_get);
router.get('post/:slug',  controllers.post_get);

router.get('/admin',      requireAuth, controllers.admin_get);
router.post('/signup',    requireAuth, controllers.signup_post);
router.get('/editor',     requireAuth, controllers.editor_get);
router.post('/savePost',  requireAuth, controllers.editor_post);

module.exports = router;