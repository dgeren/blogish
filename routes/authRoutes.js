const { Router } = require('express');

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
router.get('/',         authController.home_get);
router.post('/login',   authController.login_post);
router.get('/logout',   authController.logout_get);

router.get('/admin',    requireAuth, authController.admin_get);
router.post('/signup',  requireAuth, authController.signup_post);
router.get('/editor',   requireAuth, authController.editor_get);
router.post('/editor',  requireAuth, authController.editor_post);

module.exports = router;