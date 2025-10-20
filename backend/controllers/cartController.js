const pool = require('../db');

// Add to cart
exports.addToCart = async (req, res) => {
  const userId = req.user.userId;   
  const { medicationId, quantity } = req.body;

  console.log('Authenticated user:', req.user);
  console.log('Add to cart request:', { medicationId, quantity });

  try {
    // Check if the user already has a cart
    let cart = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let cartId;

    if (cart.rows.length === 0) {
      // Create a new cart if none exists
      const insertRes = await pool.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      cartId = insertRes.rows[0].id;
      console.log(`Created new cart with ID: ${cartId}`);
    } else {
      cartId = cart.rows[0].id;
      console.log(`Existing cart found with ID: ${cartId}`);
    }

    // Check if the medication is already in the cart
    const existingItem = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND medication_id = $2',
      [cartId, medicationId]
    );

    if (existingItem.rows.length > 0) {
      // Update quantity if item already exists
      const newQty = existingItem.rows[0].quantity + quantity;
      await pool.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQty, existingItem.rows[0].id]
      );
      console.log(`Updated item quantity to ${newQty} for cart_item ID: ${existingItem.rows[0].id}`);
    } else {
      // Insert new cart item
      const medRes = await pool.query('SELECT price FROM medications WHERE id = $1', [medicationId]);

      if (medRes.rows.length === 0) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      const price = medRes.rows[0].price;

      await pool.query(
        'INSERT INTO cart_items (cart_id, medication_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [cartId, medicationId, quantity, price]
      );
      console.log(`Added new item to cart: medication ID ${medicationId}, quantity ${quantity}, price ${price}`);
    }

    res.status(200).json({ message: 'Item added to cart' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT 
         ci.id, 
         ci.medication_id, 
         ci.quantity, 
         ci.price::float AS price,  
         m.name, 
         m.image_url, 
         m.dosage
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN medications m ON ci.medication_id = m.id
       WHERE c.user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ message: 'Failed to get cart' });
  }
};



// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const medicationId = parseInt(req.params.medId, 10); // use URL param
    const { quantity } = req.body;

    if (!medicationId || quantity === undefined) {
      return res.status(400).json({ message: 'Medication ID and quantity required' });
    }

    // Get the user's cart
    const cartRes = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length === 0) return res.status(404).json({ message: 'Cart not found' });

    const cartId = cartRes.rows[0].id;

    if (quantity === 0) {
      // Delete the item
      await pool.query(
        'DELETE FROM cart_items WHERE cart_id = $1 AND medication_id = $2',
        [cartId, medicationId]
      );
      return res.json({ message: 'Item removed from cart' });
    }

    // Update existing item
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE cart_id = $2 AND medication_id = $3 RETURNING *',
      [quantity, cartId, medicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating cart item:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
