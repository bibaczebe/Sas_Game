const router = require('express').Router();
const ctrl   = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter }   = require('../middleware/rateLimiter.middleware');

router.use(authenticate);
router.use(apiLimiter);

router.get('/',         ctrl.getInventory);
router.post('/equip',   ctrl.equip);
router.post('/unequip', ctrl.unequip);

module.exports = router;
