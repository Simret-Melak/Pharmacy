import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTrash, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    const fetchCart = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCartItems(res.data);
        setFilteredItems(res.data);
        setSelectedItems(res.data.map(item => item.medication_id)); // select all by default
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch cart");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [token, navigate, API_URL]);

  const updateQuantity = async (medicationId, newQty) => {
    if (newQty < 0) return;

    try {
      await axios.put(
        `${API_URL}/api/cart/${medicationId}`,
        { quantity: newQty },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCartItems(prev =>
        newQty === 0
          ? prev.filter(item => item.medication_id !== medicationId)
          : prev.map(item =>
              item.medication_id === medicationId
                ? { ...item, quantity: newQty }
                : item
            )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update quantity");
    }
  };

  const removeItem = (medicationId) => {
    updateQuantity(medicationId, 0);
    setSelectedItems(prev => prev.filter(id => id !== medicationId));
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    const filtered = cartItems.filter(item =>
      item.name.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const toggleSelectItem = (medicationId) => {
    setSelectedItems(prev =>
      prev.includes(medicationId)
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
  };

  const totalPrice = cartItems
    .filter(item => selectedItems.includes(item.medication_id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) return <div>Loading cart...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px" }}>Your Cart</h1>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search cart..."
          style={{ padding: '10px 10px 10px 35px', width: '100%', borderRadius: '25px', border: '1px solid #ddd' }}
        />
      </div>

      {filteredItems.length === 0 ? (
        <p>No items found in your cart.</p>
      ) : (
        <>
          {filteredItems.map(item => (
            <div
              key={item.medication_id}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid #ddd",
                paddingBottom: "15px",
              }}
            >
              {/* Select Checkbox */}
              <input
                type="checkbox"
                checked={selectedItems.includes(item.medication_id)}
                onChange={() => toggleSelectItem(item.medication_id)}
                style={{ marginRight: "15px" }}
              />

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "contain",
                    marginRight: "20px",
                  }}
                />
              )}

              <div style={{ flex: 1 }}>
                <h3>{item.name}</h3>
                <p style={{ color: "#555" }}>{item.dosage}</p>
                <p style={{ fontWeight: "bold" }}>${item.price.toFixed(2)}</p>

                {/* Quantity Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => updateQuantity(item.medication_id, item.quantity - 1)}
                    style={{ padding: "5px 10px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.medication_id, item.quantity + 1)}
                    style={{ padding: "5px 10px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => removeItem(item.medication_id)}
                style={{ marginLeft: "20px", background: "none", border: "none", cursor: "pointer", color: "red" }}
              >
                <FaTrash />
              </button>
            </div>
          ))}

          {/* Total */}
          <div style={{ textAlign: "right", fontSize: "20px", fontWeight: "bold", marginTop: "20px" }}>
            Total: ${totalPrice.toFixed(2)}
          </div>

          {/* Checkout */}
          <div style={{ textAlign: "right", marginTop: "20px" }}>
            <button
              onClick={() => navigate("/checkout", { state: { items: selectedItems } })}
              disabled={selectedItems.length === 0}
              style={{
                padding: "12px 20px",
                backgroundColor: selectedItems.length === 0 ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: selectedItems.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
