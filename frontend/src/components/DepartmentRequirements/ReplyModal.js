import React, { useState } from 'react';
import { X, Reply, Loader2, MessageSquare } from 'lucide-react';
import { STATUSES, REQUIREMENT_TYPES, getDeptLabel, getPriorityStyle, getStatusStyle } from './constants';
import { projectRequirementsAPI } from '../../services/api';

const ReplyModal = ({ 
  isOpen, 
  onClose, 
  onSaved,
  requirement,
  currentDept
}) => {
  const [saving, setSaving] = useState(false);
  const [replyData, setReplyData] = useState({
    status: requirement?.status || 'In Progress',
    response: ''
  });

  if (!isOpen || !requirement) return null;

  const TypeIcon = REQUIREMENT_TYPES.find(t => t.value === requirement.requirement_type)?.icon || MessageSquare;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const updateData = {
        status: replyData.status,
      };
      
      // Add the response as a reply
      if (replyData.response.trim()) {
        const newReply = {
          from_department: currentDept,
          message: replyData.response,
          status_change: replyData.status !== requirement.status ? replyData.status : null,
          created_at: new Date().toISOString()
        };
        
        updateData.replies = [...(requirement.replies || []), newReply];
        updateData.response = replyData.response;
      }
      
      await projectRequirementsAPI.update(requirement.id, updateData);
      onSaved();
    } catch (error) {
      console.error('Error updating requirement:', error);
      alert('Failed to update requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <Reply size={20} className="text-white" />
            <h2 className="text-lg font-semibold text-white">Reply to Request</h2>
          </div>
          <button onClick={onClose} className="p-2 text-blue-200 hover:text-white rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Request Summary */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <TypeIcon size={20} className="text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(requirement.priority)}`}>
                  {requirement.priority}
                </span>
                <span className="text-xs text-slate-500">
                  From: {getDeptLabel(requirement.created_by_department)}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">{requirement.requirement_type}</p>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{requirement.description}</p>
              {requirement.project_name && (
                <p className="text-xs text-slate-400 mt-1">Project: {requirement.project_pid} - {requirement.project_name}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Update */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Update Status <span className="text-red-500">*</span>
            </label>
            <select
              value={replyData.status}
              onChange={(e) => setReplyData({ ...replyData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              data-testid="reply-status-select"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
          </div>

          {/* Response Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <MessageSquare size={14} className="inline mr-1" />
              Your Response
            </label>
            <textarea
              value={replyData.response}
              onChange={(e) => setReplyData({ ...replyData, response: e.target.value })}
              placeholder="Enter your response or update..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              data-testid="reply-response-input"
            />
          </div>

          {/* Previous Replies */}
          {requirement.replies && requirement.replies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Previous Replies</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {requirement.replies.map((reply, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="font-medium">{getDeptLabel(reply.from_department)}</span>
                      <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-700">{reply.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              data-testid="submit-reply-btn"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Reply size={18} />}
              Send Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReplyModal;
