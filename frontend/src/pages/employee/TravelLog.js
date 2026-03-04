import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Plus, Car, Bike, Camera, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, Loader2, Trash2,
  ChevronDown, FileText, Download, X, Send, Scan,
  Play, Square, Building2, ArrowRight, Upload, Image
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Office address - can be fetched from org settings in future
const OFFICE_ADDRESS = "Office";

const TravelLog = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]); // Trips in progress
  const [draftTrips, setDraftTrips] = useState([]); // Completed but not submitted to HR
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [showEndTrip, setShowEndTrip] = useState(false);
  const [selectedActiveTrip, setSelectedActiveTrip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [rates, setRates] = useState({ two_wheeler_rate: 4.25, four_wheeler_rate: 9.0 });
  const [ocrLoading, setOcrLoading] = useState({ start: false, end: false });
  const [editingTrip, setEditingTrip] = useState(null);
  const [showSubmitWeekly, setShowSubmitWeekly] = useState(false);
  const [selectedDraftTrips, setSelectedDraftTrips] = useState([]);

  const startPhotoRef = useRef(null);
  const endPhotoRef = useRef(null);

  // Start Trip Form
  const [startTripData, setStartTripData] = useState({
    from_location: '',
    vehicle_type: 'two_wheeler',
    start_km: '',
    purpose: 'Site Visit',
    start_photo: null,
  });

  // End Trip Form  
  const [endTripData, setEndTripData] = useState({
    to_location: '',
    end_km: '',
    notes: '',
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
    fetchActiveTrips();
    fetchRates();
  }, [user, currentMonth, currentYear]);

  const fetchTrips = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/my-trips/${user.id}?month=${currentMonth}&year=${currentYear}`);
      const data = await res.json();
      // Separate trips by status
      const allTrips = data.trips || [];
      const drafts = allTrips.filter(t => t.status === 'draft'); // Not yet submitted to HR
      const submitted = allTrips.filter(t => t.status !== 'in_progress' && t.status !== 'draft');
      setDraftTrips(drafts);
      setTrips(submitted);
      setSummary(data.summary || {});
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTrips = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/travel-log/my-trips/${user.id}?status=in_progress`);
      const data = await res.json();
      const inProgress = (data.trips || []).filter(t => t.status === 'in_progress');
      setActiveTrips(inProgress);
    } catch (error) {
      console.error('Error fetching active trips:', error);
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

  // Submit selected draft trips to HR for approval
  const handleSubmitToHR = async () => {
    if (selectedDraftTrips.length === 0) {
      toast.error('Please select trips to submit');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/travel-log/submit-to-hr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: selectedDraftTrips })
      });
      
      if (res.ok) {
        toast.success(`${selectedDraftTrips.length} trip(s) submitted to HR for approval!`);
        setShowSubmitWeekly(false);
        setSelectedDraftTrips([]);
        fetchTrips();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to submit trips');
      }
    } catch (error) {
      console.error('Error submitting trips:', error);
      toast.error('Failed to submit trips');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle trip selection for batch submission
  const toggleTripSelection = (tripId) => {
    setSelectedDraftTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  // Select all draft trips
  const selectAllDrafts = () => {
    if (selectedDraftTrips.length === draftTrips.length) {
      setSelectedDraftTrips([]);
    } else {
      setSelectedDraftTrips(draftTrips.map(t => t.id));
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
        if (type === 'start') {
          setStartTripData(prev => ({ ...prev, start_km: data.odometer_reading.toString() }));
          toast.success(`Start odometer detected: ${data.odometer_reading} km`);
        } else {
          setEndTripData(prev => ({ ...prev, end_km: data.odometer_reading.toString() }));
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

  const handleStartPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setStartTripData(prev => ({ ...prev, start_photo: file }));
      await extractOdometerReading(file, 'start');
    }
  };

  const handleEndPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setEndTripData(prev => ({ ...prev, end_photo: file }));
      await extractOdometerReading(file, 'end');
    }
  };

  // START TRIP - Quick entry
  const handleStartTrip = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('user_name', user.name || '');
      formData.append('department', user.department || '');
      formData.append('from_location', startTripData.from_location);
      formData.append('to_location', 'In Progress'); // Placeholder
      formData.append('vehicle_type', startTripData.vehicle_type);
      formData.append('start_km', startTripData.start_km);
      formData.append('end_km', '0'); // Will be updated when ending trip
      formData.append('purpose', startTripData.purpose);
      formData.append('status', 'in_progress'); // Mark as in progress
      formData.append('notes', '');
      
      // Include start photo if captured
      if (startTripData.start_photo) {
        formData.append('start_photo', startTripData.start_photo);
      }

      const res = await fetch(`${API_URL}/api/travel-log/trip`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        toast.success('🚗 Trip started! Complete it when you return.');
        setShowStartTrip(false);
        setStartTripData({
          from_location: '',
          vehicle_type: 'two_wheeler',
          start_km: '',
          purpose: 'Site Visit',
          start_photo: null,
        });
        fetchActiveTrips();
        fetchTrips();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to start trip');
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      toast.error('Failed to start trip');
    } finally {
      setSubmitting(false);
    }
  };

  // END TRIP - Complete with photos
  const handleEndTrip = async (e) => {
    e.preventDefault();
    if (!selectedActiveTrip) return;

    const startKm = parseFloat(selectedActiveTrip.start_km);
    const endKm = parseFloat(endTripData.end_km);

    if (endKm <= startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('to_location', endTripData.to_location);
      formData.append('end_km', endTripData.end_km);
      formData.append('notes', endTripData.notes || '');
      formData.append('status', 'pending'); // Change to pending for approval
      
      if (endTripData.start_photo) {
        formData.append('start_photo', endTripData.start_photo);
      }
      if (endTripData.end_photo) {
        formData.append('end_photo', endTripData.end_photo);
      }

      const tripId = selectedActiveTrip.id || selectedActiveTrip._id;
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}/complete`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        toast.success('✅ Trip completed and submitted for approval!');
        setShowEndTrip(false);
        setSelectedActiveTrip(null);
        setEndTripData({
          to_location: '',
          end_km: '',
          notes: '',
          start_photo: null,
          end_photo: null
        });
        fetchActiveTrips();
        fetchTrips();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to complete trip');
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      toast.error('Failed to complete trip');
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
        fetchActiveTrips();
      } else {
        toast.error('Failed to delete trip');
      }
    } catch (error) {
      toast.error('Failed to delete trip');
    }
  };

  const handleEditRejectedTrip = (trip) => {
    setEditingTrip(trip);
    setStartTripData({
      from_location: trip.from_location || '',
      vehicle_type: trip.vehicle_type || 'two_wheeler',
      start_km: trip.start_km?.toString() || '',
      purpose: trip.purpose || 'Site Visit',
    });
    setEndTripData({
      to_location: trip.to_location || '',
      end_km: trip.end_km?.toString() || '',
      notes: trip.notes || '',
      start_photo: null,
      end_photo: null
    });
    setShowStartTrip(true);
  };

  const handleResubmitTrip = async (e) => {
    e.preventDefault();
    if (!editingTrip) return;

    const startKm = parseFloat(startTripData.start_km);
    const endKm = parseFloat(endTripData.end_km);

    if (endKm <= startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('from_location', startTripData.from_location);
      formData.append('to_location', endTripData.to_location);
      formData.append('vehicle_type', startTripData.vehicle_type);
      formData.append('start_km', startTripData.start_km);
      formData.append('end_km', endTripData.end_km);
      formData.append('purpose', startTripData.purpose);
      formData.append('notes', endTripData.notes || '');
      
      if (endTripData.start_photo) {
        formData.append('start_photo', endTripData.start_photo);
      }
      if (endTripData.end_photo) {
        formData.append('end_photo', endTripData.end_photo);
      }

      const tripId = editingTrip.id || editingTrip._id;
      const res = await fetch(`${API_URL}/api/travel-log/trip/${tripId}/resubmit`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        toast.success('Trip resubmitted for approval!');
        setShowStartTrip(false);
        setEditingTrip(null);
        setStartTripData({
          from_location: '',
          vehicle_type: 'two_wheeler',
          start_km: '',
          purpose: 'Site Visit',
        });
        setEndTripData({
          to_location: '',
          end_km: '',
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

  const calculateDistance = () => {
    const start = parseFloat(startTripData.start_km || selectedActiveTrip?.start_km) || 0;
    const end = parseFloat(endTripData.end_km) || 0;
    return Math.max(0, end - start);
  };

  const calculateAllowance = () => {
    const distance = calculateDistance();
    const rate = (startTripData.vehicle_type || selectedActiveTrip?.vehicle_type) === 'two_wheeler' 
      ? rates.two_wheeler_rate 
      : rates.four_wheeler_rate;
    return (distance * rate).toFixed(2);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pending</span>,
      approved: <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>,
      rejected: <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>,
      in_progress: <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><Play className="w-3 h-3" /> In Progress</span>
    };
    return badges[status] || badges.pending;
  };

  // Group trips by date
  const groupedTrips = trips.reduce((groups, trip) => {
    const date = trip.date || new Date().toISOString().split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(trip);
    return groups;
  }, {});

  // Office Quick Button Component
  const OfficeButton = ({ onClick, isSelected }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
        isSelected 
          ? 'bg-blue-600 text-white' 
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
      }`}
    >
      <Building2 className="w-4 h-4" />
      Office
    </button>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Travel Log</h1>
          <p className="text-slate-500">Fuel/Conveyance reimbursement</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{summary.total_distance?.toFixed(1) || '0'} km</div>
          <div className="text-sm text-slate-500">Total distance this month</div>
        </div>
      </div>

      {/* Draft Trips Banner - Submit to HR */}
      {draftTrips.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <span className="font-semibold">Pending Submission</span>
              </div>
              <p className="text-sm text-amber-100">
                {draftTrips.length} trip(s) ready to submit • {draftTrips.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(1)} km total
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedDraftTrips(draftTrips.map(t => t.id));
                setShowSubmitWeekly(true);
              }}
              className="px-4 py-2 bg-white text-amber-600 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit to HR
            </button>
          </div>
        </div>
      )}

      {/* Active Trips Banner */}
      {activeTrips.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-5 h-5" />
            <span className="font-semibold">Trip In Progress</span>
          </div>
          {activeTrips.map(trip => (
            <div key={trip.id} className="bg-white/10 rounded-lg p-3 mb-2 last:mb-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{trip.from_location} → ...</div>
                  <div className="text-sm text-blue-100">
                    Started at {trip.start_km} km • {trip.purpose}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedActiveTrip(trip);
                    setEndTripData(prev => ({ ...prev, to_location: '' }));
                    setShowEndTrip(true);
                  }}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  End Trip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month/Year Filter */}
      <div className="flex gap-2">
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

      {/* Start Trip Button */}
      <button
        onClick={() => setShowStartTrip(true)}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
        data-testid="start-trip-btn"
      >
        <Play className="w-5 h-5" />
        Start New Trip
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
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="font-semibold text-slate-700">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-sm text-slate-500">
                  {dayTrips.length} trip{dayTrips.length > 1 ? 's' : ''} • {dayTrips.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(1)} km
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {dayTrips.map((trip) => (
                  <div key={trip.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
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

      {/* START TRIP Modal */}
      {showStartTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-600" />
                  {editingTrip ? 'Edit & Resubmit Trip' : 'Start Trip'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {editingTrip ? 'Update trip details and resubmit' : 'Quick entry - complete photos when you return'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowStartTrip(false);
                  setEditingTrip(null);
                  setStartTripData({
                    from_location: '',
                    vehicle_type: 'two_wheeler',
                    start_km: '',
                    purpose: 'Site Visit',
                    start_photo: null,
                  });
                  setEndTripData({
                    to_location: '',
                    end_km: '',
                    notes: '',
                    end_photo: null
                  });
                }} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingTrip?.rejection_reason && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-600 mt-1">{editingTrip.rejection_reason}</p>
              </div>
            )}

            <form onSubmit={editingTrip ? handleResubmitTrip : handleStartTrip} className="p-4 space-y-4">
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStartTripData({ ...startTripData, vehicle_type: 'two_wheeler' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      startTripData.vehicle_type === 'two_wheeler' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Bike className={`w-8 h-8 ${startTripData.vehicle_type === 'two_wheeler' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-medium">Two Wheeler</span>
                    <span className="text-xs text-slate-500">₹{rates.two_wheeler_rate}/km</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTripData({ ...startTripData, vehicle_type: 'four_wheeler' })}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      startTripData.vehicle_type === 'four_wheeler' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Car className={`w-8 h-8 ${startTripData.vehicle_type === 'four_wheeler' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="font-medium">Four Wheeler</span>
                    <span className="text-xs text-slate-500">₹{rates.four_wheeler_rate}/km</span>
                  </button>
                </div>
              </div>

              {/* From Location with Office Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">From</label>
                  <OfficeButton 
                    onClick={() => setStartTripData({ ...startTripData, from_location: OFFICE_ADDRESS })}
                    isSelected={startTripData.from_location === OFFICE_ADDRESS}
                  />
                </div>
                <input
                  type="text"
                  value={startTripData.from_location}
                  onChange={(e) => setStartTripData({ ...startTripData, from_location: e.target.value })}
                  placeholder="e.g., Office, Client Site"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start Odometer Photo with OCR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Odometer Photo</label>
                <input type="file" ref={startPhotoRef} accept="image/*" capture="environment" onChange={handleStartPhotoChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => startPhotoRef.current?.click()}
                  disabled={ocrLoading.start}
                  className={`w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-colors ${
                    startTripData.start_photo ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                  } ${ocrLoading.start ? 'opacity-50' : ''}`}
                >
                  {ocrLoading.start ? (
                    <>
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-600">Reading odometer...</span>
                    </>
                  ) : startTripData.start_photo ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div className="text-left">
                        <span className="text-sm font-medium text-green-700">Photo captured</span>
                        <span className="text-xs text-green-600 block">{startTripData.start_photo.name?.slice(0,25) || 'Photo attached'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-slate-400" />
                      <div className="text-left">
                        <span className="text-sm font-medium text-slate-700">Capture Start Odometer</span>
                        <span className="text-xs text-slate-500 block">OCR will auto-detect reading</span>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Start KM */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Odometer (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={startTripData.start_km}
                  onChange={(e) => setStartTripData({ ...startTripData, start_km: e.target.value })}
                  placeholder="e.g., 45230"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {startTripData.start_photo && startTripData.start_km && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Scan className="w-3 h-3" /> Auto-detected from photo
                  </p>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <select
                  value={startTripData.purpose}
                  onChange={(e) => setStartTripData({ ...startTripData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {purposeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* If editing rejected trip, show end trip fields too */}
              {editingTrip && (
                <>
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Trip End Details</h3>
                  </div>

                  {/* To Location with Office Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">To</label>
                      <OfficeButton 
                        onClick={() => setEndTripData({ ...endTripData, to_location: OFFICE_ADDRESS })}
                        isSelected={endTripData.to_location === OFFICE_ADDRESS}
                      />
                    </div>
                    <input
                      type="text"
                      value={endTripData.to_location}
                      onChange={(e) => setEndTripData({ ...endTripData, to_location: e.target.value })}
                      placeholder="e.g., Office, Client Site"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* End KM */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Odometer (KM)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={endTripData.end_km}
                      onChange={(e) => setEndTripData({ ...endTripData, end_km: e.target.value })}
                      placeholder="e.g., 45265"
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Photos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Photo</label>
                      <input type="file" ref={startPhotoRef} accept="image/*" onChange={handleStartPhotoChange} className="hidden" />
                      <button
                        type="button"
                        onClick={() => startPhotoRef.current?.click()}
                        className={`w-full p-3 border-2 border-dashed rounded-xl flex flex-col items-center gap-1 ${
                          endTripData.start_photo ? 'border-green-500 bg-green-50' : 'border-slate-200'
                        }`}
                      >
                        <Camera className={`w-5 h-5 ${endTripData.start_photo ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{endTripData.start_photo ? '✓ Attached' : 'Optional'}</span>
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Photo</label>
                      <input type="file" ref={endPhotoRef} accept="image/*" onChange={handleEndPhotoChange} className="hidden" />
                      <button
                        type="button"
                        onClick={() => endPhotoRef.current?.click()}
                        className={`w-full p-3 border-2 border-dashed rounded-xl flex flex-col items-center gap-1 ${
                          endTripData.end_photo ? 'border-green-500 bg-green-50' : 'border-slate-200'
                        }`}
                      >
                        <Camera className={`w-5 h-5 ${endTripData.end_photo ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{endTripData.end_photo ? '✓ Attached' : 'Optional'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                    <textarea
                      value={endTripData.notes}
                      onChange={(e) => setEndTripData({ ...endTripData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  editingTrip 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {editingTrip ? <Send className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {editingTrip ? 'Resubmit for Approval' : 'Start Trip'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* END TRIP Modal */}
      {showEndTrip && selectedActiveTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Square className="w-5 h-5 text-red-600" />
                  Complete Trip
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add destination, end reading & photos
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowEndTrip(false);
                  setSelectedActiveTrip(null);
                  setEndTripData({
                    to_location: '',
                    end_km: '',
                    notes: '',
                    end_photo: null
                  });
                }} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trip Summary */}
            <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <div className={`p-1.5 rounded-full ${selectedActiveTrip.vehicle_type === 'two_wheeler' ? 'bg-blue-200' : 'bg-purple-200'}`}>
                  {selectedActiveTrip.vehicle_type === 'two_wheeler' ? 
                    <Bike className="w-4 h-4 text-blue-700" /> : 
                    <Car className="w-4 h-4 text-purple-700" />
                  }
                </div>
                <div>
                  <div className="font-medium">{selectedActiveTrip.from_location} → ?</div>
                  <div className="text-xs text-blue-600">Started at {selectedActiveTrip.start_km} km • {selectedActiveTrip.purpose}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleEndTrip} className="p-4 space-y-4">
              {/* To Location with Office Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Destination (To)</label>
                  <OfficeButton 
                    onClick={() => setEndTripData({ ...endTripData, to_location: OFFICE_ADDRESS })}
                    isSelected={endTripData.to_location === OFFICE_ADDRESS}
                  />
                </div>
                <input
                  type="text"
                  value={endTripData.to_location}
                  onChange={(e) => setEndTripData({ ...endTripData, to_location: e.target.value })}
                  placeholder="e.g., Client Site, Office"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End KM */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Odometer (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={endTripData.end_km}
                  onChange={(e) => setEndTripData({ ...endTripData, end_km: e.target.value })}
                  placeholder="e.g., 45265"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {endTripData.end_photo && endTripData.end_km && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Scan className="w-3 h-3" /> Auto-detected from photo
                  </p>
                )}
              </div>

              {/* Calculated Distance & Allowance */}
              {endTripData.end_km && (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Distance</div>
                    <div className="text-xl font-bold text-slate-900">{calculateDistance().toFixed(1)} km</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Allowance</div>
                    <div className="text-xl font-bold text-emerald-600">₹{calculateAllowance()}</div>
                  </div>
                </div>
              )}

              {/* End Odometer Photo with OCR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Odometer Photo</label>
                <input type="file" ref={endPhotoRef} accept="image/*" capture="environment" onChange={handleEndPhotoChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => endPhotoRef.current?.click()}
                  disabled={ocrLoading.end}
                  className={`w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-colors ${
                    endTripData.end_photo ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                  } ${ocrLoading.end ? 'opacity-50' : ''}`}
                >
                  {ocrLoading.end ? (
                    <>
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-600">Reading odometer...</span>
                    </>
                  ) : endTripData.end_photo ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div className="text-left">
                        <span className="text-sm font-medium text-green-700">Photo captured</span>
                        <span className="text-xs text-green-600 block">{endTripData.end_photo.name?.slice(0,25) || 'Photo attached'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-slate-400" />
                      <div className="text-left">
                        <span className="text-sm font-medium text-slate-700">Capture End Odometer</span>
                        <span className="text-xs text-slate-500 block">OCR will auto-detect reading</span>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={endTripData.notes}
                  onChange={(e) => setEndTripData({ ...endTripData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Complete & Submit Trip
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
