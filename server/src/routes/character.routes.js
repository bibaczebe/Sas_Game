const router = require('express').Router();
const ctrl   = require('../controllers/character.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter }   = require('../middleware/rateLimiter.middleware');

// All character routes require authentication
router.use(authenticate);
router.use(apiLimiter);

router.post('/',              ctrl.create);
router.get('/',               ctrl.getMyCharacter);
router.get('/snapshot',       ctrl.getSnapshot);
router.post('/allocate-stats',ctrl.allocateStats);

module.exports = router;
