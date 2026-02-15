import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
  Headphones, ArrowLeft, Loader2, Send, Plus,
  MessageCircle, Clock, CheckCircle, AlertCircle, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerSupport = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    description: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }
    
    if (ticketId) {
      loadTicketDetail(token, ticketId);
    } else {
      loadTickets(token);
    }
  }, [navigate, ticketId]);

  const loadTickets = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/support?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/customer-portal/login');
          return;
        }
        throw new Error('Failed to load tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (token, id) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/support/${id}?token=${token}`);
      
      if (!response.ok) {
        throw new Error('Failed to load ticket');
      }

      const data = await response.json();
      setSelectedTicket(data);
    } catch (err) {
      console.error('Error loading ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.description.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const token = localStorage.getItem('customer_token');
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API}/api/customer-portal/support?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create ticket');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: `Ticket ${data.ticket_no} created successfully!` });
      setShowForm(false);
      setFormData({ subject: '', category: 'general', priority: 'normal', description: '' });
      loadTickets(token);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const token = localStorage.getItem('customer_token');
    setSubmitting(true);

    try {
      const response = await fetch(`${API}/api/customer-portal/support/${selectedTicket.id}/message?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      loadTicketDetail(token, selectedTicket.id);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-amber-500/20 text-amber-400',
      resolved: 'bg-green-500/20 text-green-400',
      closed: 'bg-slate-500/20 text-slate-400'
    };
    const labels = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.open}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'text-slate-400',
      normal: 'text-blue-400',
      high: 'text-amber-400',
      urgent: 'text-red-400'
    };
    return <span className={`text-xs uppercase ${styles[priority] || styles.normal}`}>{priority}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Ticket Detail View
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link 
              to="/customer-portal/support"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-white font-semibold">{selectedTicket.ticket_no}</h1>
              <p className="text-sm text-slate-400">{selectedTicket.subject}</p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Ticket Info */}
          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                <span className="text-xs text-slate-500 capitalize">{selectedTicket.category}</span>
              </div>
              <span className="text-xs text-slate-500">{formatDate(selectedTicket.created_at)}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <h3 className="text-white font-medium mb-4">Conversation</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(selectedTicket.messages || []).map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`p-3 rounded-lg ${
                    msg.from === 'customer'
                      ? 'bg-emerald-500/20 ml-8'
                      : 'bg-slate-700 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      msg.from === 'customer' ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {msg.from === 'customer' ? 'You' : 'Support Team'}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-300">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Add Message */}
            {selectedTicket.status !== 'closed' && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMessage()}
                />
                <button
                  onClick={handleAddMessage}
                  disabled={submitting || !newMessage.trim()}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tickets List View
  return (
    <div className="min-h-screen bg-slate-900">
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
              <Headphones className="w-5 h-5 text-emerald-400" />
              <h1 className="text-white font-semibold">Support</h1>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Ticket
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

        {/* New Ticket Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Create Support Ticket</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing</option>
                    <option value="service">Service Related</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please describe your issue in detail..."
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
                  Submit Ticket
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ subject: '', category: 'general', priority: 'normal', description: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tickets List */}
        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Tickets</h2>
          
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No support tickets</p>
              <p className="text-sm text-slate-500 mt-1">Create a ticket if you need help</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/customer-portal/support/${ticket.id}`}
                  className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-emerald-400 font-mono">{ticket.ticket_no}</span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <h3 className="text-white font-medium truncate">{ticket.subject}</h3>
                      <p className="text-sm text-slate-400 truncate mt-1">{ticket.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-slate-500">{formatDate(ticket.created_at)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
