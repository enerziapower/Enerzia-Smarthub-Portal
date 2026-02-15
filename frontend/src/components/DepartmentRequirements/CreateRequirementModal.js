import React, { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { REQUIREMENT_TYPES, DEPARTMENTS, PRIORITIES } from './constants';
import { projectRequirementsAPI, departmentTeamAPI } from '../../services/api';

const CreateRequirementModal = ({ 
  isOpen, 
  onClose, 
  onSaved, 
  currentDept,
  projects = []
}) => {
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    requirement_type: 'Material Purchase',
    description: '',
    assigned_to_department: '',
    assigned_to_person: '',
    due_date: '',
    priority: 'Medium',
    created_by_department: currentDept,
  });

  useEffect(() => {
    if (formData.assigned_to_department) {
      loadTeamMembers(formData.assigned_to_department);
    } else {
      setTeamMembers([]);
    }
  }, [formData.assigned_to_department]);

  const loadTeamMembers = async (dept) => {
    setLoadingTeam(true);
    try {
      const deptCode = dept.toLowerCase();
      const response = await departmentTeamAPI.getTeam(deptCode);
      const activeMembers = response.data.filter(m => m.is_active !== false);
      setTeamMembers(activeMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!formData.assigned_to_department) {
      alert('Please select a department');
      return;
    }

    setSaving(true);
    try {
      await projectRequirementsAPI.create({
        ...formData,
        created_by_department: currentDept,
      });
      onSaved();
    } catch (error) {
      console.error('Error creating requirement:', error);
      alert('Failed to create requirement');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">New Request</h2>
            <p className="text-sm text-slate-500 mt-1">Send a request to another department</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Related Project (Optional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              data-testid="req-project-select"
            >
              <option value="">No specific project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pid_no} - {p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Requirement Type & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Request Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.requirement_type}
                onChange={(e) => setFormData({ ...formData, requirement_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                data-testid="req-type-select"
              >
                {REQUIREMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Send to Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assigned_to_department}
                onChange={(e) => setFormData({ ...formData, assigned_to_department: e.target.value, assigned_to_person: '' })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                required
                data-testid="req-dept-select"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.filter(d => d.code !== currentDept).map((d) => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe your request in detail..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
              data-testid="req-description-input"
            />
          </div>

          {/* Assign to Person & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Assign to Person (Optional)
              </label>
              <select
                value={formData.assigned_to_person}
                onChange={(e) => setFormData({ ...formData, assigned_to_person: e.target.value })}
                disabled={!formData.assigned_to_department}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white disabled:bg-slate-50"
                data-testid="req-person-select"
              >
                <option value="">
                  {loadingTeam ? 'Loading...' : !formData.assigned_to_department ? 'Select department first' : 'Anyone in department'}
                </option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}{m.designation ? ` (${m.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                data-testid="req-due-date-input"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    formData.priority === p.value
                      ? `${p.color} border-current`
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                  data-testid={`req-priority-${p.value.toLowerCase()}`}
                >
                  {p.value}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
              data-testid="submit-req-btn"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequirementModal;
