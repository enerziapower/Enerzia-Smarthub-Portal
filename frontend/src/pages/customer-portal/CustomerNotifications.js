import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, Check, CheckCheck, Trash2, ArrowLeft, 
  Loader2, AlertCircle, Info, CheckCircle, AlertTriangle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }
    loadNotifications(token);
  }, [navigate, filter]);

  const loadNotifications = async (token) => {
    try {
      const unreadOnly = filter === 'unread';
      const response = await fetch(
        `${API}/api/customer-portal/notifications?token=${token}&unread_only=${unreadOnly}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/customer-portal/login');
          return;
        }
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    const token = localStorage.getItem('customer_token');
    try {
      await fetch(`${API}/api/customer-portal/notifications/${notificationId}/read?token=${token}`, {
        method: 'PUT'
      });
      loadNotifications(token);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('customer_token');
    try {
      await fetch(`${API}/api/customer-portal/notifications/read-all?token=${token}`, {
        method: 'PUT'
      });
      loadNotifications(token);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN');
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
              <Bell className="w-5 h-5 text-emerald-400" />
              <h1 className="text-white font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No notifications</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`bg-slate-800 rounded-xl p-4 transition-all ${
                  !notification.read ? 'border-l-4 border-emerald-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{notification.message}</p>
                    {notification.link && (
                      <Link
                        to={notification.link}
                        className="text-sm text-emerald-400 hover:underline mt-2 inline-block"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerNotifications;
