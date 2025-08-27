-- 1. Pharmacies Table 
CREATE TABLE IF NOT EXISTS pharmacies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table 
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'customer', -- 'admin', 'pharmacist', 'customer'
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Medications Table 
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    dosage VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    stock_quantity INT DEFAULT 0, -- Total stock (online + in-person)
    online_stock INT DEFAULT 0,   -- Reserved for online sales
    in_person_stock INT DEFAULT 0, -- Reserved for in-person sales
    low_stock_threshold INT DEFAULT 10, -- Alert when stock <= this value
    is_prescription_required BOOLEAN DEFAULT FALSE,
    pharmacy_id INTEGER REFERENCES pharmacies(id), 
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Carts Table (Unchanged)
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Cart Items Table 
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    medication_id INTEGER REFERENCES medications(id),
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Orders Table 
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    pharmacy_id INTEGER REFERENCES pharmacies(id), 
    total_price DECIMAL(10, 2),
    total_number_of_items INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'completed', 'cancelled', etc.
    order_type VARCHAR(20) DEFAULT 'online', -- 'online' or 'in_person'
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Order Items Table 
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    medication_id INTEGER REFERENCES medications(id),
    quantity INT NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    medication_id INTEGER REFERENCES medications(id),
    pharmacist_id INTEGER REFERENCES users(id), -- Who approved/rejected
    status VARCHAR(50) DEFAULT 'pending', -- 'approved', 'rejected'
    notes TEXT, -- Reason for rejection
    expiry_date TIMESTAMP,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Payment Transactions Table 
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    transaction_id VARCHAR(255) UNIQUE,
    payment_status VARCHAR(50),
    payment_method VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sales Reports Table (Monthly analytics)
CREATE TABLE IF NOT EXISTS sales_reports (
    id SERIAL PRIMARY KEY,
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    month INT NOT NULL, -- 1-12
    year INT NOT NULL,
    total_online_sales DECIMAL(10, 2) DEFAULT 0,
    total_in_person_sales DECIMAL(10, 2) DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    top_selling_products JSONB, -- {product_id, name, quantity_sold, revenue}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. User Prescriptions Table (Stores user prescription history)
CREATE TABLE IF NOT EXISTS user_prescriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    medication_id INTEGER REFERENCES medications(id),
    prescription_data JSONB, -- Stores prescription details
    status VARCHAR(50) DEFAULT 'active',
    issued_date TIMESTAMP,
    expiry_date TIMESTAMP,
    prescribing_doctor VARCHAR(255),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);