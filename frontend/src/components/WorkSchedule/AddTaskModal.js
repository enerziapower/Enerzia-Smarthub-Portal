import React, { useState, useMemo } from 'react';
import { X, Save, Loader2, Calendar, MapPin, User, Edit2, Plus, Building2, Phone, FileText, Search, ChevronDown } from 'lucide-react';

// Pre-Project specific task types
const PRE_PROJECT_TASK_TYPES = [
  'Pre-Site Visit',
  'Site Survey',
  'Feasibility Study',
  'Quotation Preparation',
  'Client Meeting',
  'Technical Assessment',
  'Documentation',
  'Follow-up',
  'Other'
];

const AddTaskModal = ({ 
  isOpen, 
  onClose, 
  project, 
  newTask, 
  setNewTask, 
  onSave, 
  saving, 
  teamMembers,
  projects,
  onProjectChange,
  editingTask,
  customers = []  // NEW: List of existing customers
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Filter customers based on search - must be before conditional return
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50); // Show first 50 if no search
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.location?.toLowerCase().includes(search) ||
      c.address?.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [customers, customerSearch]);

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    setNewTask({ 
      ...newTask, 
      customer_name: customer.name,
      customer_site: customer.location || customer.address || ''
    });
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setIsNewCustomer(false);
  };

  // Handle entering new customer
  const handleNewCustomer = () => {
    setIsNewCustomer(true);
    setShowCustomerDropdown(false);
    setNewTask({ ...newTask, customer_name: customerSearch });
  };

  if (!isOpen) return null;

  const isEditing = !!editingTask;
  const isPreProject = newTask.is_pre_project;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 ${isPreProject ? 'bg-gradient-to-r from-amber-600 to-amber-500' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
              {isEditing ? 'Edit Task' : (isPreProject ? 'Add Pre-Project Task' : 'Add New Task')}
            </h2>
            {project && !isPreProject && (
              <p className="text-sm text-slate-300 mt-0.5">{project.pid_no} - {project.project_name}</p>
            )}
            {isPreProject && newTask.customer_name && (
              <p className="text-sm text-amber-100 mt-0.5">{newTask.customer_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            data-testid="close-task-modal-btn"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Pre-Project Task Toggle */}
          <div className={`border rounded-lg p-3 ${isPreProject ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPreProject}
                onChange={(e) => setNewTask({ 
                  ...newTask, 
                  is_pre_project: e.target.checked,
                  project_id: e.target.checked ? '' : newTask.project_id,
                  task_type: e.target.checked ? 'Pre-Site Visit' : ''
                })}
                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                data-testid="pre-project-toggle"
              />
              <div>
                <span className={`font-medium ${isPreProject ? 'text-amber-800' : 'text-slate-700'}`}>Pre-Project Task</span>
                <p className="text-xs text-slate-500 mt-0.5">For tasks before a project is created (site visits, surveys, etc.)</p>
              </div>
            </label>
          </div>

          {/* Customer Details - Only shown for Pre-Project Tasks */}
          {isPreProject && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <Building2 size={16} className="text-amber-600" />
                Customer Details
              </h3>
              
              {/* Customer Name - Searchable Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer / Company Name <span className="text-red-500">*</span>
                </label>
                
                {/* Selected Customer Display or Search Input */}
                {newTask.customer_name && !showCustomerDropdown ? (
                  <div className="flex items-center justify-between px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">{newTask.customer_name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTask({ ...newTask, customer_name: '', customer_site: '' });
                        setShowCustomerDropdown(true);
                        setIsNewCustomer(false);
                      }}
                      className="text-amber-600 hover:text-amber-800 text-xs underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={isNewCustomer ? newTask.customer_name : customerSearch}
                        onChange={(e) => {
                          if (isNewCustomer) {
                            setNewTask({ ...newTask, customer_name: e.target.value });
                          } else {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }
                        }}
                        onFocus={() => !isNewCustomer && setShowCustomerDropdown(true)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder={isNewCustomer ? "Enter new customer name" : "Search existing customers..."}
                        data-testid="customer-name-input"
                      />
                      {!isNewCustomer && (
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      )}
                    </div>
                    
                    {/* Dropdown List */}
                    {showCustomerDropdown && !isNewCustomer && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {/* Add New Customer Option */}
                        <button
                          type="button"
                          onClick={handleNewCustomer}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 border-b border-slate-100 flex items-center gap-2 text-amber-700 font-medium"
                        >
                          <Plus size={14} />
                          {customerSearch ? `Add "${customerSearch}" as new customer` : 'Enter new customer'}
                        </button>
                        
                        {/* Existing Customers */}
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer, idx) => (
                            <button
                              key={customer.id || idx}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                            >
                              <div className="font-medium text-slate-800">{customer.name}</div>
                              {(customer.location || customer.address) && (
                                <div className="text-xs text-slate-500">{customer.location || customer.address}</div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-500 text-center">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* New Customer Indicator */}
                {isNewCustomer && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-amber-600">Adding new customer</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCustomer(false);
                        setCustomerSearch('');
                        setShowCustomerDropdown(true);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                      Search existing instead
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Site Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.customer_site || ''}
                  onChange={(e) => setNewTask({ ...newTask, customer_site: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter site address or location"
                  data-testid="customer-site-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone size={12} className="inline mr-1" />
                  Contact Person / Phone
                </label>
                <input
                  type="text"
                  value={newTask.customer_contact || ''}
                  onChange={(e) => setNewTask({ ...newTask, customer_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Mr. Kumar - 9876543210"
                  data-testid="customer-contact-input"
                />
              </div>
              
              {/* Task Type for Pre-Project */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <FileText size={12} className="inline mr-1" />
                  Task Type
                </label>
                <select
                  value={newTask.task_type || 'Pre-Site Visit'}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid="pre-project-task-type-select"
                >
                  {PRE_PROJECT_TASK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Project Selection (if not pre-selected and not pre-project) */}
          {!project && !isPreProject && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={newTask.project_id || ''}
                onChange={(e) => {
                  const selectedProject = projects.find(p => p.id === e.target.value);
                  onProjectChange(selectedProject);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="task-project-select"
              >
                <option value="">Select Project</option>
                {projects.filter(p => p.status === 'Ongoing').map(p => (
                  <option key={p.id} value={p.id}>{p.pid_no} - {p.project_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Enter task description..."
              rows="3"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              data-testid="task-description-input"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <User size={14} className="inline mr-1" />
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              data-testid="task-assignee-select"
            >
              <option value="">Select Team Member</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </div>

          {/* Site Location - only for regular project tasks */}
          {!isPreProject && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <MapPin size={14} className="inline mr-1" />
                Site & Location
              </label>
              <input
                type="text"
                value={newTask.site_location}
                onChange={(e) => setNewTask({ ...newTask, site_location: e.target.value })}
                placeholder="Enter site location..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="task-location-input"
              />
            </div>
          )}

          {/* Date and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Scheduled Date
              </label>
              <input
                type="date"
                value={newTask.scheduled_date}
                onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="task-date-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="task-priority-select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Status (only shown when editing) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="task-status-select"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            data-testid="cancel-task-btn"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !newTask.description || !newTask.assigned_to || 
              (isPreProject && (!newTask.customer_name || !newTask.customer_site)) ||
              (!isPreProject && !project && !newTask.project_id)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${isPreProject ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            data-testid="save-task-btn"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Save Changes' : 'Add Task'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
