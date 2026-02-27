import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit, Trash2, Phone, MapPin, Calendar, Clock, User, Building2, Mail,
  PhoneCall, Car, MessageSquare, CheckCircle2, XCircle, RotateCcw, Send, Loader2,
  AlertCircle
} from 'lucide-react';

const followupTypes = [
  { id: 'cold_call', label: 'Cold Call', icon: PhoneCall, color: 'blue' },
  { id: 'site_visit', label: 'Site Visit', icon: Car, color: 'green' },
  { id: 'call_back', label: 'Call Back', icon: Phone, color: 'orange' },
  { id: 'visit_later', label: 'Visit Later', icon: MapPin, color: 'purple' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'slate' },
];

const statusColors = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  rescheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const priorityColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const FollowUpDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [followup, setFollowup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Complete form
  const [completeForm, setCompleteForm] = useState({
    outcome: '',
    next_action: ''
  });
  
  // Reschedule form
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    new_time: '',
    reason: ''
  });

  useEffect(() => {
    fetchFollowup();
  }, [id]);

  const fetchFollowup = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/lead-management/followups/${id}`);
      setFollowup(res.data);
    } catch (error) {
      console.error('Error fetching follow-up:', error);
      toast.error('Failed to load follow-up');
      navigate('/sales/lead-management');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!completeForm.outcome) {
      toast.error('Please enter the outcome');
      return;
    }
    
    try {
      setSubmitting(true);
      await api.post(`/lead-management/followups/${id}/complete`, null, {
        params: {
          outcome: completeForm.outcome,
          next_action: completeForm.next_action || null
        }
      });
      toast.success('Follow-up marked as completed');
      setShowCompleteModal(false);
      fetchFollowup();
    } catch (error) {
      toast.error('Failed to complete follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleForm.new_date) {
      toast.error('Please select a new date');
      return;
    }
    
    try {
      setSubmitting(true);
      await api.post(`/lead-management/followups/${id}/reschedule`, null, {
        params: {
          new_date: new Date(rescheduleForm.new_date + 'T00:00:00Z').toISOString(),
          new_time: rescheduleForm.new_time || null,
          reason: rescheduleForm.reason || null
        }
      });
      toast.success('Follow-up rescheduled');
      setShowRescheduleModal(false);
      fetchFollowup();
    } catch (error) {
      toast.error('Failed to reschedule follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this follow-up?')) return;
    
    try {
      await api.put(`/lead-management/followups/${id}`, { status: 'cancelled' });
      toast.success('Follow-up cancelled');
      fetchFollowup();
    } catch (error) {
      toast.error('Failed to cancel follow-up');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this follow-up? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/lead-management/followups/${id}`);
      toast.success('Follow-up deleted');
      navigate('/sales/lead-management');
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      await api.post(`/lead-management/followups/${id}/comments`, {
        comment: newComment,
        created_by: user?.id,
        created_by_name: user?.name
      });
      toast.success('Comment added');
      setNewComment('');
      fetchFollowup();
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeInfo = (type) => {
    return followupTypes.find(t => t.id === type) || followupTypes[4];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isOverdue = () => {
    if (!followup) return false;
    if (followup.status === 'completed' || followup.status === 'cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(followup.scheduled_date);
    scheduled.setHours(0, 0, 0, 0);
    return scheduled < today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!followup) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Follow-up not found</p>
      </div>
    );
  }

  const typeInfo = getTypeInfo(followup.followup_type);
  const TypeIcon = typeInfo.icon;
  const overdue = isOverdue();

  return (
    <div data-testid="followup-details" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/sales/lead-management')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-${typeInfo.color}-500/20`}>
                <TypeIcon className={`w-5 h-5 text-${typeInfo.color}-400`} />
              </div>
              <span className={`text-sm text-${typeInfo.color}-400`}>{typeInfo.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[followup.status]}`}>
                {followup.status}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[followup.priority]}`}>
                {followup.priority} priority
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{followup.title}</h1>
            {overdue && (
              <p className="text-red-400 text-sm flex items-center gap-1 mt-2">
                <AlertCircle className="w-4 h-4" />
                This follow-up is overdue
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/sales/lead-management/edit/${id}`)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {followup.status !== 'completed' && followup.status !== 'cancelled' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-slate-400 text-sm font-medium mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCompleteModal(true)}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </button>
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reschedule
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer/Lead Info */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            {followup.is_existing_customer ? 'Customer' : 'Lead'} Information
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-slate-500 text-xs">Name / Company</p>
              <p className="text-white">
                {followup.customer_name || followup.lead_company || followup.lead_name || '-'}
              </p>
            </div>
            
            {followup.is_existing_customer ? (
              <>
                <div>
                  <p className="text-slate-500 text-xs">Type</p>
                  <p className="text-white capitalize">
                    {followup.customer_type === 'domestic' ? '🇮🇳 Domestic' : '🌍 Overseas'} Customer
                  </p>
                </div>
                {followup.customer_email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="text-white flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {followup.customer_email}
                    </p>
                  </div>
                )}
                {followup.customer_phone && (
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="text-white flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {followup.customer_phone}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {followup.lead_email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="text-white flex items-center gap-2">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {followup.lead_email}
                    </p>
                  </div>
                )}
                {followup.lead_phone && (
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="text-white flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {followup.lead_phone}
                    </p>
                  </div>
                )}
                {followup.lead_address && (
                  <div>
                    <p className="text-slate-500 text-xs">Address</p>
                    <p className="text-white flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {followup.lead_address}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Schedule Info */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Schedule & Assignment
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-slate-500 text-xs">Scheduled Date</p>
              <p className={`font-medium ${overdue ? 'text-red-400' : 'text-white'}`}>
                {formatDate(followup.scheduled_date)}
              </p>
            </div>
            
            {followup.scheduled_time && (
              <div>
                <p className="text-slate-500 text-xs">Time</p>
                <p className="text-white flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {followup.scheduled_time}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-slate-500 text-xs">Assigned To</p>
              <p className="text-white flex items-center gap-2">
                <User className="w-3 h-3 text-slate-500" />
                {followup.assigned_to_name || 'Unassigned'}
              </p>
            </div>
            
            {followup.location && (
              <div>
                <p className="text-slate-500 text-xs">Location</p>
                <p className="text-white flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {followup.location}
                </p>
              </div>
            )}
            
            {followup.contact_person && (
              <div>
                <p className="text-slate-500 text-xs">Contact Person</p>
                <p className="text-white">{followup.contact_person}</p>
              </div>
            )}
            
            {followup.contact_phone && (
              <div>
                <p className="text-slate-500 text-xs">Contact Phone</p>
                <p className="text-white">{followup.contact_phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description & Notes */}
      {(followup.description || followup.notes) && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-white font-medium mb-4">Details</h3>
          {followup.description && (
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-1">Description</p>
              <p className="text-slate-300 whitespace-pre-wrap">{followup.description}</p>
            </div>
          )}
          {followup.notes && (
            <div>
              <p className="text-slate-500 text-xs mb-1">Notes</p>
              <p className="text-slate-300 whitespace-pre-wrap">{followup.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Outcome (if completed) */}
      {followup.status === 'completed' && followup.outcome && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <h3 className="text-green-400 font-medium mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Outcome
          </h3>
          <p className="text-white">{followup.outcome}</p>
          {followup.next_action && (
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-slate-500 text-xs mb-1">Next Action</p>
              <p className="text-slate-300">{followup.next_action}</p>
            </div>
          )}
          {followup.completed_at && (
            <p className="text-slate-500 text-xs mt-3">
              Completed on {formatDateTime(followup.completed_at)}
            </p>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Comments & Activity
        </h3>
        
        {/* Add Comment */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Comments List */}
        <div className="space-y-3">
          {followup.comments && followup.comments.length > 0 ? (
            followup.comments.map((comment, index) => (
              <div key={index} className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{comment.created_by_name || 'System'}</span>
                  <span className="text-slate-500 text-xs">{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-slate-300 text-sm">{comment.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No comments yet</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-slate-500 text-xs flex items-center justify-between">
        <span>Created: {formatDateTime(followup.created_at)}</span>
        <span>Last Updated: {formatDateTime(followup.updated_at)}</span>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Mark as Complete</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Outcome *</label>
                <textarea
                  value={completeForm.outcome}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, outcome: e.target.value }))}
                  placeholder="What was the result of this follow-up?"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Next Action</label>
                <input
                  type="text"
                  value={completeForm.next_action}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, next_action: e.target.value }))}
                  placeholder="What should be done next?"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Reschedule Follow-up</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">New Date *</label>
                <input
                  type="date"
                  value={rescheduleForm.new_date}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, new_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">New Time</label>
                <input
                  type="time"
                  value={rescheduleForm.new_time}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, new_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Reason</label>
                <input
                  type="text"
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why is this being rescheduled?"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpDetails;
