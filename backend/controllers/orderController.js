const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Utility: rollback order (items + order)
async function rollbackOrder(orderId) {
  await supabase.from('order_items').delete().eq('order_id', orderId);
  await supabase.from('orders').delete().eq('id', orderId);
}

/* ============================================================
   CREATE ORDER
   ============================================================ */

const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let {
    isGuest = false,
    pharmacyId,
    items,
    orderType = 'online',
    shippingAddress = null,
    customerNotes = null,
    customerName = null,
    customerPhone = null,
    customerEmail = null
  } = req.body;

  // ✅ USE AUTHENTICATED USER ID, NOT FROM REQUEST BODY
  const userId = req.user?.userId; // From JWT token

  try {
    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy ID is required'
      });
    }

    // Guest checkout requirements
    if (isGuest) {
      if (!customerName || !customerPhone || !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Guest orders require name, phone, and email'
        });
      }
    } else {
      // ✅ Registered user - use authenticated userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User authentication required for registered user orders'
        });
      }
    }

    // Fetch medications
    const medicationIds = items.map(i => i.medicationId);

    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select('*')
      .in('id', medicationIds);

    if (medsError) throw medsError;

    if (!meds || meds.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing medications in order'
      });
    }

    // 🚨 Enforce that all items belong to the same pharmacy
    for (const med of meds) {
      if (med.pharmacy_id !== pharmacyId) {
        return res.status(400).json({
          success: false,
          message: `Medication ${med.name} does not belong to the selected pharmacy`
        });
      }
    }

    // Validate stock & calculate totals
    let totalPrice = 0;
    let totalItems = 0;

    for (const cartItem of items) {
      const med = meds.find(m => m.id === cartItem.medicationId);

      if (!med) {
        return res.status(404).json({
          success: false,
          message: `Medication not found: ${cartItem.medicationId}`
        });
      }

      // 🚨 Check stock
      if (med.online_stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${med.name}`
        });
      }

      totalPrice += Number(med.price) * cartItem.quantity;
      totalItems += cartItem.quantity;
    }

    // Create the order
    const orderId = uuidv4();
    const confirmationCode = isGuest
      ? Math.random().toString(36).substring(2, 10).toUpperCase()
      : null;

    console.log('📦 Creating order with user_id:', userId); // Debug log

    const { error: orderError } = await supabase.from('orders').insert([
      {
        id: orderId,
        user_id: isGuest ? null : userId, // ✅ Now using authenticated userId
        is_guest_order: isGuest,
        confirmation_code: confirmationCode,
        customer_name: isGuest ? customerName : null,
        customer_phone: isGuest ? customerPhone : null,
        customer_email: isGuest ? customerEmail : null,
        customer_notes: customerNotes,
        pharmacy_id: pharmacyId,
        total_price: totalPrice,
        total_number_of_items: totalItems,
        status: 'pending',
        shipping_address: shippingAddress,
        order_type: orderType
      }
    ]);

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(cartItem => {
      const med = meds.find(m => m.id === cartItem.medicationId);
      return {
        order_id: orderId,
        medication_id: med.id,
        quantity: cartItem.quantity,
        price_per_unit: med.price
      };
    });

    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemError) {
      await rollbackOrder(orderId);
      throw itemError;
    }

    // Reduce stock
    for (const cartItem of items) {
      const med = meds.find(m => m.id === cartItem.medicationId);

      const newOnlineStock = med.online_stock - cartItem.quantity;
      const newTotalStock = newOnlineStock + med.in_person_stock;

      const { error: stockError } = await supabase
        .from('medications')
        .update({
          online_stock: newOnlineStock,
          stock_quantity: newTotalStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', med.id);

      if (stockError) {
        await rollbackOrder(orderId);
        throw stockError;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId,
      confirmationCode,
      userId: userId // ✅ Return the userId used for debugging
    });

  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



/* ============================================================
   GET ORDER BY ID
   ============================================================ */
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          medication_id,
          quantity,
          price_per_unit,
          medications (name, dosage, image_url)
        ),
        pharmacies (name, address)
        // Removed clients reference
      `)
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, order: data });

  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};
