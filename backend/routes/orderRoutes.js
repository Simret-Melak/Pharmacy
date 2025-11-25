const express = require('express');
const { authenticateToken, requireAdminOrPharmacist } = require('../controllers/authController');
const orderController = require('../controllers/orderController');

const router = express.Router();

// Guest checkout
router.post('/guest', orderController.createOrder);

// Guest order lookup (no authentication required) - ONLY THIS ONE
router.post('/guest/lookup', orderController.lookupGuestOrder);

// Create order (authenticated users)
router.post('/', authenticateToken, orderController.createOrder);

// Get orders for authenticated user
router.get('/my-orders', authenticateToken, orderController.getMyOrders);

// Get all orders for a specific user (admin/pharmacist only)
router.get('/user/:userId', authenticateToken, requireAdminOrPharmacist, orderController.getUserOrders);

// Get a single order by ID
router.get('/:id', authenticateToken, orderController.getOrderById);

// Get all orders (admin/pharmacist only)
router.get('/', authenticateToken, requireAdminOrPharmacist, orderController.getAllOrders);

// Update order status
router.patch('/:id/status', authenticateToken, requireAdminOrPharmacist, orderController.updateOrderStatus);

module.exports = router;