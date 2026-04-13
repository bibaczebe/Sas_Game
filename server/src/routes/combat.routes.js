const router = require('express').Router();
const ctrl   = require('../controllers/combat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter }   = require('../middleware/rateLimiter.middleware');

router.use(authenticate);
router.use(apiLimiter);

router.post('/start',   ctrl.startCombat);
router.post('/action',  ctrl.submitAction);
router.get('/enemies',  ctrl.getEnemies);

module.exports = router;
