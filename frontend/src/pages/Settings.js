import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Users, Tag, LayoutGrid, Save, Plus, Trash2, Edit2, 
  Loader2, Check, X, Clock, Calendar, DollarSign, MapPin, Phone, Mail, 
  ExternalLink, ChevronRight, Upload, Image, UserPlus, Shield, Key, Copy,
  Palette, Eye, RefreshCw
} from 'lucide-react';
import { settingsAPI, projectsAPI, usersAPI, departmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Tab configuration
const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'general', label: 'General Settings', icon: Globe },
  { id: 'email-templates', label: 'Email Templates', icon: Mail },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'statuses', label: 'Statuses', icon: LayoutGrid },
];

// Timezone options
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST) - Asia/Kolkata' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'US Eastern - America/New_York' },
  { value: 'America/Los_Angeles', label: 'US Pacific - America/Los_Angeles' },
  { value: 'Europe/London', label: 'UK - Europe/London' },
  { value: 'Asia/Dubai', label: 'UAE - Asia/Dubai' },
  { value: 'Asia/Singapore', label: 'Singapore - Asia/Singapore' },
];

// Currency options
const CURRENCIES = [
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'AED', label: 'UAE Dirham (د.إ)', symbol: 'د.إ' },
];

// Date format options
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (28/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/28/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-28)' },
];

