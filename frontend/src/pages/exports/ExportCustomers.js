import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Search, Globe, DollarSign, 
  Phone, Mail, Building2, Check, X, Loader2, RefreshCw,
  MapPin, FileText, Download
} from 'lucide-react';
import { exportsAPI } from '../../services/api';

// Country options with currencies
const COUNTRIES = [
  { name: 'Saudi Arabia', code: 'SA', currency: 'USD' },
  { name: 'UAE', code: 'AE', currency: 'USD' },
  { name: 'Qatar', code: 'QA', currency: 'USD' },
  { name: 'Kuwait', code: 'KW', currency: 'USD' },
  { name: 'Oman', code: 'OM', currency: 'USD' },
  { name: 'Bahrain', code: 'BH', currency: 'USD' },
  { name: 'Singapore', code: 'SG', currency: 'SGD' },
  { name: 'Malaysia', code: 'MY', currency: 'USD' },
  { name: 'USA', code: 'US', currency: 'USD' },
  { name: 'UK', code: 'GB', currency: 'GBP' },
  { name: 'Germany', code: 'DE', currency: 'EUR' },
  { name: 'France', code: 'FR', currency: 'EUR' },
  { name: 'Australia', code: 'AU', currency: 'AUD' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'SGD', 'AUD', 'INR'];

const ExportCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    country: 'Saudi Arabia',
    currency: 'USD',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: 'Net 30',
    iec_no: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await exportsAPI.getCustomers();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      showMessage('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSeedCustomers = async () => {
    try {
      const response = await exportsAPI.seedCustomers();
      showMessage('success', response.data.message);
      await loadCustomers();
    } catch (error) {
      showMessage('error', 'Failed to seed customers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showMessage('error', 'Name and Code are required');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await exportsAPI.updateCustomer(editingCustomer.id, formData);
        showMessage('success', 'Customer updated successfully');
      } else {
        await exportsAPI.createCustomer(formData);
        showMessage('success', 'Customer created successfully');
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      resetForm();
      await loadCustomers();
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      code: customer.code || '',
      country: customer.country || 'Saudi Arabia',
      currency: customer.currency || 'USD',
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      payment_terms: customer.payment_terms || 'Net 30',
      iec_no: customer.iec_no || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to delete "${customerName}"?`)) return;
    
    try {
      await exportsAPI.deleteCustomer(customerId);
      showMessage('success', 'Customer deleted successfully');
      await loadCustomers();
    } catch (error) {
      showMessage('error', 'Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      country: 'Saudi Arabia',
      currency: 'USD',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'Net 30',
      iec_no: ''
    });
  };

  const handleCountryChange = (countryName) => {
    const country = COUNTRIES.find(c => c.name === countryName);
    setFormData({
      ...formData,
      country: countryName,
      currency: country?.currency || 'USD'
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Customers</h1>
          <p className="text-slate-500 mt-1">Manage your international export customers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedCustomers}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Download size={18} />
            Import Default
          </button>
          <button
            onClick={() => {
              setEditingCustomer(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search customers by name, code, or country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Countries</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(customers.map(c => c.country)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900">
                {customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.total_value || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Currency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No customers found</p>
                    <p className="text-sm text-slate-400 mt-1">Add a customer or import defaults to get started</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                          <span className="text-cyan-700 font-semibold">
                            {customer.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          {customer.email && (
                            <p className="text-sm text-slate-500">{customer.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded">
                        {customer.code}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className="text-slate-400" />
                        <span className="text-slate-700">{customer.country}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                        {customer.currency}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {customer.contact_person && (
                          <p className="text-slate-700">{customer.contact_person}</p>
                        )}
                        {customer.phone && (
                          <p className="text-slate-500 flex items-center gap-1">
                            <Phone size={12} /> {customer.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-900">{customer.total_orders || 0}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(customer.total_value || 0, customer.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {editingCustomer ? 'Update customer details' : 'Add a new export customer'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., HAWA Engineering Limited"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>

                {/* Customer Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., HAWA"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
                    required
                  />
                </div>

                {/* IEC No */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    IEC Number
                  </label>
                  <input
                    type="text"
                    value={formData.iec_no}
                    onChange={(e) => setFormData({ ...formData, iec_no: e.target.value })}
                    placeholder="e.g., 413053288"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.name}>{country.name}</option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Trading Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Primary contact name"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+966 xxx xxx xxx"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="Advance">Advance</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="COD">COD</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full business address"
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {editingCustomer ? 'Update Customer' : 'Add Customer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportCustomers;
