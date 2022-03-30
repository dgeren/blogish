const { Router } = require('express');

const controllers = require('./controllers');
const { requireAuth } = require('./middleware');

const router = Router();


// NEW ROUTES
router.get('/', controllers.getListByPubDate);
router.get('/listByDate/:page', controllers.getListByPubDate);
router.get('/listByTags/:tag/:page', controllers.getListByTag);
router.get('/reader/slug/:slug', controllers.getEntry);
router.get('/reader/id/:_id', controllers.getEntry);
router.get('/editor/slug/:slug', controllers.getEditor);
router.get('/editor/id/:_id', controllers.getEditor);
router.get('/editor', controllers.getEditor);

router.get('/admin', controllers.getAdmin);
router.post('/signup', requireAuth, controllers.signup);
router.post('/login', controllers.login);
router.get('/logout', controllers.logout);

router.get('/about', (req, res) => res.render('getAbout'));
router.get('/favicon.ico', (req, res) => res.status(200).send('image/x-icon')); // 🟠 create favicon

router.get('*', controllers.getListByPubDate);
router.post('*', controllers.getListByPubDate);


// ORIIGNAL ROUTES
// router.get('/',                 controllers.getHome);
// router.get('/tag/:tag',         controllers.getEntriesByTag);
// router.get('/editor/:slug',     requireAuth, controllers.getEditor);
// router.get('/editor',           requireAuth, controllers.getEditor);
// router.post('/editor',          requireAuth, controllers.postEntry);
// router.delete('/:_id',          requireAuth, controllers.deleteEntry);
// router.get('*', controllers.handle_error); //TODO: set up error handler
// router.post('*', controllers.handle_error);

module.exports = router;