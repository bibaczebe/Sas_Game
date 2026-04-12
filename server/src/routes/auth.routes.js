const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate }  = require('../middleware/auth.middleware');
const { authLimiter }   = require('../middleware/rateLimiter.middleware');

router.post('/register', authLimiter, ctrl.register);
router.post('/login',    authLimiter, ctrl.login);
router.post('/refresh',              ctrl.refresh);
router.post('/logout',   authenticate, ctrl.logout);
router.get('/me',        authenticate, ctrl.me);

module.exports = router;
