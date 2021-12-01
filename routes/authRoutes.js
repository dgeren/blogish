const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();
router.get('/',         authController.home_get);
router.get('/tags',     authController.tags_get);

router.get('/admin',    authController.admin_get);
router.post('/signup',  authController.signup_post);
router.post('/login',   authController.login_post);
router.get('/logout',   authController.logout_get);

router.get('/editor',   authController.editor_get);
router.post('/editor',  authController.editor_post);

module.exports = router;