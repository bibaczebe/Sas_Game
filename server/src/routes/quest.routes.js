const router = require('express').Router();
const ctrl   = require('../controllers/quest.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter }   = require('../middleware/rateLimiter.middleware');

router.use(authenticate);
router.use(apiLimiter);

router.get('/',                       ctrl.listQuests);
router.post('/:questId/start',        ctrl.startQuest);
router.post('/:questId/choice',       ctrl.makeChoice);
router.get('/:questId/current',       ctrl.getCurrentStage);

module.exports = router;
