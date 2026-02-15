import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Clock, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // For super_admin, show all. For others, filter by department
      if (user?.role !== 'super_admin' && user?.department) {
        params.department = user.department;
      }
      
      // Also fetch CEO notifications if user is CEO
      if (user?.role === 'ceo_owner') {
        params.department = 'CEO';
      }
      
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getAll({ ...params, limit: 20 }),
        notificationsAPI.getCount(params)
      ]);
      
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const dept = user?.role === 'ceo_owner' ? 'CEO' : user?.department;
      await notificationsAPI.markAllRead(dept);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_request':
        return <CreditCard size={16} className="text-blue-500" />;
      case 'department_requirement':
        return <FileText size={16} className="text-purple-500" />;
      case 'approval_needed':
        return <AlertCircle size={16} className="text-orange-500" />;
      case 'status_update':
        return <CheckCheck size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-slate-500" />;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        data-testid="notification-bell"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-200 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notif.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-400">{formatTime(notif.created_at)}</span>
                        {notif.from_department && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-400">From {notif.from_department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a full notifications page
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
