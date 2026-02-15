import React from 'react';
import { X, Building2, AlertCircle, MessageSquare, Clock, Calendar, User } from 'lucide-react';
import { REQUIREMENT_TYPES, getDeptLabel, getPriorityStyle, getStatusStyle } from './constants';

const ViewRequirementModal = ({ 
  isOpen, 
  onClose, 
  requirement,
  currentDept
}) => {
  if (!isOpen || !requirement) return null;

  const TypeIcon = REQUIREMENT_TYPES.find(t => t.value === requirement.requirement_type)?.icon || AlertCircle;
  const isSent = requirement.created_by_department === currentDept;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSent ? 'bg-indigo-100' : 'bg-purple-100'}`}>
              <TypeIcon size={20} className={isSent ? 'text-indigo-600' : 'text-purple-600'} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{requirement.requirement_type}</h2>
              <p className="text-sm text-slate-500">
                {isSent ? `Sent to ${getDeptLabel(requirement.assigned_to_department)}` : `From ${getDeptLabel(requirement.created_by_department)}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status & Priority Badges */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityStyle(requirement.priority)}`}>
              {requirement.priority}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(requirement.status)}`}>
              {requirement.status}
            </span>
          </div>

          {/* Project */}
          {requirement.project_name && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Related Project</label>
              <p className="text-sm text-slate-800">{requirement.project_pid} - {requirement.project_name}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg">{requirement.description}</p>
          </div>

          {/* Department Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <Building2 size={12} className="inline mr-1" />
                From Department
              </label>
              <p className="text-sm text-slate-800">
                {getDeptLabel(requirement.created_by_department)}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <Building2 size={12} className="inline mr-1" />
                Assigned To
              </label>
              <p className="text-sm text-slate-800">
                {getDeptLabel(requirement.assigned_to_department)}
              </p>
            </div>
          </div>

          {/* Assigned Person & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            {requirement.assigned_to_person && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <User size={12} className="inline mr-1" />
                  Assigned To Person
                </label>
                <p className="text-sm text-slate-800">{requirement.assigned_to_person}</p>
              </div>
            )}
            {requirement.due_date && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  <Calendar size={12} className="inline mr-1" />
                  Due Date
                </label>
                <p className="text-sm text-slate-800">{requirement.due_date}</p>
              </div>
            )}
          </div>

          {/* Response */}
          {requirement.response && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                <MessageSquare size={12} className="inline mr-1" />
                Response
              </label>
              <p className="text-sm text-slate-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
                {requirement.response}
              </p>
            </div>
          )}

          {/* Replies */}
          {requirement.replies && requirement.replies.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                <MessageSquare size={12} className="inline mr-1" />
                Conversation History
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {requirement.replies.map((reply, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium">{getDeptLabel(reply.from_department)}</span>
                      <span>{formatDate(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{reply.message}</p>
                    {reply.status_change && (
                      <p className="text-xs text-blue-600 mt-1">Status changed to: {reply.status_change}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created At */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={12} />
              Created: {formatDate(requirement.created_at)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRequirementModal;
