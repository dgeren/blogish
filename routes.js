const { Router } = require('express');

const controllers = require('./controllers');
const { checkUser } = require('./middleware');

const router = Router();


// LIST ROUTES
router.get('/', checkUser, controllers.getListByPubDate);
router.get('/listByDate/:page', checkUser, controllers.getListByPubDate);
router.get('/listByTags/:tag', checkUser, controllers.getListByTag);
router.get('/listByTags/:tag/:page', checkUser, controllers.getListByTag);
router.get('/contributors', checkUser, controllers.getContributors);

// READER ROUTES
router.get('/reader/slug/:slug', checkUser, controllers.getEntry);
router.get('/reader/id/:_id', checkUser, controllers.getEntry);
router.get('/reader/slug/:slug/id/:id', checkUser, controllers.getEntry);

// EDITOR ROUTES
router.get('/editor/slug/:slug', checkUser, controllers.getEditor);
router.get('/editor/preview', checkUser, controllers.getEditorPreview);
router.get('/editor/:_id', checkUser, controllers.getEditor);
router.get('/editor/slug/:slug/id/:id', checkUser, controllers.getEditor);
router.get('/editor', checkUser, controllers.getEditor);

router.post('/editor_preview', checkUser, controllers.getEditorPreview);
router.post('/editor', checkUser, controllers.postEntry);

router.delete('/:_id', checkUser, controllers.deleteEntry);

// AUTHENTICATION ROUTES
router.get('/logout', checkUser, controllers.logout);
router.get('/admin/:requestedUser', checkUser, controllers.getAdmin);
router.get('/admin', checkUser, controllers.getAdmin);
router.get('/listUnpublished', checkUser, controllers.getListUnpublished);

router.post('/login', controllers.login);
router.post('/createAccount', checkUser, controllers.createUser);

// STATIC CONTENT ROUTES
router.get('/about', (req, res) => res.render('getAbout'));
router.get('/favicon.ico', (req, res) => res.status(200).send('image/x-icon')); // 🟠 create favicon

// URL-ERROR ROUTES
router.get('*', controllers.getListByPubDate); // ! ADD 404 ERROR MESSAGE
router.post('*', controllers.getListByPubDate); // ! ADD 404 ERROR MESSAGE


module.exports = router;