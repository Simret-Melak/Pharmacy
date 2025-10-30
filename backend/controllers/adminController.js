// src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    pharmacy_id: ''
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [statsResponse, ordersResponse] = await Promise.all([
        axios.get('/api/admin/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
          params: filters
        })
      ]);

      setStats(statsResponse.data.stats);
      setOrders(ordersResponse.data.orders);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(`/api/admin/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchDashboardData();
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchDashboardData();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-warning',
      processing: 'bg-info',
      ready: 'bg-primary',
      completed: 'bg-success',
      cancelled: 'bg-danger',
      on_the_way: 'bg-primary', // Blue for "On the way"
      delivered: 'bg-success'   // Green for "Delivered"
    };
    
    return `badge ${statusColors[status] || 'bg-secondary'}`;
  };

  // Helper function to get status display name
  const getStatusDisplayName = (status) => {
    const statusNames = {
      pending: 'Pending',
      processing: 'Processing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled',
      on_the_way: 'On the Way',
      delivered: 'Delivered'
    };
    return statusNames[status] || status;
  };

  // Check if order is delivery type
  const isDeliveryOrder = (order) => {
    return order.order_type === 'delivery' || order.order_type === 'online';
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Dashboard Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>🏥 Admin Dashboard</h2>
          <p className="text-muted mb-0">Manage all pharmacy orders and view analytics</p>
        </div>
        <button 
          className="btn btn-outline-primary"
          onClick={fetchDashboardData}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Orders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.totalOrders}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clipboard-list fa-2x text-gray-300">📋</i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Today's Orders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.todaysOrders}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar-day fa-2x text-gray-300">📅</i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Pending Orders
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.pendingOrders}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-clock fa-2x text-gray-300">⏰</i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Revenue
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    ${stats.totalRevenue?.toFixed(2)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300">💰</i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Status Filter</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="on_the_way">On the Way</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Actions</label>
              <div>
                <button 
                  className="btn btn-primary me-2"
                  onClick={applyFilters}
                >
                  Apply Filters
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setFilters({ status: 'all', pharmacy_id: '' })}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            All Orders ({orders.length})
          </h5>
          <div className="text-muted small">
            Showing {orders.length} orders
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Pharmacy</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id}</strong>
                      {order.is_guest_order && (
                        <span className="badge bg-info ms-1">Guest</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <strong>{order.customer_name}</strong>
                        <br />
                        <small className="text-muted">{order.customer_phone}</small>
                      </div>
                    </td>
                    <td>
                      <small>{order.pharmacy_name}</small>
                    </td>
                    <td>
                      <span className={`badge ${isDeliveryOrder(order) ? 'bg-primary' : 'bg-secondary'}`}>
                        {isDeliveryOrder(order) ? 'Delivery' : 'Pickup'}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary">
                        {order.item_count} items
                      </span>
                    </td>
                    <td>
                      <strong>${order.total_price}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(order.status)}`}>
                        {getStatusDisplayName(order.status)}
                      </span>
                    </td>
                    <td>
                      <small>
                        {new Date(order.created_at).toLocaleDateString()}
                        <br />
                        {new Date(order.created_at).toLocaleTimeString()}
                      </small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setSelectedOrder(order)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        
                        {/* Status update buttons */}
                        {order.status === 'pending' && (
                          <button
                            className="btn btn-outline-success"
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            title="Start Processing"
                          >
                            ⚡
                          </button>
                        )}
                        
                        {order.status === 'processing' && (
                          <>
                            {isDeliveryOrder(order) ? (
                              <>
                                <button
                                  className="btn btn-outline-info"
                                  onClick={() => updateOrderStatus(order.id, 'on_the_way')}
                                  title="Mark as On the Way"
                                >
                                  🚚
                                </button>
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => updateOrderStatus(order.id, 'ready')}
                                  title="Mark Ready for Pickup"
                                >
                                  📦
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-outline-info"
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                title="Mark Ready for Pickup"
                              >
                                ✅
                              </button>
                            )}
                          </>
                        )}
                        
                        {order.status === 'on_the_way' && (
                          <button
                            className="btn btn-outline-success"
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            title="Mark as Delivered"
                          >
                            🎉
                          </button>
                        )}
                        
                        {order.status === 'ready' && (
                          <button
                            className="btn btn-outline-success"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            title="Mark Completed"
                          >
                            🎉
                          </button>
                        )}
                        
                        {order.status === 'delivered' && (
                          <button
                            className="btn btn-outline-success"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            title="Mark Completed"
                          >
                            ✅
                          </button>
                        )}
                        
                        {!['cancelled', 'completed'].includes(order.status) && (
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            title="Cancel Order"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Order Details #{selectedOrder.id}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setSelectedOrder(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Customer Information</h6>
                    <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>Phone:</strong> {selectedOrder.customer_phone}</p>
                    {selectedOrder.customer_email && (
                      <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                    )}
                    {selectedOrder.customer_notes && (
                      <p><strong>Notes:</strong> {selectedOrder.customer_notes}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6>Order Information</h6>
                    <p><strong>Pharmacy:</strong> {selectedOrder.pharmacy_name}</p>
                    <p><strong>Type:</strong> {isDeliveryOrder(selectedOrder) ? 'Delivery' : 'Pickup'}</p>
                    <p><strong>Status:</strong> 
                      <span className={`badge ${getStatusBadge(selectedOrder.status)} ms-2`}>
                        {getStatusDisplayName(selectedOrder.status)}
                      </span>
                    </p>
                    <p><strong>Total:</strong> ${selectedOrder.total_price}</p>
                    <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <h6 className="mt-4">Order Items</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th>Prescription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <strong>{item.medication_name}</strong>
                              {item.category && (
                                <div>
                                  <small className="text-muted">{item.category}</small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>{item.quantity}</td>
                          <td>${item.price_per_unit}</td>
                          <td>${item.total_price}</td>
                          <td>
                            {item.requires_prescription ? (
                              <span className="badge bg-warning">📋 Required</span>
                            ) : (
                              <span className="badge bg-success">✅ Not Required</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ ADD THIS EXPORT AT THE END
export default AdminDashboard;