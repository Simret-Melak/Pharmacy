const express = require('express');
const { checkAuth, checkRole } = require('../middleware/authMiddleware');
const pool = require('../db'); // Add this import

const router = express.Router();

// All routes require admin role
router.use(checkAuth);
router.use(checkRole('admin'));

// Real admin routes with database queries
router.get('/dashboard/stats', async (req, res) => {
  try {
    console.log('📊 Fetching real admin dashboard stats from database...');
    
    // Get total orders from database
    const totalOrdersResult = await pool.query('SELECT COUNT(*) FROM orders');
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Get today's orders
    const todayOrdersResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE'
    );
    const todaysOrders = parseInt(todayOrdersResult.rows[0].count);

    // Get pending orders
    const pendingOrdersResult = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'pending'"
    );
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].count);

    // Get total revenue
    const revenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as total_revenue FROM orders WHERE status != 'cancelled'"
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

    // Get today's revenue
    const todayRevenueResult = await pool.query(
      "SELECT COALESCE(SUM(total_price), 0) as todays_revenue FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled'"
    );
    const todaysRevenue = parseFloat(todayRevenueResult.rows[0].todays_revenue);

    // Get average order value
    const avgOrderResult = await pool.query(
      "SELECT COALESCE(AVG(total_price), 0) as avg_order_value FROM orders WHERE status != 'cancelled'"
    );
    const avgOrderValue = parseFloat(avgOrderResult.rows[0].avg_order_value);

    // Get status breakdown
    const statusBreakdownResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status 
      ORDER BY count DESC
    `);
    const statusBreakdown = statusBreakdownResult.rows;

    res.json({
      success: true,
      stats: {
        totalOrders,
        todaysOrders,
        pendingOrders,
        totalRevenue,
        todaysRevenue,
        avgOrderValue
      },
      statusBreakdown: statusBreakdown
    });

  } catch (error) {
    console.error('💥 Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard statistics' 
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    console.log('📦 Fetching real orders from database...', { status, page, limit });

    let baseQuery = `
      SELECT 
        o.*,
        p.name as pharmacy_name,
        p.address as pharmacy_address,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN pharmacies p ON o.pharmacy_id = p.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Add status filter
    if (status && status !== 'all') {
      paramCount++;
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Build final query
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    baseQuery += `
      GROUP BY o.id, p.id
      ORDER BY o.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}
    `;

    console.log('📊 Executing orders query:', baseQuery);
    const result = await pool.query(baseQuery, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT o.id) FROM orders o`;
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    const countResult = await pool.query(countQuery, queryParams);
    const totalOrders = parseInt(countResult.rows[0].count);

    console.log(`✅ Found ${result.rows.length} real orders from database`);

    res.json({
      success: true,
      orders: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders: totalOrders,
        hasNext: (parseInt(page) * parseInt(limit)) < totalOrders,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('💥 Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders from database' 
    });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('🔄 Updating real order status in database:', { orderId: id, newStatus: status });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    await client.query('BEGIN');

    const updateQuery = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await client.query(updateQuery, [status, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await client.query('COMMIT');

    console.log(`✅ Order ${id} status updated to ${status} in database`);

    res.json({
      success: true,
      message: `Order ${id} status updated to ${status}`,
      order: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating order status in database' 
    });
  } finally {
    client.release();
  }
});

module.exports = router;