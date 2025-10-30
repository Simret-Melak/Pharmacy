const pool = require('../db');
const crypto = require('crypto');

// Generate unique confirmation code
const generateConfirmationCode = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🛒 Creating new order...', req.body);
    
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerNotes,
      pharmacyId,
      orderType = 'online',
      items,
      isGuestOrder = true
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !pharmacyId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, phone, pharmacy, and items are required'
      });
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();
    
    await client.query('BEGIN');

    // Calculate totals
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalNumberOfItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // 1. Create the order
    const orderQuery = `
      INSERT INTO orders (
        customer_name, 
        customer_phone, 
        customer_email,
        customer_notes,
        pharmacy_id, 
        order_type, 
        confirmation_code,
        is_guest_order,
        total_price,
        total_number_of_items,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const orderResult = await client.query(orderQuery, [
      customerName,
      customerPhone,
      customerEmail || null,
      customerNotes || null,
      pharmacyId,
      orderType,
      confirmationCode,
      isGuestOrder,
      totalPrice,
      totalNumberOfItems,
      'pending'
    ]);

    const order = orderResult.rows[0];
    console.log('✅ Order created:', order.id);

    // 2. Create order items
    for (const item of items) {
      const orderItemQuery = `
        INSERT INTO order_items (
          order_id, 
          medication_id, 
          quantity, 
          price_per_unit
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await client.query(orderItemQuery, [
        order.id,
        item.medicationId,
        item.quantity,
        item.price
      ]);

      // 3. Update medication stock
      const updateStockQuery = `
        UPDATE medications 
        SET 
          online_stock = online_stock - $1,
          stock_quantity = stock_quantity - $1,
          updated_at = NOW()
        WHERE id = $2 AND online_stock >= $1
      `;
      
      const updateResult = await client.query(updateStockQuery, [item.quantity, item.medicationId]);
      
      if (updateResult.rowCount === 0) {
        throw new Error(`Insufficient stock for medication ID: ${item.medicationId}`);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order,
      confirmationCode: confirmationCode
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Create order error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

exports.getOrderByConfirmationCode = async (req, res) => {
  try {
    const { confirmationCode } = req.params;

    const orderQuery = `
      SELECT 
        o.*,
        p.name as pharmacy_name,
        p.address as pharmacy_address,
        p.contact_phone as pharmacy_phone
      FROM orders o
      LEFT JOIN pharmacies p ON o.pharmacy_id = p.id
      WHERE o.confirmation_code = $1
    `;

    const result = await pool.query(orderQuery, [confirmationCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = result.rows[0];

    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        m.name as medication_name,
        m.description as medication_description
      FROM order_items oi
      LEFT JOIN medications m ON oi.medication_id = m.id
      WHERE oi.order_id = $1
    `;

    const itemsResult = await pool.query(itemsQuery, [order.id]);

    res.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

exports.findOrdersByCustomer = async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail } = req.body;

    // Validation
    if (!customerName || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required'
      });
    }

    console.log('🔍 Searching for orders by customer:', {
      name: customerName,
      phone: customerPhone,
      email: customerEmail
    });

    let query = `
      SELECT 
        o.*,
        p.name as pharmacy_name,
        p.address as pharmacy_address,
        p.contact_phone as pharmacy_phone
      FROM orders o
      LEFT JOIN pharmacies p ON o.pharmacy_id = p.id
      WHERE o.customer_name ILIKE $1 AND o.customer_phone = $2
    `;

    let params = [`%${customerName.trim()}%`, customerPhone.trim()];

    // Add email to search if provided
    if (customerEmail && customerEmail.trim()) {
      query += ' AND o.customer_email ILIKE $3';
      params.push(`%${customerEmail.trim()}%`);
    }

    query += ' ORDER BY o.created_at DESC LIMIT 10';

    console.log('📊 Executing query:', query, 'with params:', params);

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} orders`);

    res.json({
      success: true,
      orders: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('💥 Find orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search for orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};