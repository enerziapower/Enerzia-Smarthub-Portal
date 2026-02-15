import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Edit, Trash2, Clock, MapPin, Users,
  CheckCircle, AlertCircle, Video, Building2, Loader2
} from 'lucide-react';
import { adminHubAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const EventsManager = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'meeting',
    attendees: 'All Employees',
    description: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await adminHubAPI.getEvents();
      setEvents(res.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingId) {
        await adminHubAPI.updateEvent(editingId, formData);
        toast.success('Event updated successfully');
      } else {
        await adminHubAPI.createEvent(formData, user?.name || 'Admin');
        toast.success('Event created successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: '', date: '', time: '', location: '', type: 'meeting', attendees: 'All Employees', description: '' });
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      type: event.type,
      attendees: event.attendees,
      description: event.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this event?')) {
      try {
        await adminHubAPI.deleteEvent(id);
        toast.success('Event deleted');
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event');
      }
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'celebration': return 'bg-pink-100 text-pink-700';
      case 'training': return 'bg-blue-100 text-blue-700';
      case 'meeting': return 'bg-green-100 text-green-700';
      case 'launch': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'celebration': return '🎉';
      case 'training': return '📚';
      case 'meeting': return '💼';
      case 'launch': return '🚀';
      default: return '📅';
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 3);
  const thisMonthEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    const now = new Date();
    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
  }).length;
  const companyWideEvents = events.filter(e => e.attendees === 'All Employees').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="events-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events Manager</h1>
          <p className="text-slate-500 mt-1">Create and manage company events</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', date: '', time: '', location: '', type: 'meeting', attendees: 'All Employees', description: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="create-event-btn"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Events</p>
              <p className="text-xl font-bold text-slate-800">{events.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">This Month</p>
              <p className="text-xl font-bold text-green-700">{thisMonthEvents}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-purple-600">Company-wide</p>
              <p className="text-xl font-bold text-purple-700">{companyWideEvents}</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Upcoming</p>
              <p className="text-xl font-bold text-amber-700">{upcomingEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events Banner */}
      {upcomingEvents.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 text-white">
          <h3 className="font-semibold mb-3">Upcoming Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getTypeIcon(event.type)}</span>
                  <span className="font-medium">{event.title}</span>
                </div>
                <p className="text-sm text-white/80">
                  {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at {event.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">All Events</h2>
        </div>
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Calendar className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No events created yet</p>
            <p className="text-sm">Click "Create Event" to add your first event</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-slate-50" data-testid={`event-${event.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                      {getTypeIcon(event.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800">{event.title}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getTypeBadge(event.type)}`}>
                          {event.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {event.attendees}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(event)}
                      className="p-2 hover:bg-slate-200 rounded-lg" 
                      title="Edit"
                    >
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="p-2 hover:bg-red-50 rounded-lg" 
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Event' : 'Create Event'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Day Celebration"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="event-title-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="event-date-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    data-testid="event-time-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Conference Room A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="event-location-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="training">Training</option>
                    <option value="celebration">Celebration</option>
                    <option value="launch">Launch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attendees</label>
                  <select
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option>All Employees</option>
                    <option>Management</option>
                    <option>Projects Dept</option>
                    <option>Sales Dept</option>
                    <option>Accounts Dept</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="event-description-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="event-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsManager;
