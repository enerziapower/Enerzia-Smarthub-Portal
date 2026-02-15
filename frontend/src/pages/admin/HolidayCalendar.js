import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Edit, Trash2, Clock, MapPin, Users,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { adminHubAPI } from '../../services/api';
import { toast } from 'sonner';

const HolidayCalendar = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'national'
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await adminHubAPI.getHolidays({ year: selectedYear });
      setHolidays(res.data.holidays || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingId) {
        await adminHubAPI.updateHoliday(editingId, formData);
        toast.success('Holiday updated successfully');
      } else {
        await adminHubAPI.createHoliday(formData);
        toast.success('Holiday added successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', date: '', type: 'national' });
      fetchHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      toast.error('Failed to save holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (holiday) => {
    setEditingId(holiday.id);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await adminHubAPI.deleteHoliday(id);
        toast.success('Holiday deleted');
        fetchHolidays();
      } catch (error) {
        console.error('Error deleting holiday:', error);
        toast.error('Failed to delete holiday');
      }
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'national': return 'bg-blue-100 text-blue-700';
      case 'regional': return 'bg-green-100 text-green-700';
      case 'company': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 3);
  const nationalCount = holidays.filter(h => h.type === 'national').length;
  const regionalCount = holidays.filter(h => h.type === 'regional').length;
  const companyCount = holidays.filter(h => h.type === 'company').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="holiday-calendar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Holiday Calendar</h1>
          <p className="text-slate-500 mt-1">Manage company holidays and observances</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-slate-200 rounded-lg"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', date: '', type: 'national' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            data-testid="add-holiday-btn"
          >
            <Plus size={18} />
            Add Holiday
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Holidays</p>
              <p className="text-xl font-bold text-slate-800">{holidays.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-blue-600">National</p>
              <p className="text-xl font-bold text-blue-700">{nationalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">Regional</p>
              <p className="text-xl font-bold text-green-700">{regionalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-purple-600">Company</p>
              <p className="text-xl font-bold text-purple-700">{companyCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Holidays Banner */}
      {upcomingHolidays.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <h3 className="font-semibold mb-3">Upcoming Holidays</h3>
          <div className="flex gap-4 flex-wrap">
            {upcomingHolidays.map((holiday) => (
              <div key={holiday.id} className="bg-white/20 rounded-lg px-4 py-2">
                <p className="font-medium">{holiday.name}</p>
                <p className="text-sm text-white/80">
                  {new Date(holiday.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {holiday.day}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holidays List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">All Holidays - {selectedYear}</h2>
        </div>
        {holidays.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Calendar className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No holidays added for {selectedYear}</p>
            <p className="text-sm">Click "Add Holiday" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Holiday</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-slate-50" data-testid={`holiday-${holiday.id}`}>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {new Date(holiday.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{holiday.day}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{holiday.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getTypeBadge(holiday.type)}`}>
                        {holiday.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(holiday)}
                          className="p-1.5 hover:bg-slate-200 rounded" 
                          title="Edit"
                        >
                          <Edit size={14} className="text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleDelete(holiday.id)}
                          className="p-1.5 hover:bg-red-50 rounded" 
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Holiday' : 'Add Holiday'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Diwali"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="holiday-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  data-testid="holiday-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="national">National Holiday</option>
                  <option value="regional">Regional Holiday</option>
                  <option value="company">Company Holiday</option>
                </select>
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
                  data-testid="holiday-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Update' : 'Add'} Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayCalendar;
