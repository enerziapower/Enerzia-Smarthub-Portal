import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Plus, Car, Bike, Camera, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, Loader2, Trash2,
  ChevronDown, FileText, Download, X, Send, Scan
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TravelLog = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState({ two_wheeler_rate: 4.25, four_wheeler_rate: 9.0 });
  const [ocrLoading, setOcrLoading] = useState({ start: false, end: false });
  const [editingTrip, setEditingTrip] = useState(null);  // For editing rejected trips

  const startPhotoRef = useRef(null);
  const endPhotoRef = useRef(null);

  const [newTrip, setNewTrip] = useState({
    from_location: '',
    to_location: '',
    vehicle_type: 'two_wheeler',
    start_km: '',
    end_km: '',
    purpose: 'Site Visit',
    notes: '',
    start_photo: null,
    end_photo: null
  });

  const purposeOptions = [
    'Project Execution',
    'Site Visit',
    'Material Purchase',
    'Client Meeting',
    'Delivery',
    'Other'
  ];

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  useEffect(() => {
    fetchTrips();
    fetchRates();
  }, [user, currentMonth, currentYear]);

  const fetchTrips = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/my-trips/${user.id}?month=${currentMonth}&year=${currentYear}`);
      const data = await res.json();
      setTrips(data.trips || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/travel-log/rates`);
      const data = await res.json();
      setRates(data);
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  // OCR function to extract odometer reading from photo
  const extractOdometerReading = async (file, type) => {
    if (!file) return;
    
    setOcrLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const res = await fetch(`${API_URL}/api/travel-log/ocr/odometer`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (data.success && data.odometer_reading) {
        // Update the corresponding km field
        if (type === 'start') {
          setNewTrip(prev => ({ ...prev, start_km: data.odometer_reading.toString() }));
          toast.success(`Start odometer detected: ${data.odometer_reading} km`);
        } else {
          setNewTrip(prev => ({ ...prev, end_km: data.odometer_reading.toString() }));
          toast.success(`End odometer detected: ${data.odometer_reading} km`);
        }
      } else {
        toast.error(data.error || 'Could not read odometer from photo. Please enter manually.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Failed to read odometer. Please enter manually.');
    } finally {
      setOcrLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Handle photo upload with OCR
  const handleStartPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewTrip(prev => ({ ...prev, start_photo: file }));
      // Trigger OCR
      await extractOdometerReading(file, 'start');
    }
  };

  const handleEndPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewTrip(prev => ({ ...prev, end_photo: file }));
      // Trigger OCR
      await extractOdometerReading(file, 'end');
    }
  };

  const handleSubmitTrip = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (parseFloat(newTrip.end_km) <= parseFloat(newTrip.start_km)) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('user_name', user.name || '');
      formData.append('department', user.department || '');
      formData.append('from_location', newTrip.from_location);
      formData.append('to_location', newTrip.to_location);
      formData.append('vehicle_type', newTrip.vehicle_type);
      formData.append('start_km', newTrip.start_km);
      formData.append('end_km', newTrip.end_km);
      formData.append('purpose', newTrip.purpose);
      formData.append('notes', newTrip.notes || '');
      
      if (newTrip.start_photo) {
        formData.append('start_photo', newTrip.start_photo);
      }
      if (newTrip.end_photo) {
        formData.append('end_photo', newTrip.end_photo);
      }

      const res = await fetch(`${API_URL}/api/travel-log/trip`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success('Trip logged successfully!');
        setShowAddTrip(false);
        setNewTrip({
          from_location: '',
          to_location: '',
          vehicle_type: 'two_wheeler',
          start_km: '',
          end_km: '',
          purpose: 'Site Visit',
          notes: '',
          start_photo: null,
          end_photo: null
        });
        fetchTrips();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to log trip');
      }
    } catch (error) {
      console.error('Error submitting trip:', error);
      toast.error('Failed to log trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Delete this trip?')) return;
    try {
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trip deleted');
        fetchTrips();
      } else {
        toast.error('Failed to delete trip');
      }
    } catch (error) {
      toast.error('Failed to delete trip');
    }
  };

  // Handle editing a rejected trip
  const handleEditRejectedTrip = (trip) => {
    setEditingTrip(trip);
    setNewTrip({
      from_location: trip.from_location || trip.start_location || '',
      to_location: trip.to_location || trip.end_location || '',
      vehicle_type: trip.vehicle_type || 'two_wheeler',
      start_km: trip.start_km?.toString() || '',
      end_km: trip.end_km?.toString() || '',
      purpose: trip.purpose || 'Site Visit',
      notes: trip.notes || '',
      start_photo: null,
      end_photo: null
    });
    setShowAddTrip(true);
  };

  // Handle resubmitting a rejected trip
  const handleResubmitTrip = async (e) => {
    e.preventDefault();
    if (!editingTrip?._id && !editingTrip?.id) return;

    if (parseFloat(newTrip.end_km) <= parseFloat(newTrip.start_km)) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('start_location', newTrip.from_location);
      formData.append('end_location', newTrip.to_location);
      formData.append('vehicle_type', newTrip.vehicle_type);
      formData.append('start_km', newTrip.start_km);
      formData.append('end_km', newTrip.end_km);
      formData.append('purpose', newTrip.purpose);
      formData.append('notes', newTrip.notes || '');
      
      if (newTrip.start_photo) {
        formData.append('start_photo', newTrip.start_photo);
      }
      if (newTrip.end_photo) {
        formData.append('end_photo', newTrip.end_photo);
      }

      const tripId = editingTrip._id || editingTrip.id;
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}/resubmit`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        toast.success('Trip resubmitted for approval!');
        setShowAddTrip(false);
        setEditingTrip(null);
        setNewTrip({
          from_location: '',
          to_location: '',
          vehicle_type: 'two_wheeler',
          start_km: '',
          end_km: '',
          purpose: 'Site Visit',
          notes: '',
          start_photo: null,
          end_photo: null
        });
        fetchTrips();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to resubmit trip');
      }
    } catch (error) {
      console.error('Error resubmitting trip:', error);
      toast.error('Failed to resubmit trip');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/travel-log/report/download/pdf/${user.id}?month=${currentMonth}&year=${currentYear}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Travel_Report_${months[currentMonth - 1].label}_${currentYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertCircle, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  };

  const groupTripsByDate = (trips) => {
    const grouped = {};
    trips.forEach(trip => {
      const date = trip.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(trip);
    });
    return grouped;
  };

  const groupedTrips = groupTripsByDate(trips);

  const calculateDistance = () => {
    const start = parseFloat(newTrip.start_km) || 0;
    const end = parseFloat(newTrip.end_km) || 0;
    return Math.max(0, end - start);
  };

  const calculateAllowance = () => {
    const distance = calculateDistance();
    const rate = newTrip.vehicle_type === 'two_wheeler' ? rates.two_wheeler_rate : rates.four_wheeler_rate;
    return (distance * rate).toFixed(2);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="travel-log">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Travel Log</h1>
          <p className="text-slate-500 mt-1">Log your daily trips and track travel allowance</p>
        </div>
        <button
          onClick={downloadReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          data-testid="download-report-btn"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{summary.total_trips || 0}</div>
          <div className="text-sm text-slate-500">Total Trips</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{summary.total_distance?.toFixed(1) || 0} km</div>
          <div className="text-sm text-slate-500">Total Distance</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">₹{summary.approved_allowance?.toFixed(2) || 0}</div>
          <div className="text-sm text-slate-500">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{summary.pending || 0}</div>
          <div className="text-sm text-slate-500">Pending</div>
        </div>
      </div>

      {/* Month Filter */}
      <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-slate-200">
        <Calendar className="w-5 h-5 text-slate-400" />
        <select
          value={currentMonth}
          onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2026, 2025, 2024].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Add Trip Button */}
      <button
        onClick={() => setShowAddTrip(true)}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
        data-testid="add-trip-btn"
      >
        <Plus className="w-5 h-5" />
        Add New Trip
      </button>

      {/* Trips Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : Object.keys(groupedTrips).length > 0 ? (
          Object.entries(groupedTrips).map(([date, dayTrips]) => (
            <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Date Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="font-semibold text-slate-700">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-sm text-slate-500">
                  {dayTrips.length} trip{dayTrips.length > 1 ? 's' : ''} • {dayTrips.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(1)} km
                </div>
              </div>

              {/* Trips */}
              <div className="divide-y divide-slate-100">
                {dayTrips.map((trip, idx) => (
                  <div key={trip.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Route */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-2 rounded-full ${trip.vehicle_type === 'two_wheeler' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                            {trip.vehicle_type === 'two_wheeler' ? 
                              <Bike className="w-4 h-4 text-blue-600" /> : 
                              <Car className="w-4 h-4 text-purple-600" />
                            }
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {trip.from_location} → {trip.to_location}
                            </div>
                            <div className="text-xs text-slate-500">{trip.purpose}</div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 ml-10">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {trip.time}
                          </span>
                          <span>Start: {trip.start_km} km</span>
                          <span>End: {trip.end_km} km</span>
                          <span className="font-semibold text-slate-900">📏 {trip.distance?.toFixed(1)} km</span>
                          <span className="font-semibold text-emerald-600">₹{trip.allowance?.toFixed(2)}</span>
                        </div>

                        {/* Photos */}
                        {(trip.start_photo || trip.end_photo) && (
                          <div className="flex gap-2 mt-2 ml-10">
                            {trip.start_photo && (
                              <a href={`${API_URL}/api/uploads${trip.start_photo}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Start Photo
                              </a>
                            )}
                            {trip.end_photo && (
                              <a href={`${API_URL}/api/uploads${trip.end_photo}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Camera className="w-3 h-3" /> End Photo
                              </a>
                            )}
                          </div>
                        )}

                        {trip.rejection_reason && (
                          <div className="mt-2 ml-10 text-sm text-red-600">
                            Reason: {trip.rejection_reason}
                          </div>
                        )}
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(trip.status)}
                        {trip.status === 'pending' && (
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete trip"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {trip.status === 'rejected' && (
                          <button
                            onClick={() => handleEditRejectedTrip(trip)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                            title="Edit and resubmit"
                          >
                            <Send className="w-3 h-3" />
                            Edit & Resubmit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No trips logged</h3>
            <p className="text-slate-400 mt-1">Start by adding your first trip</p>
          </div>
        )}
      </div>

      {/* Add Trip Modal */}
      {showAddTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingTrip ? 'Edit & Resubmit Trip' : 'Log New Trip'}
                </h2>
                {editingTrip && (
                  <p className="text-xs text-amber-600 mt-1">
                    This trip was rejected. Update the details and resubmit for approval.
                  </p>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowAddTrip(false);
                  setEditingTrip(null);
                  setNewTrip({
                    from_location: '',
                    to_location: '',
                    vehicle_type: 'two_wheeler',
                    start_km: '',
                    end_km: '',
                    purpose: 'Site Visit',
                    notes: '',
                    start_photo: null,
                    end_photo: null
                  });
                }} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Show rejection reason if editing */}
            {editingTrip?.rejection_reason && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-600 mt-1">{editingTrip.rejection_reason}</p>
              </div>
            )}

            <form onSubmit={editingTrip ? handleResubmitTrip : handleSubmitTrip} className="p-4 space-y-4">
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewTrip({ ...newTrip, vehicle_type: 'two_wheeler' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      newTrip.vehicle_type === 'two_wheeler' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Bike className={`w-8 h-8 ${newTrip.vehicle_type === 'two_wheeler' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-medium">Two Wheeler</span>
                    <span className="text-xs text-slate-500">₹{rates.two_wheeler_rate}/km</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrip({ ...newTrip, vehicle_type: 'four_wheeler' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      newTrip.vehicle_type === 'four_wheeler' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Car className={`w-8 h-8 ${newTrip.vehicle_type === 'four_wheeler' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="font-medium">Four Wheeler</span>
                    <span className="text-xs text-slate-500">₹{rates.four_wheeler_rate}/km</span>
                  </button>
                </div>
              </div>

              {/* From/To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                  <input
                    type="text"
                    value={newTrip.from_location}
                    onChange={(e) => setNewTrip({ ...newTrip, from_location: e.target.value })}
                    placeholder="e.g., Office"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                  <input
                    type="text"
                    value={newTrip.to_location}
                    onChange={(e) => setNewTrip({ ...newTrip, to_location: e.target.value })}
                    placeholder="e.g., Site ABC"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* KM Readings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start KM</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTrip.start_km}
                    onChange={(e) => setNewTrip({ ...newTrip, start_km: e.target.value })}
                    placeholder="45230"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End KM</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newTrip.end_km}
                    onChange={(e) => setNewTrip({ ...newTrip, end_km: e.target.value })}
                    placeholder="45265"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Calculated Distance & Allowance */}
              {newTrip.start_km && newTrip.end_km && (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Distance</div>
                    <div className="text-xl font-bold text-slate-900">{calculateDistance().toFixed(1)} km</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Allowance</div>
                    <div className="text-xl font-bold text-emerald-600">₹{calculateAllowance()}</div>
                  </div>
                </div>
              )}

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <select
                  value={newTrip.purpose}
                  onChange={(e) => setNewTrip({ ...newTrip, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {purposeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Photos with OCR */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Odometer Photo
                    {ocrLoading.start && <span className="ml-2 text-blue-600 text-xs">(Reading...)</span>}
                  </label>
                  <input
                    type="file"
                    ref={startPhotoRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleStartPhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => startPhotoRef.current?.click()}
                    disabled={ocrLoading.start}
                    className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 transition-colors ${
                      newTrip.start_photo ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                    } ${ocrLoading.start ? 'opacity-50' : ''}`}
                  >
                    {ocrLoading.start ? (
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    ) : (
                      <Camera className={`w-6 h-6 ${newTrip.start_photo ? 'text-green-600' : 'text-slate-400'}`} />
                    )}
                    <span className="text-sm text-slate-600">
                      {ocrLoading.start ? 'Reading odometer...' : (newTrip.start_photo ? newTrip.start_photo.name : 'Capture/Upload')}
                    </span>
                    {newTrip.start_photo && !ocrLoading.start && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Scan className="w-3 h-3" /> Auto-detect enabled
                      </span>
                    )}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Odometer Photo
                    {ocrLoading.end && <span className="ml-2 text-blue-600 text-xs">(Reading...)</span>}
                  </label>
                  <input
                    type="file"
                    ref={endPhotoRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleEndPhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => endPhotoRef.current?.click()}
                    disabled={ocrLoading.end}
                    className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 transition-colors ${
                      newTrip.end_photo ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                    } ${ocrLoading.end ? 'opacity-50' : ''}`}
                  >
                    {ocrLoading.end ? (
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    ) : (
                      <Camera className={`w-6 h-6 ${newTrip.end_photo ? 'text-green-600' : 'text-slate-400'}`} />
                    )}
                    <span className="text-sm text-slate-600">
                      {ocrLoading.end ? 'Reading odometer...' : (newTrip.end_photo ? newTrip.end_photo.name : 'Capture/Upload')}
                    </span>
                    {newTrip.end_photo && !ocrLoading.end && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Scan className="w-3 h-3" /> Auto-detect enabled
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newTrip.notes}
                  onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  editingTrip 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {editingTrip ? 'Resubmit for Approval' : 'Submit Trip'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelLog;
