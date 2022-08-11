const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth } = require('./middleware');

const router = Router();


// NEW ROUTES
router.get('/', controllers.getListByPubDate);
router.get('/listByDate/:page', controllers.getListByPubDate);
router.get('/listByTags/:tag', controllers.getListByTag);
router.get('/listByTags/:tag/:page', controllers.getListByTag);
router.get('/archive', controllers.getArchive);
router.get('/categories', controllers.getCategories);
router.get('/reader/slug/:slug', controllers.getEntry);
router.get('/reader/id/:_id', controllers.getEntry);
router.get('/editor/slug/:slug', requireAuth, controllers.getEditor);
router.get('/editor/preview', requireAuth, controllers.getEditorPreview);
router.get('/editor/id/:_id', requireAuth, controllers.getEditor);
router.get('/editor', requireAuth, controllers.getEditor);
router.post('/editor_preview', requireAuth, controllers.getEditorPreview)
router.post('/editor', requireAuth, controllers.postEntry);
router.delete('/:_id', requireAuth, controllers.deleteEntry);

router.get('/admin', requireAuth, controllers.getAdmin);
router.get('/listUnpublished', requireAuth, controllers.getListUnpublished);
router.post('/signup', requireAuth, controllers.signup);
router.post('/login', controllers.login);
router.get('/logout', controllers.logout);

router.get('/about', (req, res) => res.render('getAbout'));
router.get('/favicon.ico', (req, res) => res.status(200).send('image/x-icon')); // 🟠 create favicon

router.get('*', controllers.getListByPubDate);
router.post('*', controllers.getListByPubDate);

module.exports = router;