import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Phone, MapPin, Calendar, Clock, User, Building2, Mail,
  PhoneCall, Car, MessageSquare, Search, X, Loader2
} from 'lucide-react';

const followupTypes = [
  { id: 'cold_call', label: 'Cold Call', icon: PhoneCall, color: 'blue', description: 'First contact with new leads' },
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'emerald', description: 'Scheduled visit to customer location' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'amber', description: 'Customer asked to call later' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'violet', description: 'Customer asked to visit again' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate', description: 'Miscellaneous follow-up' },
];

const FollowUpForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNewLead, setIsNewLead] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_type: 'domestic',
    selectedCustomer: null,
    lead_name: '',
    lead_company: '',
    lead_email: '',
    lead_phone: '',
    lead_address: '',
    followup_type: 'cold_call',
    title: '',
    description: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '10:00',
    priority: 'medium',
    assigned_to: '',
    assigned_to_name: '',
    location: '',
    contact_person: '',
    contact_phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchTeamMembers();
    if (isEdit) {
      fetchFollowup();
    }
  }, [id]);

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/lead-management/team-members');
      setTeamMembers(res.data.team || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchFollowup = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/lead-management/followups/${id}`);
      const data = res.data;
      
      setIsNewLead(!data.is_existing_customer);
      setFormData({
        customer_id: data.customer_id || '',
        customer_type: data.customer_type || 'domestic',
        selectedCustomer: data.is_existing_customer ? {
          id: data.customer_id,
          name: data.customer_name,
          type: data.customer_type
        } : null,
        lead_name: data.lead_name || '',
        lead_company: data.lead_company || '',
        lead_email: data.lead_email || '',
        lead_phone: data.lead_phone || '',
        lead_address: data.lead_address || '',
        followup_type: data.followup_type || 'cold_call',
        title: data.title || '',
        description: data.description || '',
        scheduled_date: data.scheduled_date ? data.scheduled_date.split('T')[0] : '',
        scheduled_time: data.scheduled_time || '10:00',
        priority: data.priority || 'medium',
        assigned_to: data.assigned_to || '',
        assigned_to_name: data.assigned_to_name || '',
        location: data.location || '',
        contact_person: data.contact_person || '',
        contact_phone: data.contact_phone || '',
        notes: data.notes || '',
      });
      
      if (!data.is_existing_customer) {
        setCustomerSearch(data.lead_company || data.lead_name || '');
      } else {
        setCustomerSearch(data.customer_name || '');
      }
    } catch (error) {
      console.error('Error fetching follow-up:', error);
      toast.error('Failed to load follow-up');
      navigate('/sales/lead-management');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return;
    }
    
    try {
      const [domesticRes, overseasRes] = await Promise.all([
        api.get(`/domestic-customers?search=${query}`),
        api.get(`/overseas-customers?search=${query}`),
      ]);
      
      const domestic = (domesticRes.data.customers || []).map(c => ({
        ...c,
        type: 'domestic',
        display_name: c.company_name || c.name
      }));
      const overseas = (overseasRes.data.customers || []).map(c => ({
        ...c,
        type: 'overseas',
        display_name: c.company_name || c.name
      }));
      
      setCustomers([...domestic, ...overseas]);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    searchCustomers(value);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_type: customer.type,
      selectedCustomer: customer,
      contact_person: customer.contact_person || customer.name || '',
      contact_phone: customer.phone || '',
    }));
    setCustomerSearch(customer.display_name);
    setShowCustomerDropdown(false);
    setIsNewLead(false);
  };

  const handleNewLead = () => {
    setIsNewLead(true);
    setFormData(prev => ({
      ...prev,
      customer_id: '',
      selectedCustomer: null,
      lead_company: customerSearch,
    }));
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customer_id: '',
      selectedCustomer: null,
      lead_name: '',
      lead_company: '',
      lead_email: '',
      lead_phone: '',
      lead_address: '',
    }));
    setCustomerSearch('');
    setIsNewLead(false);
  };

  const handleAssigneeChange = (e) => {
    const userId = e.target.value;
    const member = teamMembers.find(m => m.id === userId);
    setFormData(prev => ({
      ...prev,
      assigned_to: userId,
      assigned_to_name: member?.name || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isNewLead && !formData.customer_id) {
      toast.error('Please select a customer or create a new lead');
      return;
    }
    if (isNewLead && !formData.lead_name && !formData.lead_company) {
      toast.error('Please enter lead name or company');
      return;
    }
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.scheduled_date) {
      toast.error('Please select a date');
      return;
    }
    
    try {
      setSaving(true);
      
      const payload = {
        customer_id: isNewLead ? null : formData.customer_id,
        customer_type: isNewLead ? null : formData.customer_type,
        lead_name: isNewLead ? formData.lead_name : null,
        lead_company: isNewLead ? formData.lead_company : null,
        lead_email: isNewLead ? formData.lead_email : null,
        lead_phone: isNewLead ? formData.lead_phone : null,
        lead_address: isNewLead ? formData.lead_address : null,
        followup_type: formData.followup_type,
        title: formData.title,
        description: formData.description,
        scheduled_date: new Date(formData.scheduled_date + 'T00:00:00Z').toISOString(),
        scheduled_time: formData.scheduled_time,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
        assigned_to_name: formData.assigned_to_name || null,
        location: formData.location,
        contact_person: formData.contact_person,
        contact_phone: formData.contact_phone,
        notes: formData.notes,
      };
      
      if (isEdit) {
        await api.put(`/lead-management/followups/${id}`, payload);
        toast.success('Follow-up updated successfully');
      } else {
        await api.post('/lead-management/followups', payload);
        toast.success('Follow-up created successfully');
      }
      
      navigate('/sales/lead-management');
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast.error('Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  const getTypeColors = (typeColor, isSelected) => {
    const colors = {
      blue: isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-blue-300',
      emerald: isSelected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-gray-200 bg-white hover:border-emerald-300',
      amber: isSelected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-200 bg-white hover:border-amber-300',
      violet: isSelected ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-gray-200 bg-white hover:border-violet-300',
      slate: isSelected ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-200' : 'border-gray-200 bg-white hover:border-slate-300',
    };
    return colors[typeColor] || colors.slate;
  };

  const getIconColors = (typeColor, isSelected) => {
    const colors = {
      blue: isSelected ? 'text-blue-600' : 'text-gray-400',
      emerald: isSelected ? 'text-emerald-600' : 'text-gray-400',
      amber: isSelected ? 'text-amber-600' : 'text-gray-400',
      violet: isSelected ? 'text-violet-600' : 'text-gray-400',
      slate: isSelected ? 'text-slate-600' : 'text-gray-400',
    };
    return colors[typeColor] || colors.slate;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="followup-form" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/sales/lead-management')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Follow-up' : 'New Follow-up'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update follow-up details' : 'Schedule a new customer follow-up'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer/Lead Selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-gray-900 font-medium mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            Customer / Lead
          </h3>
          
          {!isNewLead ? (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm text-gray-600 mb-2">Search Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={handleCustomerSearchChange}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search by company name, contact..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {customers.length > 0 ? (
                      customers.map(customer => (
                        <button
                          key={`${customer.type}-${customer.id}`}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="text-gray-900 font-medium">{customer.display_name}</p>
                          <p className="text-gray-500 text-sm">
                            {customer.type === 'domestic' ? '🇮🇳 Domestic' : '🌍 Overseas'}
                            {customer.email && ` • ${customer.email}`}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">No customers found</div>
                    )}
                    <button
                      type="button"
                      onClick={handleNewLead}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 text-blue-600 font-medium border-t border-gray-200"
                    >
                      + Create New Lead "{customerSearch}"
                    </button>
                  </div>
                )}
              </div>
              
              {formData.selectedCustomer && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-emerald-700 text-sm mb-1">Selected Customer</p>
                  <p className="text-gray-900 font-medium">{formData.selectedCustomer.display_name || formData.selectedCustomer.name}</p>
                  <p className="text-gray-600 text-sm">
                    {formData.selectedCustomer.type === 'domestic' ? '🇮🇳 Domestic Customer' : '🌍 Overseas Customer'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-amber-700 text-sm">Creating new lead (not linked to existing customer)</p>
                <button
                  type="button"
                  onClick={() => setIsNewLead(false)}
                  className="text-xs text-amber-700 hover:text-amber-800 underline mt-1"
                >
                  Link to existing customer instead
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Contact Name *</label>
                  <input
                    type="text"
                    value={formData.lead_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_name: e.target.value }))}
                    placeholder="Contact person name"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.lead_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_company: e.target.value }))}
                    placeholder="Company / Organization"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.lead_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.lead_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Address</label>
                <textarea
                  value={formData.lead_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Follow-up Type */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-gray-900 font-medium mb-4">Follow-up Type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {followupTypes.map(type => {
              const isSelected = formData.followup_type === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, followup_type: type.id }))}
                  className={`p-4 rounded-lg border-2 transition-all ${getTypeColors(type.color, isSelected)}`}
                >
                  <type.icon className={`w-6 h-6 mx-auto mb-2 ${getIconColors(type.color, isSelected)}`} />
                  <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{type.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-gray-900 font-medium mb-4">Follow-up Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Follow up on product demo"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Details about this follow-up..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Time</label>
                <input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment & Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-gray-900 font-medium mb-4">Assignment & Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={handleAssigneeChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Meeting location / address"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Person to contact"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="Phone number"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales/lead-management')}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Follow-up' : 'Create Follow-up'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FollowUpForm;
