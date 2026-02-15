import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Save, X, Calculator, Package, Users, Truck, 
  Building2, AlertCircle, CheckCircle2, Edit2, TrendingUp,
  PieChart, RefreshCw, Loader2
} from 'lucide-react';
import api from '../../services/api';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const BudgetAllocation = ({ projectId, projectName, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState(null);
  const [isNew, setIsNew] = useState(true);
  const [formData, setFormData] = useState({
    project_id: projectId,
    order_reference: '',
    order_value: 0,
    material_budget: 0,
    labor_budget: 0,
    subcontractor_budget: 0,
    travel_budget: 0,
    overhead_budget: 0,
    contingency_budget: 0,
    notes: ''
  });

  useEffect(() => {
    fetchBudget();
  }, [projectId]);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/project-profit/budget/${projectId}`);
      if (response.data && response.data.project_id) {
        setBudget(response.data);
        setFormData({
          project_id: projectId,
          order_reference: response.data.order_reference || '',
          order_value: response.data.order_value || 0,
          material_budget: response.data.material_budget || 0,
          labor_budget: response.data.labor_budget || 0,
          subcontractor_budget: response.data.subcontractor_budget || 0,
          travel_budget: response.data.travel_budget || 0,
          overhead_budget: response.data.overhead_budget || 0,
          contingency_budget: response.data.contingency_budget || 0,
          notes: response.data.notes || ''
        });
        setIsNew(false);
      }
    } catch (err) {
      console.error('Error fetching budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'order_reference' || field === 'notes' ? value : parseFloat(value) || 0
    }));
  };

  const calculateTotal = () => {
    return formData.material_budget + formData.labor_budget + formData.subcontractor_budget +
           formData.travel_budget + formData.overhead_budget + formData.contingency_budget;
  };

  const calculateMargin = () => {
    const total = calculateTotal();
    if (formData.order_value === 0) return 0;
    return ((formData.order_value - total) / formData.order_value * 100).toFixed(1);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isNew) {
        await api.post('/project-profit/budget', formData);
      } else {
        await api.put(`/project-profit/budget/${projectId}`, formData);
      }
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error saving budget:', err);
      alert(err.response?.data?.detail || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/project-profit/budget/${projectId}/approve`);
      fetchBudget();
    } catch (err) {
      console.error('Error approving budget:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <RefreshCw className="animate-spin text-blue-500 mx-auto" size={32} />
          <p className="text-slate-600 mt-2">Loading budget...</p>
        </div>
      </div>
    );
  }

  const totalBudget = calculateTotal();
  const estimatedMargin = calculateMargin();
  const estimatedProfit = formData.order_value - totalBudget;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Budget Allocation</h2>
            <p className="text-sm text-slate-500">{projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            {budget && budget.status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                budget.status === 'approved' ? 'bg-green-100 text-green-700' :
                budget.status === 'revised' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {budget.status.toUpperCase()}
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Order Value Section */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <DollarSign size={18} />
              Revenue / Order Value
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Order Reference (Zoho/Manual)</label>
                <input
                  type="text"
                  value={formData.order_reference}
                  onChange={(e) => handleInputChange('order_reference', e.target.value)}
                  placeholder="e.g., SO-00001 or Manual Entry"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Order Value (₹)</label>
                <input
                  type="number"
                  value={formData.order_value}
                  onChange={(e) => handleInputChange('order_value', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-green-700"
                />
              </div>
            </div>
          </div>

          {/* Budget Breakdown */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Calculator size={18} />
              Budget Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                  <Package size={14} /> Material Cost
                </label>
                <input
                  type="number"
                  value={formData.material_budget}
                  onChange={(e) => handleInputChange('material_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                  <Users size={14} /> Labor Cost
                </label>
                <input
                  type="number"
                  value={formData.labor_budget}
                  onChange={(e) => handleInputChange('labor_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                  <Building2 size={14} /> Subcontractor
                </label>
                <input
                  type="number"
                  value={formData.subcontractor_budget}
                  onChange={(e) => handleInputChange('subcontractor_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                  <Truck size={14} /> Travel & Site
                </label>
                <input
                  type="number"
                  value={formData.travel_budget}
                  onChange={(e) => handleInputChange('travel_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Overhead</label>
                <input
                  type="number"
                  value={formData.overhead_budget}
                  onChange={(e) => handleInputChange('overhead_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Contingency</label>
                <input
                  type="number"
                  value={formData.contingency_budget}
                  onChange={(e) => handleInputChange('contingency_budget', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes about this budget..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {/* Summary */}
          <div className="bg-slate-100 rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <PieChart size={18} />
              Budget Summary
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-500">Order Value</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(formData.order_value)}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-500">Total Budget</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(totalBudget)}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-500">Est. Profit</p>
                <p className={`text-lg font-bold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(estimatedProfit)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-500">Est. Margin</p>
                <p className={`text-lg font-bold ${parseFloat(estimatedMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {estimatedMargin}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <div>
            {budget && budget.allocated_by && (
              <p className="text-xs text-slate-500">
                Last updated by {budget.allocated_by} on {budget.allocated_date}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isNew && budget?.status !== 'approved' && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isNew ? 'Create Budget' : 'Update Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetAllocation;
