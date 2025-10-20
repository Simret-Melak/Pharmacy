const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { checkAuth } = require('../middleware/authMiddleware'); 

router.use(checkAuth);

router.post('/add', cartController.addToCart);
router.get('/', cartController.getCart);
router.put('/:medId', cartController.updateCartItem);

module.exports = router;