const Settings = () => {
  const { isAdmin, isSuperAdmin, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [departments, setDepartments] = useState([]);
  
  // Organization settings
  const [orgSettings, setOrgSettings] = useState({
    name: 'Enerzia Power Solutions',
    logo_url: '',
    industry: 'Engineering',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
  });
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    currency: 'INR',
    currency_symbol: '₹',
    financial_year_start: 'April',
  });
  
  // Categories list
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ code: '', name: '', description: '' });
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  // Statuses list
  const [statuses, setStatuses] = useState([]);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#3B82F6', order: 0 });
  const [showAddStatus, setShowAddStatus] = useState(false);
  
  // Clients list
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });
  const [showAddClient, setShowAddClient] = useState(false);
  
  // Vendors list
  const [vendors, setVendors] = useState([]);
  const [editingVendor, setEditingVendor] = useState(null);
  const [newVendor, setNewVendor] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });
  const [showAddVendor, setShowAddVendor] = useState(false);

  // Users list (admin only)
  const [users, setUsers] = useState([]);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user', department: '', can_view_departments: [] });
  const [inviteResult, setInviteResult] = useState(null); // To show temporary password

  // Email Template settings
  const [emailTemplate, setEmailTemplate] = useState({
    header_bg_color: '#0F172A',
    header_gradient_end: '#1E3A5F',
    company_logo_url: '',
    greeting_text: 'Dear {customer_name},',
    intro_text: 'Please find attached the {report_type} for your reference. Below are the key details:',
    closing_text: 'If you have any questions or need further clarification, please don\'t hesitate to reach out.',
    signature_text: 'Best regards,',
    footer_text: 'This is an automated email from {company_name}\'s Report Management System.',
    footer_bg_color: '#F1F5F9',
    show_copyright: true,
    primary_color: '#0F172A',
    accent_color: '#10B981',
  });
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [uploadingEmailLogo, setUploadingEmailLogo] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadSettings();
  }, [activeTab]);

  const loadDepartments = async () => {
    try {
      const res = await departmentsAPI.getAll();
      setDepartments(res.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (activeTab === 'organization') {
        const res = await settingsAPI.getOrganization();
        setOrgSettings(res.data);
      } else if (activeTab === 'general') {
        const res = await settingsAPI.getGeneral();
        // Ensure all required fields have defaults
        setGeneralSettings({
          timezone: res.data.timezone || 'Asia/Kolkata',
          date_format: res.data.date_format || 'DD/MM/YYYY',
          currency: res.data.currency || 'INR',
          currency_symbol: res.data.currency_symbol || '₹',
          financial_year_start: res.data.financial_year_start || 'April',
        });
      } else if (activeTab === 'users' && isAdmin) {
        const res = await usersAPI.getAll();
        setUsers(res.data);
      } else if (activeTab === 'clients') {
        const res = await settingsAPI.getClients();
        setClients(res.data);
      } else if (activeTab === 'vendors') {
        const res = await settingsAPI.getVendors();
        setVendors(res.data);
      } else if (activeTab === 'categories') {
        const res = await settingsAPI.getCategories();
        setCategories(res.data);
      } else if (activeTab === 'statuses') {
        const res = await settingsAPI.getStatuses();
        setStatuses(res.data);
      } else if (activeTab === 'email-templates') {
        const res = await settingsAPI.getEmailTemplate();
        setEmailTemplate({
          header_bg_color: res.data.header_bg_color || '#0F172A',
          header_gradient_end: res.data.header_gradient_end || '#1E3A5F',
          company_logo_url: res.data.company_logo_url || '',
          greeting_text: res.data.greeting_text || 'Dear {customer_name},',
          intro_text: res.data.intro_text || 'Please find attached the {report_type} for your reference. Below are the key details:',
          closing_text: res.data.closing_text || 'If you have any questions or need further clarification, please don\'t hesitate to reach out.',
          signature_text: res.data.signature_text || 'Best regards,',
          footer_text: res.data.footer_text || 'This is an automated email from {company_name}\'s Report Management System.',
          footer_bg_color: res.data.footer_bg_color || '#F1F5F9',
          show_copyright: res.data.show_copyright !== false,
          primary_color: res.data.primary_color || '#0F172A',
          accent_color: res.data.accent_color || '#10B981',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Organization handlers
  const handleSaveOrganization = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateOrganization(orgSettings);
      showMessage('success', 'Organization settings saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save organization settings');
    } finally {
      setSaving(false);
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Please upload a valid image file (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      showMessage('error', 'Logo file size must be less than 1MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await settingsAPI.uploadLogo(file);
      setOrgSettings({ ...orgSettings, logo_url: response.data.logo_url });
      showMessage('success', 'Logo uploaded successfully');
    } catch (error) {
      showMessage('error', 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Reset input
    }
  };

  // Logo delete handler
  const handleLogoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the logo?')) return;
    
    try {
      await settingsAPI.deleteLogo();
      setOrgSettings({ ...orgSettings, logo_url: null });
      showMessage('success', 'Logo deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete logo');
    }
  };

  // User management handlers (admin only)
  const handleInviteUser = async () => {
    if (!newUser.email.trim() || !newUser.name.trim()) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }
    
    try {
      const res = await usersAPI.invite(newUser);
      setUsers([...users, res.data.user]);
      setInviteResult({
        user: res.data.user,
        password: res.data.temporary_password
      });
      setNewUser({ email: '', name: '', role: 'user', department: '', can_view_departments: [] });
      showMessage('success', 'User invited successfully');
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Failed to invite user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await usersAPI.delete(userId);
      setUsers(users.filter(u => u.id !== userId));
      showMessage('success', 'User deleted successfully');
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await usersAPI.update(userId, { is_active: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      showMessage('success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleResetPassword = async (userId, userName) => {
    if (!window.confirm(`Reset password for ${userName}? A new temporary password will be generated.`)) return;
    
    try {
      const res = await usersAPI.resetPassword(userId);
      setInviteResult({
        user: { name: userName },
        password: res.data.temporary_password,
        isReset: true
      });
      showMessage('success', 'Password reset successfully');
    } catch (error) {
      showMessage('error', 'Failed to reset password');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copied to clipboard');
  };

  // General settings handlers
  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      // Update currency symbol based on selected currency
      const currency = CURRENCIES.find(c => c.value === generalSettings.currency);
      const updatedSettings = {
        ...generalSettings,
        currency_symbol: currency?.symbol || '₹',
      };
      await settingsAPI.updateGeneral(updatedSettings);
      setGeneralSettings(updatedSettings);
      showMessage('success', 'General settings saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  // Email Template handlers
  const handleSaveEmailTemplate = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateEmailTemplate(emailTemplate);
      showMessage('success', 'Email template saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save email template');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadEmailLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingEmailLogo(true);
    try {
      const res = await settingsAPI.uploadEmailLogo(file);
      setEmailTemplate({ ...emailTemplate, company_logo_url: res.data.logo_url });
      showMessage('success', 'Email logo uploaded successfully');
    } catch (error) {
      showMessage('error', 'Failed to upload email logo');
    } finally {
      setUploadingEmailLogo(false);
    }
  };

  const handlePreviewEmailTemplate = async () => {
    try {
      const res = await settingsAPI.previewEmailTemplate(emailTemplate);
      setEmailPreviewHtml(res.data.preview_html);
      setShowEmailPreview(true);
    } catch (error) {
      showMessage('error', 'Failed to generate preview');
    }
  };

  // Client handlers
  const handleAddClient = async () => {
    if (!newClient.name.trim()) return;
    try {
      const res = await settingsAPI.createClient(newClient);
      setClients([...clients, res.data]);
      setNewClient({ name: '', contact_person: '', email: '', phone: '', address: '' });
      setShowAddClient(false);
      showMessage('success', 'Client added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add client');
    }
  };

  const handleUpdateClient = async (id) => {
    try {
      const res = await settingsAPI.updateClient(id, editingClient);
      setClients(clients.map(c => c.id === id ? res.data : c));
      setEditingClient(null);
      showMessage('success', 'Client updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update client');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await settingsAPI.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      showMessage('success', 'Client deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete client');
    }
  };

  const handleSeedClients = async () => {
    try {
      const res = await settingsAPI.seedClients();
      await loadSettings();
      showMessage('success', res.data.message);
    } catch (error) {
      showMessage('error', 'Failed to seed clients');
    }
  };

  // Vendor handlers
  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) return;
    try {
      const res = await settingsAPI.createVendor(newVendor);
      setVendors([...vendors, res.data]);
      setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '' });
      setShowAddVendor(false);
      showMessage('success', 'Vendor added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add vendor');
    }
  };

  const handleUpdateVendor = async (id) => {
    try {
      const res = await settingsAPI.updateVendor(id, editingVendor);
      setVendors(vendors.map(v => v.id === id ? res.data : v));
      setEditingVendor(null);
      showMessage('success', 'Vendor updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await settingsAPI.deleteVendor(id);
      setVendors(vendors.filter(v => v.id !== id));
      showMessage('success', 'Vendor deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete vendor');
    }
  };

  const handleSeedVendors = async () => {
    try {
      const res = await settingsAPI.seedVendors();
      await loadSettings();
      showMessage('success', res.data.message);
    } catch (error) {
      showMessage('error', 'Failed to seed vendors');
    }
  };

  // Category handlers
  const handleAddCategory = async () => {
    if (!newCategory.code.trim() || !newCategory.name.trim()) return;
    try {
      const res = await settingsAPI.createCategory(newCategory);
      setCategories([...categories, res.data]);
      setNewCategory({ code: '', name: '', description: '' });
      setShowAddCategory(false);
      showMessage('success', 'Category added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (id) => {
    try {
      const res = await settingsAPI.updateCategory(id, editingCategory);
      setCategories(categories.map(c => c.id === id ? res.data : c));
      setEditingCategory(null);
      showMessage('success', 'Category updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await settingsAPI.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      showMessage('success', 'Category deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete category');
    }
  };

  // Status handlers
  const handleAddStatus = async () => {
    if (!newStatus.name.trim()) return;
    try {
      const res = await settingsAPI.createStatus(newStatus);
      setStatuses([...statuses, res.data]);
      setNewStatus({ name: '', color: '#3B82F6', order: statuses.length + 1 });
      setShowAddStatus(false);
      showMessage('success', 'Status added successfully');
    } catch (error) {
      showMessage('error', 'Failed to add status');
    }
  };

  const handleUpdateStatus = async (id) => {
    try {
      const res = await settingsAPI.updateStatus(id, editingStatus);
      setStatuses(statuses.map(s => s.id === id ? res.data : s));
      setEditingStatus(null);
      showMessage('success', 'Status updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update status');
    }
  };

  const handleDeleteStatus = async (id) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    try {
      await settingsAPI.deleteStatus(id);
      setStatuses(statuses.filter(s => s.id !== id));
      showMessage('success', 'Status deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete status');
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      );
    }

    switch (activeTab) {
      case 'organization':
        return (
          <div className="space-y-6">
            {/* Logo Upload Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Organization Logo
              </label>
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                  {orgSettings.logo_url ? (
                    <img 
                      src={`${process.env.REACT_APP_BACKEND_URL}/api${orgSettings.logo_url}`}
                      alt="Organization Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Image size={32} className="text-slate-300" />
                  )}
                </div>
                
                {/* Upload/Delete Buttons */}
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                      uploadingLogo 
                        ? 'bg-slate-100 text-slate-400' 
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {orgSettings.logo_url ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </label>
                  {orgSettings.logo_url && (
                    <button
                      onClick={handleLogoDelete}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Logo
                    </button>
                  )}
                  <p className="text-xs text-slate-500">Max 1MB (JPG, PNG, GIF, WEBP)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Organization Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgSettings.name || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={orgSettings.industry || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={orgSettings.country || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={orgSettings.address_line1 || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, address_line1: e.target.value })}
                  placeholder="Street address, building name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={orgSettings.address_line2 || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, address_line2: e.target.value })}
                  placeholder="Area, locality"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={orgSettings.city || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* State */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={orgSettings.state || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, state: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={orgSettings.postal_code || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, postal_code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={orgSettings.phone || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={orgSettings.email || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={orgSettings.website || ''}
                  onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                  placeholder="https://"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSaveOrganization}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        );
        
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Clock size={14} className="inline mr-1" /> Timezone
                </label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Date Format */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar size={14} className="inline mr-1" /> Date Format
                </label>
                <select
                  value={generalSettings.date_format}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, date_format: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {DATE_FORMATS.map(df => (
                    <option key={df.value} value={df.value}>{df.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <DollarSign size={14} className="inline mr-1" /> Currency
                </label>
                <select
                  value={generalSettings.currency}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Financial Year Start */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Financial Year Starts
                </label>
                <select
                  value={generalSettings.financial_year_start}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, financial_year_start: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Current Time Preview */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Preview</h4>
              <p className="text-sm text-slate-600">
                Current time in {generalSettings.timezone || 'Asia/Kolkata'}: <span className="font-mono font-semibold">
                  {(() => {
                    try {
                      return new Date().toLocaleString('en-IN', { timeZone: generalSettings.timezone || 'Asia/Kolkata' });
                    } catch (e) {
                      return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                    }
                  })()}
                </span>
              </p>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        );

      case 'users':
        if (!isAdmin) {
          return (
            <div className="text-center py-12">
              <Shield size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">You don&apos;t have permission to manage users.</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {/* Header with Invite Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Manage users who can access this application</p>
              <button
                onClick={() => {
                  setShowInviteUser(true);
                  setInviteResult(null);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <UserPlus size={14} /> Invite User
              </button>
            </div>

            {/* Invite User Form */}
            {showInviteUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Invite New User</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="user">Department Member</option>
                    <option value="admin">Department Admin</option>
                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                  </select>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    disabled={!isSuperAdmin && currentUser?.department}
                  >
                    <option value="">Select Department *</option>
                    {departments.map(dept => (
                      <option key={dept.code} value={dept.code}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Multi-department access (for mutual sharing) */}
                {(newUser.role === 'admin' || isSuperAdmin) && (
                  <div className="mb-3">
                    <label className="block text-xs text-blue-700 mb-1">Additional Department Access (Mutual Sharing)</label>
                    <div className="flex flex-wrap gap-2">
                      {departments.filter(d => d.code !== newUser.department).map(dept => (
                        <label key={dept.code} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-slate-200">
                          <input
                            type="checkbox"
                            checked={newUser.can_view_departments?.includes(dept.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUser({ ...newUser, can_view_departments: [...(newUser.can_view_departments || []), dept.code] });
                              } else {
                                setNewUser({ ...newUser, can_view_departments: newUser.can_view_departments?.filter(d => d !== dept.code) || [] });
                              }
                            }}
                            className="rounded"
                          />
                          {dept.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleInviteUser}
                    className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus size={14} /> Send Invite
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteUser(false);
                      setNewUser({ email: '', name: '', role: 'user', department: '', can_view_departments: [] });
                    }}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Invite Result with Temporary Password */}
            {inviteResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-800 mb-2">
                  {inviteResult.isReset ? 'Password Reset Successful' : 'User Invited Successfully'}
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  {inviteResult.isReset 
                    ? `New password for ${inviteResult.user.name}:`
                    : `Share these credentials with ${inviteResult.user.name}:`}
                </p>
                <div className="bg-white border border-green-300 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Temporary Password</p>
                    <p className="font-mono font-bold text-lg text-green-700">{inviteResult.password}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(inviteResult.password)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  The user should change this password after first login.
                </p>
                <button
                  onClick={() => setInviteResult(null)}
                  className="mt-3 text-sm text-green-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Users List */}
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Users size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">No users found</p>
                </div>
              ) : (
                users.map(user => (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      user.id === currentUser?.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : user.is_active 
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        user.role === 'super_admin' ? 'bg-amber-500' :
                        user.role === 'admin' ? 'bg-purple-500' : 'bg-slate-500'
                      }`}>
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{user.name}</span>
                          {user.role === 'super_admin' && (
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                              Super Admin
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              Dept Admin
                            </span>
                          )}
                          {user.id === currentUser?.id && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                              You
                            </span>
                          )}
                          {!user.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{user.email}</span>
                          {user.department && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                              {departments.find(d => d.code === user.department)?.name || user.department}
                            </span>
                          )}
                          {user.can_view_departments?.length > 0 && (
                            <span className="text-xs text-slate-400">
                              +{user.can_view_departments.length} dept access
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResetPassword(user.id, user.name)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            user.is_active
                              ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                              : 'text-green-700 bg-green-100 hover:bg-green-200'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
        
      case 'clients':
        return (
          <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Manage clients for your projects</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSeedClients}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Import from Projects
                </button>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus size={14} /> Add Client
                </button>
              </div>
            </div>
            
            {/* Add Client Form */}
            {showAddClient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Add New Client</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Client Name *"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={newClient.contact_person}
                    onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm md:col-span-2"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddClient(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddClient}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            )}
            
            {/* Clients List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50">
                      {editingClient?.id === client.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editingClient.name}
                              onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editingClient.contact_person || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, contact_person: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="email"
                              value={editingClient.email || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="tel"
                              value={editingClient.phone || ''}
                              onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUpdateClient(client.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingClient(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded ml-1"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{client.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{client.contact_person || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{client.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{client.phone || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditingClient(client)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No clients found. Add one or import from existing projects.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        );
        
      case 'vendors':
        return (
          <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Manage vendors for your projects</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSeedVendors}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Import from Projects
                </button>
                <button
                  onClick={() => setShowAddVendor(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus size={14} /> Add Vendor
                </button>
              </div>
            </div>
            
            {/* Add Vendor Form */}
            {showAddVendor && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-orange-800 mb-3">Add New Vendor</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Vendor Name *"
                    value={newVendor.name}
                    onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={newVendor.contact_person}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={newVendor.address}
                    onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm md:col-span-2"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddVendor(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddVendor}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            )}
            
            {/* Vendors List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {vendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-slate-50">
                      {editingVendor?.id === vendor.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editingVendor.name}
                              onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editingVendor.contact_person || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, contact_person: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="email"
                              value={editingVendor.email || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="tel"
                              value={editingVendor.phone || ''}
                              onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUpdateVendor(vendor.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingVendor(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded ml-1"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{vendor.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{vendor.contact_person || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{vendor.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{vendor.phone || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditingVendor(vendor)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No vendors found. Add one or import from existing projects.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        );
        
      case 'categories':
        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Manage project categories (PSS, AS, OSS, CS, etc.)</p>
              <button
                onClick={() => setShowAddCategory(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>
            
            {/* Add Category Form */}
            {showAddCategory && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Add New Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Code (e.g., PSS) *"
                    value={newCategory.code}
                    onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Name (e.g., Project & Services) *"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCategory}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            )}
            
            {/* Categories List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(category => (
                <div key={category.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingCategory.code}
                        onChange={(e) => setEditingCategory({ ...editingCategory, code: e.target.value.toUpperCase() })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                      />
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                      <input
                        type="text"
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                        placeholder="Description"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateCategory(category.id)}
                          className="px-2 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-slate-900 text-white text-xs font-mono rounded mb-2">
                            {category.code}
                          </span>
                          <h4 className="font-medium text-slate-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'statuses':
        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Manage project statuses</p>
              <button
                onClick={() => setShowAddStatus(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} /> Add Status
              </button>
            </div>
            
            {/* Add Status Form */}
            {showAddStatus && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-800 mb-3">Add New Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Status Name *"
                    value={newStatus.name}
                    onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newStatus.color}
                      onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-500">{newStatus.color}</span>
                  </div>
                  <input
                    type="number"
                    placeholder="Order"
                    value={newStatus.order}
                    onChange={(e) => setNewStatus({ ...newStatus, order: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddStatus(false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStatus}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            )}
            
            {/* Statuses List */}
            <div className="space-y-2">
              {statuses.sort((a, b) => a.order - b.order).map(status => (
                <div key={status.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                  {editingStatus?.id === status.id ? (
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="text"
                        value={editingStatus.name}
                        onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                      />
                      <input
                        type="color"
                        value={editingStatus.color || '#3B82F6'}
                        onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                        className="w-8 h-8 border border-slate-200 rounded cursor-pointer"
                      />
                      <input
                        type="number"
                        value={editingStatus.order}
                        onChange={(e) => setEditingStatus({ ...editingStatus, order: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-sm"
                        placeholder="Order"
                      />
                      <button
                        onClick={() => handleUpdateStatus(status.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingStatus(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: status.color || '#3B82F6' }}
                        />
                        <span className="font-medium text-slate-900">{status.name}</span>
                        <span className="text-xs text-slate-400">Order: {status.order}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingStatus(status)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'email-templates':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Email Template Customization</h3>
                <p className="text-sm text-slate-500">Customize the appearance of emails sent from the system</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviewEmailTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Eye size={16} /> Preview
                </button>
                <button
                  onClick={handleSaveEmailTemplate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Email Logo */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Image size={16} /> Company Logo for Emails
              </h4>
              <div className="flex items-center gap-4">
                {emailTemplate.company_logo_url ? (
                  <div className="relative">
                    <img 
                      src={`${process.env.REACT_APP_BACKEND_URL}${emailTemplate.company_logo_url}`}
                      alt="Email Logo"
                      className="h-16 object-contain border border-slate-200 rounded-lg p-2 bg-slate-50"
                    />
                    <button
                      onClick={() => setEmailTemplate({ ...emailTemplate, company_logo_url: '' })}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                    <Image size={24} />
                  </div>
                )}
                <div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                    {uploadingEmailLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                    {uploadingEmailLogo ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadEmailLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-1">Recommended: 200x80 pixels, PNG or JPG</p>
                </div>
              </div>
            </div>

            {/* Color Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Palette size={16} /> Color Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Header Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={emailTemplate.header_bg_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, header_bg_color: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailTemplate.header_bg_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, header_bg_color: e.target.value })}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Header Gradient End</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={emailTemplate.header_gradient_end}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, header_gradient_end: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailTemplate.header_gradient_end}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, header_gradient_end: e.target.value })}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={emailTemplate.accent_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, accent_color: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailTemplate.accent_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, accent_color: e.target.value })}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Footer Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={emailTemplate.footer_bg_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, footer_bg_color: e.target.value })}
                      className="w-10 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailTemplate.footer_bg_color}
                      onChange={(e) => setEmailTemplate({ ...emailTemplate, footer_bg_color: e.target.value })}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Mail size={16} /> Email Content
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Greeting Text</label>
                  <input
                    type="text"
                    value={emailTemplate.greeting_text}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, greeting_text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Dear {customer_name},"
                  />
                  <p className="text-xs text-slate-400 mt-1">Use {'{customer_name}'} as placeholder for recipient name</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Introduction Text</label>
                  <textarea
                    value={emailTemplate.intro_text}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, intro_text: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                    placeholder="Please find attached the {report_type} for your reference."
                  />
                  <p className="text-xs text-slate-400 mt-1">Use {'{report_type}'} as placeholder for report type</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Closing Text</label>
                  <textarea
                    value={emailTemplate.closing_text}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, closing_text: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                    placeholder="If you have any questions, please don't hesitate to reach out."
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Signature Text</label>
                  <input
                    type="text"
                    value={emailTemplate.signature_text}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, signature_text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Best regards,"
                  />
                </div>
              </div>
            </div>

            {/* Footer Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Footer Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Footer Text</label>
                  <input
                    type="text"
                    value={emailTemplate.footer_text}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, footer_text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="This is an automated email from {company_name}'s Report Management System."
                  />
                  <p className="text-xs text-slate-400 mt-1">Use {'{company_name}'} as placeholder for company name</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show_copyright"
                    checked={emailTemplate.show_copyright}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, show_copyright: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="show_copyright" className="text-sm text-slate-700">
                    Show copyright notice in footer
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Modal */}
            {showEmailPreview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailPreview(false)} />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Eye size={20} /> Email Template Preview
                    </h3>
                    <button onClick={() => setShowEmailPreview(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-100">
                    <div dangerouslySetInnerHTML={{ __html: emailPreviewHtml }} />
                  </div>
                  <div className="flex justify-end gap-2 p-4 border-t">
                    <button
                      onClick={() => setShowEmailPreview(false)}
                      className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleSaveEmailTemplate}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Save & Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your organization and application settings</p>
      </div>
      
      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {message.text}
        </div>
      )}
      
      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {TABS.filter(tab => !tab.adminOnly || isAdmin).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight size={16} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
