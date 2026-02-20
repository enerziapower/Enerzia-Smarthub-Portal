import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Eye, X, RefreshCw, Users, Mail, Phone, 
  Building, Calendar, CreditCard, Shield, Heart, DollarSign, FileText,
  ChevronDown, ChevronRight, Save, AlertCircle, Check, User, Briefcase,
  Home, MapPin, UserCheck, Clock
} from 'lucide-react';
import api from '../../services/api';

const EmployeeManagementFull = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const departments = ['Projects', 'Accounts', 'Sales', 'Purchase', 'HR', 'Operations', 'Exports', 'Finance', 'Admin'];
  const statuses = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
    { value: 'inactive', label: 'Inactive', color: 'bg-red-100 text-red-700' },
    { value: 'probation', label: 'Probation', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'resigned', label: 'Resigned', color: 'bg-slate-100 text-slate-700' },
    { value: 'terminated', label: 'Terminated', color: 'bg-red-100 text-red-700' }
  ];
  const employmentTypes = ['permanent', 'contract', 'probation', 'intern', 'consultant'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];

  const defaultFormData = {
    emp_id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Projects',
    designation: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    father_name: '',
    spouse_name: '',
    current_address: '',
    permanent_address: '',
    join_date: '',
    confirmation_date: '',
    employment_type: 'permanent',
    status: 'active',
    reporting_to: '',
    bank_details: {
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch: ''
    },
    statutory: {
      pan_number: '',
      aadhar_number: '',
      uan_number: '',
      esic_number: '',
      pf_account_number: ''
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      address: ''
    },
    salary: {
      basic: 0,
      hra: 0,
      da: 0,
      conveyance: 0,
      medical: 0,
      special_allowance: 0,
      other_allowance: 0
    },
    leave_balance: {
      casual_leave: 12,
      sick_leave: 12,
      earned_leave: 15,
      comp_off: 0
    }
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchEmployees();
  }, [filterDepartment, filterStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let url = '/hr/employees';
      const params = new URLSearchParams();
      if (filterDepartment) params.append('department', filterDepartment);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await api.get(url);
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee.emp_id}`, formData);
        setSuccess('Employee updated successfully');
      } else {
        await api.post('/hr/employees', formData);
        setSuccess('Employee created successfully');
      }
      fetchEmployees();
      setShowModal(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (empId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    
    try {
      await api.delete(`/hr/employees/${empId}`);
      setSuccess('Employee deactivated');
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to deactivate employee');
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingEmployee(null);
    setActiveTab('basic');
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      ...defaultFormData,
      ...employee,
      bank_details: { ...defaultFormData.bank_details, ...employee.bank_details },
      statutory: { ...defaultFormData.statutory, ...employee.statutory },
      emergency_contact: { ...defaultFormData.emergency_contact, ...employee.emergency_contact },
      salary: { ...defaultFormData.salary, ...employee.salary },
      leave_balance: { ...defaultFormData.leave_balance, ...employee.leave_balance }
    });
    setShowModal(true);
  };

  const updateNestedField = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const calculateGrossSalary = () => {
    const s = formData.salary;
    return (s.basic || 0) + (s.hra || 0) + (s.da || 0) + (s.conveyance || 0) + 
           (s.medical || 0) + (s.special_allowance || 0) + (s.other_allowance || 0);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.emp_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => statuses.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700';

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'personal', label: 'Personal', icon: Heart },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'bank', label: 'Bank & Statutory', icon: CreditCard },
    { id: 'salary', label: 'Salary', icon: DollarSign },
    { id: 'leave', label: 'Leave Balance', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-500 mt-1">Comprehensive HR employee database</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">All Status</option>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={fetchEmployees} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{employees.length}</p>
              <p className="text-sm text-slate-500">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><UserCheck className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{employees.filter(e => e.status === 'active').length}</p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{employees.filter(e => e.employment_type === 'probation').length}</p>
              <p className="text-sm text-slate-500">On Probation</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><Building className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{new Set(employees.map(e => e.department)).size}</p>
              <p className="text-sm text-slate-500">Departments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Join Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No employees found</td></tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id || emp.emp_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-white">{emp.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.emp_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3" />{emp.email || '-'}</div>
                        <div className="flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3" />{emp.phone || '-'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{emp.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{emp.designation || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{emp.join_date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(emp.status)}`}>
                        {statuses.find(s => s.value === emp.status)?.label || emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => openEditModal(emp)} 
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.emp_id)} 
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingEmployee ? `Edit Employee - ${editingEmployee.name}` : 'Add New Employee'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-slate-200 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.emp_id}
                        onChange={(e) => setFormData({...formData, emp_id: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="EMP001"
                        disabled={editingEmployee}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="email@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                      <input
                        type="text"
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="Software Engineer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select</option>
                        {genders.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                      <select
                        value={formData.blood_group}
                        onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select</option>
                        {bloodGroups.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status</label>
                      <select
                        value={formData.marital_status}
                        onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select</option>
                        {maritalStatuses.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Father's Name</label>
                      <input
                        type="text"
                        value={formData.father_name}
                        onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Spouse Name</label>
                    <input
                      type="text"
                      value={formData.spouse_name}
                      onChange={(e) => setFormData({...formData, spouse_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Address</label>
                    <textarea
                      value={formData.current_address}
                      onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Address</label>
                    <textarea
                      value={formData.permanent_address}
                      onChange={(e) => setFormData({...formData, permanent_address: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" /> Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact.name}
                          onChange={(e) => updateNestedField('emergency_contact', 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                        <input
                          type="text"
                          value={formData.emergency_contact.relationship}
                          onChange={(e) => updateNestedField('emergency_contact', 'relationship', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="Father, Mother, Spouse..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={formData.emergency_contact.phone}
                          onChange={(e) => updateNestedField('emergency_contact', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={formData.emergency_contact.address}
                          onChange={(e) => updateNestedField('emergency_contact', 'address', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Employment Tab */}
              {activeTab === 'employment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Join Date</label>
                      <input
                        type="date"
                        value={formData.join_date}
                        onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation Date</label>
                      <input
                        type="date"
                        value={formData.confirmation_date}
                        onChange={(e) => setFormData({...formData, confirmation_date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        {employmentTypes.map(t => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      >
                        {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reporting To</label>
                    <input
                      type="text"
                      value={formData.reporting_to}
                      onChange={(e) => setFormData({...formData, reporting_to: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      placeholder="Manager name or employee ID"
                    />
                  </div>
                </div>
              )}

              {/* Bank & Statutory Tab */}
              {activeTab === 'bank' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-500" /> Bank Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={formData.bank_details.account_number}
                          onChange={(e) => updateNestedField('bank_details', 'account_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={formData.bank_details.ifsc_code}
                          onChange={(e) => updateNestedField('bank_details', 'ifsc_code', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={formData.bank_details.bank_name}
                          onChange={(e) => updateNestedField('bank_details', 'bank_name', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                        <input
                          type="text"
                          value={formData.bank_details.branch}
                          onChange={(e) => updateNestedField('bank_details', 'branch', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-500" /> Statutory Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                        <input
                          type="text"
                          value={formData.statutory.pan_number}
                          onChange={(e) => updateNestedField('statutory', 'pan_number', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="ABCDE1234F"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Number</label>
                        <input
                          type="text"
                          value={formData.statutory.aadhar_number}
                          onChange={(e) => updateNestedField('statutory', 'aadhar_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="1234 5678 9012"
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UAN Number (EPF)</label>
                        <input
                          type="text"
                          value={formData.statutory.uan_number}
                          onChange={(e) => updateNestedField('statutory', 'uan_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="100XXXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">PF Account Number</label>
                        <input
                          type="text"
                          value={formData.statutory.pf_account_number}
                          onChange={(e) => updateNestedField('statutory', 'pf_account_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">ESIC Number</label>
                        <input
                          type="text"
                          value={formData.statutory.esic_number}
                          onChange={(e) => updateNestedField('statutory', 'esic_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="Applicable if gross ≤ ₹21,000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary Tab */}
              {activeTab === 'salary' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Gross Salary (Monthly)</span>
                      <span className="text-2xl font-bold text-blue-700">₹ {calculateGrossSalary().toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-slate-900">Earnings Components</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary *</label>
                      <input
                        type="number"
                        value={formData.salary.basic}
                        onChange={(e) => updateNestedField('salary', 'basic', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">HRA</label>
                      <input
                        type="number"
                        value={formData.salary.hra}
                        onChange={(e) => updateNestedField('salary', 'hra', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">DA (Dearness Allowance)</label>
                      <input
                        type="number"
                        value={formData.salary.da}
                        onChange={(e) => updateNestedField('salary', 'da', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Conveyance</label>
                      <input
                        type="number"
                        value={formData.salary.conveyance}
                        onChange={(e) => updateNestedField('salary', 'conveyance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Medical Allowance</label>
                      <input
                        type="number"
                        value={formData.salary.medical}
                        onChange={(e) => updateNestedField('salary', 'medical', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Special Allowance</label>
                      <input
                        type="number"
                        value={formData.salary.special_allowance}
                        onChange={(e) => updateNestedField('salary', 'special_allowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Other Allowance</label>
                      <input
                        type="number"
                        value={formData.salary.other_allowance}
                        onChange={(e) => updateNestedField('salary', 'other_allowance', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Statutory Deductions (Auto-calculated)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-500">EPF (12% of Basic)</p>
                        <p className="font-medium">₹ {(formData.salary.basic * 0.12).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-500">ESIC {calculateGrossSalary() <= 21000 ? '(0.75%)' : '(N/A)'}</p>
                        <p className="font-medium">
                          ₹ {calculateGrossSalary() <= 21000 ? (calculateGrossSalary() * 0.0075).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-500">Professional Tax (TN)</p>
                        <p className="font-medium">As per slab</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leave Balance Tab */}
              {activeTab === 'leave' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Annual Leave Entitlement</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Casual Leave (CL)</label>
                      <input
                        type="number"
                        value={formData.leave_balance.casual_leave}
                        onChange={(e) => updateNestedField('leave_balance', 'casual_leave', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sick Leave (SL)</label>
                      <input
                        type="number"
                        value={formData.leave_balance.sick_leave}
                        onChange={(e) => updateNestedField('leave_balance', 'sick_leave', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Earned Leave (EL/PL)</label>
                      <input
                        type="number"
                        value={formData.leave_balance.earned_leave}
                        onChange={(e) => updateNestedField('leave_balance', 'earned_leave', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Comp Off</label>
                      <input
                        type="number"
                        value={formData.leave_balance.comp_off}
                        onChange={(e) => updateNestedField('leave_balance', 'comp_off', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <strong>Note:</strong> Leave balance is set annually. Loss of Pay (LOP) is auto-calculated during payroll if leaves exceed balance.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Footer - Inside form for proper submission */}
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  data-testid="save-employee-btn"
                >
                  {saving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> {editingEmployee ? 'Update Employee' : 'Create Employee'}</>
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

export default EmployeeManagementFull;
