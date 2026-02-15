import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Star, ArrowLeft, Loader2, Send, MessageSquare,
  CheckCircle, Clock, ThumbsUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerFeedback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    rating: 5,
    feedback_type: 'general',
    comments: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }
    loadFeedbacks(token);
  }, [navigate]);

  const loadFeedbacks = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/feedback?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/customer-portal/login');
          return;
        }
        throw new Error('Failed to load feedbacks');
      }

      const data = await response.json();
      setFeedbacks(data.feedbacks || []);
    } catch (err) {
      console.error('Error loading feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.comments.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const token = localStorage.getItem('customer_token');
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API}/api/customer-portal/feedback?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit feedback');
      }

      setMessage({ type: 'success', text: 'Thank you for your feedback!' });
      setShowForm(false);
      setFormData({ subject: '', rating: 5, feedback_type: 'general', comments: '' });
      loadFeedbacks(token);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onChange && onChange(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'acknowledged':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Acknowledged</span>;
      case 'resolved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Resolved</span>;
      default:
        return <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">Pending</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/customer-portal/dashboard"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-emerald-400" />
              <h1 className="text-white font-semibold">Feedback & Ratings</h1>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              New Feedback
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* New Feedback Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Submit Feedback</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your feedback"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Rating</label>
                {renderStars(formData.rating, true, (rating) => setFormData({ ...formData, rating }))}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Feedback Type</label>
                <select
                  value={formData.feedback_type}
                  onChange={(e) => setFormData({ ...formData, feedback_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="general">General Feedback</option>
                  <option value="service_visit">Service Visit</option>
                  <option value="amc_contract">AMC Contract</option>
                  <option value="report">Report Quality</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Comments *</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Share your experience or suggestions..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Feedback
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ subject: '', rating: 5, feedback_type: 'general', comments: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback History */}
        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Feedback History</h2>
          
          {feedbacks.length === 0 ? (
            <div className="text-center py-8">
              <ThumbsUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No feedback submitted yet</p>
              <p className="text-sm text-slate-500 mt-1">Share your experience with us!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-medium">{feedback.subject}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {renderStars(feedback.rating)}
                        <span className="text-xs text-slate-500 capitalize">
                          {feedback.feedback_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(feedback.status)}
                      <span className="text-xs text-slate-500">{formatDate(feedback.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">{feedback.comments}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerFeedback;
