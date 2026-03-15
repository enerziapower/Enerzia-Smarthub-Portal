/**
 * GRN Management - Business Hub
 * 
 * Goods Received Notes for Purchase Orders
 * - Create GRN when materials are received
 * - Track partial/full receipts
 * - Link to PO and update statuses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck, Search, RefreshCw, Eye, Plus, X,
  CheckCircle, Clock, AlertTriangle, Truck, Building2,
  FileCheck, Package, Calendar, ClipboardList, Save, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const STATUS_CONFIG = {
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700' },
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' }
};

const GRNManagement = () => {
  const [loading, setLoading] = useState(true);
  const [grns, setGrns] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState({ total: 0, received: 0, partial: 0, pending_pos: 0 });

  const [grnFormData, setGrnFormData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    received_by: '',
    delivery_challan_no: '',
    vehicle_no: '',
    remarks: '',
    items: []
  });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch GRNs
      const grnRes = await fetch(`${API_URL}/api/project-requests/grn`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let grnList = [];
      if (grnRes.ok) {
        const data = await grnRes.json();
        grnList = data.grns || [];
        setGrns(grnList);
      }

      // Fetch Purchase Orders (for creating new GRN)
      const poRes = await fetch(`${API_URL}/api/project-requests/purchase-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let poList = [];
      if (poRes.ok) {
        const data = await poRes.json();
        poList = data.purchase_orders || [];
        setPurchaseOrders(poList);
      }

      // Calculate stats
      const pendingPOs = poList.filter(po => !['received', 'completed', 'cancelled'].includes(po.status));
      setStats({
        total: grnList.length,
        received: grnList.filter(g => !g.is_partial).length,
        partial: grnList.filter(g => g.is_partial).length,
        pending_pos: pendingPOs.length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load GRN data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open create GRN modal
  const openCreateModal = (po) => {
    setSelectedPO(po);
    // Pre-fill items from PO
    const items = (po.items || []).map(item => ({
      description: item.description,
      ordered_qty: item.quantity || 1,
      received_qty: item.quantity || 1,
      unit: item.unit || 'Nos',
      remarks: ''
    }));
    setGrnFormData({
      received_date: new Date().toISOString().split('T')[0],
      received_by: '',
      delivery_challan_no: '',
      vehicle_no: '',
      remarks: '',
      items: items
    });
    setShowCreateModal(true);
  };

  // Create GRN
  const handleCreateGRN = async () => {
    if (!selectedPO || grnFormData.items.length === 0) {
      toast.error('Please add items to receive');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/project-requests/grn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          po_id: selectedPO.id,
          ...grnFormData
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`GRN ${data.grn.grn_number} created`);
        setShowCreateModal(false);
        setSelectedPO(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create GRN');
      }
    } catch (error) {
      toast.error('Error creating GRN');
    } finally {
      setCreating(false);
    }
  };

  // Update item received qty
  const updateItemQty = (index, field, value) => {
    const newItems = [...grnFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setGrnFormData(prev => ({ ...prev, items: newItems }));
  };

  // Filter GRNs
  const filteredGrns = grns.filter(grn => {
    return !searchTerm ||
      grn.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // POs that can receive GRN
  const eligiblePOs = purchaseOrders.filter(po =>
    ['created', 'sent', 'confirmed', 'partially_received'].includes(po.status)
  );

  return (
    <div className="space-y-6" data-testid="grn-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PackageCheck className="text-emerald-600" />
              GRN Management
            </h2>
            <p className="text-sm text-slate-500">Track goods received against purchase orders</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search GRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Total GRNs</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Fully Received</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.received}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="text-sm text-slate-600">Partial Receipts</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.partial}</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Pending POs</span>
          </div>
          <p className="text-2xl font-bold text-violet-700">{stats.pending_pos}</p>
        </div>
      </div>

      {/* Pending POs Section */}
      {eligiblePOs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Truck size={18} className="text-amber-600" />
            POs Awaiting Receipt ({eligiblePOs.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eligiblePOs.slice(0, 6).map(po => (
              <div key={po.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-mono text-sm text-amber-700">{po.po_number}</span>
                  <p className="text-xs text-slate-500">{po.vendor_name} • {formatCurrency(po.total_amount)}</p>
                </div>
                <button
                  onClick={() => openCreateModal(po)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-1"
                >
                  <Plus size={14} /> GRN
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRN List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Goods Received Notes</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : filteredGrns.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <PackageCheck size={48} className="mx-auto text-slate-300 mb-4" />
            <p>No GRNs found</p>
            <p className="text-sm mt-2">Create GRN when materials are received against POs</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGrns.map(grn => (
              <div key={grn.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-emerald-600">{grn.grn_number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      grn.is_partial ? STATUS_CONFIG.partial.color : STATUS_CONFIG.received.color
                    }`}>
                      {grn.is_partial ? 'Partial' : 'Complete'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    <span className="font-mono text-violet-600">{grn.po_number}</span>
                    {' • '}{grn.vendor_name}
                  </p>
                </div>

                <div className="text-center px-4">
                  <p className="text-lg font-bold text-slate-800">
                    {grn.total_received}/{grn.total_ordered}
                  </p>
                  <p className="text-xs text-slate-500">Items Received</p>
                </div>

                <div className="text-center px-4 border-l border-slate-100">
                  <p className="text-sm font-medium text-slate-700">{formatDate(grn.received_date)}</p>
                  <p className="text-xs text-slate-500">Received</p>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                  <button
                    onClick={() => { setSelectedGRN(grn); setShowDetailModal(true); }}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create GRN Modal */}
      {showCreateModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <PackageCheck className="text-emerald-600" size={20} />
                  Create GRN
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedPO.po_number} • {selectedPO.vendor_name}
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Receipt Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Received Date *</label>
                  <input
                    type="date"
                    value={grnFormData.received_date}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, received_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
                  <input
                    type="text"
                    value={grnFormData.received_by}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, received_by: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Name of person receiving"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Challan No.</label>
                  <input
                    type="text"
                    value={grnFormData.delivery_challan_no}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, delivery_challan_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    value={grnFormData.vehicle_no}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, vehicle_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Items to Receive</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Item</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-24">Ordered</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-28">Received</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500 w-20">Unit</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 w-32">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grnFormData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-center font-medium">{item.ordered_qty}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.received_qty}
                              onChange={(e) => updateItemQty(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                              min="0"
                              max={item.ordered_qty}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-center"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => updateItemQty(idx, 'remarks', e.target.value)}
                              placeholder="Remarks"
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Overall Remarks</label>
                <textarea
                  value={grnFormData.remarks}
                  onChange={(e) => setGrnFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGRN}
                disabled={creating}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Create GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Detail Modal */}
      {showDetailModal && selectedGRN && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedGRN.grn_number}</h3>
                <p className="text-sm text-slate-500">{selectedGRN.po_number} • {selectedGRN.vendor_name}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/50 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Received Date</p>
                  <p className="font-medium">{formatDate(selectedGRN.received_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Received By</p>
                  <p className="font-medium">{selectedGRN.received_by || '-'}</p>
                </div>
                <div className={`rounded-lg p-3 ${selectedGRN.is_partial ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`font-medium ${selectedGRN.is_partial ? 'text-amber-700' : 'text-green-700'}`}>
                    {selectedGRN.is_partial ? 'Partial Receipt' : 'Complete Receipt'}
                  </p>
                </div>
              </div>

              {/* Delivery Info */}
              {(selectedGRN.delivery_challan_no || selectedGRN.vehicle_no) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Delivery Challan</p>
                    <p className="font-medium">{selectedGRN.delivery_challan_no || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vehicle No.</p>
                    <p className="font-medium">{selectedGRN.vehicle_no || '-'}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2">Items Received</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Item</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Ordered</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Received</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedGRN.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.ordered_qty}</td>
                          <td className={`px-3 py-2 text-center font-medium ${
                            item.received_qty < item.ordered_qty ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {item.received_qty}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {selectedGRN.remarks && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Remarks</p>
                  <p className="text-sm">{selectedGRN.remarks}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GRNManagement;