/* ============================================================
   GET ALL ORDERS (admin/pharmacist)
   ============================================================ */

const getAllOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          medication_id,
          quantity,
          price_per_unit,
          medications (name, dosage, image_url)
        ),
        pharmacies (name, address)
        // Removed clients join since there's no name field
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, orders: data });

  } catch (error) {
    console.error('Get all orders error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/* ============================================================
   GET ORDERS FOR A USER
   ============================================================ */
const getUserOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          medication_id,
          quantity,
          price_per_unit,
          medications (name, dosage, image_url)
        ),
        pharmacies (name)
        // Removed clients reference
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, orders: data });

  } catch (error) {
    console.error('Get user orders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

/* ============================================================
   UPDATE ORDER STATUS
   ============================================================ */
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending','confirmed','processing','ready','completed','cancelled'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid order status' });

  try {
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Order status updated' });

  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

/* ============================================================
   GET ORDERS FOR AUTHENTICATED USER
   ============================================================ */
const getMyOrders = async (req, res) => {
  const userId = req.user.userId; // This should be the Supabase Auth user ID
  
  try {
    console.log('🔍 Fetching orders for user:', {
      userId: userId,
      email: req.user.email,
      userIdType: typeof userId,
      userIdLength: userId?.length
    });
    
    // First, let's check what orders exist for this user
    const { data: userOrders, error: userError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId);

    console.log('🔍 Raw user orders query results:', {
      query: `user_id = ${userId}`,
      results: userOrders,
      error: userError,
      count: userOrders?.length
    });

    // If no orders found with user_id, check if there are any guest orders with matching email
    if (!userOrders || userOrders.length === 0) {
      console.log('🔍 No orders found with user_id, checking guest orders...');
      
      const { data: guestOrders, error: guestError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', req.user.email)
        .eq('is_guest_order', true);

      console.log('🔍 Guest orders with matching email:', {
        email: req.user.email,
        results: guestOrders,
        count: guestOrders?.length
      });
    }

    // Now get the full order details with relationships
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          medication_id,
          quantity,
          price_per_unit,
          medications (name, dosage, image_url)
        ),
        pharmacies (name, address)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log(`✅ Final query found ${data?.length || 0} orders for user ${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      orders: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   GUEST ORDER LOOKUP BY CONFIRMATION CODE, EMAIL, OR PHONE
   ============================================================ */
const lookupGuestOrder = async (req, res) => {
  const { confirmationCode, email, phone } = req.body;
  
  try {
    // Validate that at least one search parameter is provided
    if (!confirmationCode && !email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide confirmation code, email, or phone number'
      });
    }

    console.log('🔍 Guest order lookup:', { confirmationCode, email, phone });

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          medication_id,
          quantity,
          price_per_unit,
          medications (name, dosage, image_url)
        ),
        pharmacies (name, address, contact_phone)
      `)
      .eq('is_guest_order', true);

    // Build query based on provided parameters
    if (confirmationCode) {
      query = query.eq('confirmation_code', confirmationCode.toUpperCase().trim());
    }
    if (email) {
      query = query.eq('customer_email', email.toLowerCase().trim());
    }
    if (phone) {
      query = query.eq('customer_phone', phone.trim());
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('❌ No guest orders found with provided criteria');
      return res.status(404).json({
        success: false,
        message: 'No orders found matching your search criteria'
      });
    }

    console.log(`✅ Found ${data.length} guest order(s)`);

    // Return order details (can include sensitive info since they verified ownership)
    const orders = data.map(order => ({
      id: order.id,
      confirmation_code: order.confirmation_code,
      status: order.status,
      total_price: order.total_price,
      total_number_of_items: order.total_number_of_items,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      order_type: order.order_type,
      shipping_address: order.shipping_address,
      customer_notes: order.customer_notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_items: order.order_items,
      pharmacy: order.pharmacies
    }));

    return res.status(200).json({
      success: true,
      message: `Found ${orders.length} order(s)`,
      orders: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('Guest order lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to lookup orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export all functions
module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  getUserOrders,
  getMyOrders,
  updateOrderStatus,
  lookupGuestOrder
};
