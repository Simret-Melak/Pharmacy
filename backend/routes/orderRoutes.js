// routes/orderRoutes.js
const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

// Public routes (no authentication required for guest orders)
router.post('/', orderController.createOrder);
router.get('/:confirmationCode', orderController.getOrderByConfirmationCode);
router.post('/find-by-customer', orderController.findOrdersByCustomer);

module.exports = router;