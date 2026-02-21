import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, Plus, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, IndianRupee, FileText, Loader2, Upload, Trash2,
  ChevronDown, ChevronRight, Eye, Download, X, Camera,
  Building2, MapPin, CreditCard, FileSpreadsheet, Send,
  Edit2, Save, Wallet, ArrowUpCircle, ArrowDownCircle, History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { employeeHubAPI } from '../../services/api';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BILL_TYPES = [
  'Travel - Bus/Auto/Cab',
  'Travel - Train/Flight',
  'Food & Refreshments',
  'Accommodation/Lodging',
  'Materials/Supplies',
  'Electrical Materials',
  'Plumbing Materials',
  'Painting Materials',
  'Tools & Equipment',
  'Courier/Delivery',
  'Communication/Phone',
  'Printing/Stationery',
  'Porter/Labour Charges',
  'Miscellaneous'
];

const PAYMENT_MODES = ['Cash', 'UPI/GPay', 'Paytm', 'Card', 'Bank Transfer', 'Other'];

const ExpenseClaims = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('current');
  const [sheets, setSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expandedSheet, setExpandedSheet] = useState(null);
  
  // Advance management state
  const [advanceBalance, setAdvanceBalance] = useState(null);
  const [showAdvanceRequestModal, setShowAdvanceRequestModal] = useState(false);
  const [showAdvanceHistoryModal, setShowAdvanceHistoryModal] = useState(false);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    purpose: '',
    project_name: '',
    remarks: ''
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [sheetForm, setSheetForm] = useState({
    month: currentMonth,
    year: currentYear,
    advance_received: 0,
    advance_received_date: '',
    previous_due: 0,
    remarks: ''
  });

  const [itemForm, setItemForm] = useState({
    date: new Date().toISOString().split('T')[0],
    project_name: '',
    bill_type: 'Travel - Bus/Auto/Cab',
    description: '',
    amount: '',
    place: '',
    mode: 'Cash',
    receipt_url: ''
  });

  const resetItemForm = () => {
    setItemForm({
      date: new Date().toISOString().split('T')[0],
      project_name: '',
      bill_type: 'Travel - Bus/Auto/Cab',
      description: '',
      amount: '',
      place: '',
      mode: 'Cash',
      receipt_url: ''
    });
    setEditingItemIndex(null);
  };

  const fetchSheets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/employee/expense-sheets?user_id=${user.id}`);
      setSheets(res.data.sheets || []);
      
      const current = res.data.sheets?.find(
        s => s.month === currentMonth && s.year === currentYear
      );
      setCurrentSheet(current || null);
      
      const summaryRes = await api.get(`/employee/expense-sheets/summary/${user.id}?year=${currentYear}`);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching expense sheets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, currentYear]);

  const fetchAdvanceBalance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/employee/advance-balance/${user.id}`);
      setAdvanceBalance(res.data);
    } catch (error) {
      console.error('Error fetching advance balance:', error);
    }
  }, [user]);

  const fetchAdvanceRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/employee/advance-requests?user_id=${user.id}`);
      setAdvanceRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching advance requests:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSheets();
    fetchAdvanceBalance();
    fetchAdvanceRequests();
  }, [fetchSheets, fetchAdvanceBalance, fetchAdvanceRequests]);

  const handleRequestAdvance = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(
        `/employee/advance-requests?user_id=${user.id}&user_name=${encodeURIComponent(user.name || 'User')}&department=${encodeURIComponent(user.department || 'Unknown')}&emp_id=${user.emp_id || user.id}`,
        advanceForm
      );
      toast.success('Advance request submitted to Finance');
      setShowAdvanceRequestModal(false);
      setAdvanceForm({ amount: '', purpose: '', project_name: '', remarks: '' });
      fetchAdvanceRequests();
      fetchAdvanceBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit advance request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawAdvanceRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to withdraw this advance request?')) return;
    try {
      await api.delete(`/employee/advance-requests/${requestId}?user_id=${user.id}`);
      toast.success('Advance request withdrawn');
      fetchAdvanceRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to withdraw request');
    }
  };

  const handleCreateSheet = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(
        `/employee/expense-sheets?user_id=${user.id}&user_name=${encodeURIComponent(user.name || 'User')}&department=${encodeURIComponent(user.department || 'Unknown')}&emp_id=${user.emp_id || user.id}&designation=${encodeURIComponent(user.designation || 'Employee')}`,
        { ...sheetForm, items: [] }
      );
      toast.success('Expense sheet created successfully');
      setShowSheetModal(false);
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create expense sheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOrEditItem = async (e) => {
    e.preventDefault();
    if (!currentSheet) {
      toast.error('Please create an expense sheet first');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (editingItemIndex !== null) {
        // Update existing item - need to update the whole sheet
        const updatedItems = [...currentSheet.items];
        updatedItems[editingItemIndex] = {
          ...itemForm,
          amount: parseFloat(itemForm.amount)
        };
        
        await api.put(`/employee/expense-sheets/${currentSheet.id}`, {
          month: currentSheet.month,
          year: currentSheet.year,
          items: updatedItems,
          advance_received: currentSheet.advance_received,
          advance_received_date: currentSheet.advance_received_date,
          previous_due: currentSheet.previous_due,
          remarks: currentSheet.remarks
        });
        toast.success('Expense item updated');
      } else {
        // Add new item
        await api.post(
          `/employee/expense-sheets/${currentSheet.id}/add-item?user_id=${user.id}`,
          { ...itemForm, amount: parseFloat(itemForm.amount) }
        );
        toast.success('Expense item added');
      }
      
      setShowAddItemModal(false);
      resetItemForm();
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save expense item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (item, index) => {
    setItemForm({
      date: item.date,
      project_name: item.project_name || '',
      bill_type: item.bill_type || 'Travel - Bus/Auto/Cab',
      description: item.description || '',
      amount: item.amount?.toString() || '',
      place: item.place || '',
      mode: item.mode || 'Cash',
      receipt_url: item.receipt_url || ''
    });
    setEditingItemIndex(index);
    setShowAddItemModal(true);
  };

  const handleViewItem = (item) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const handleDeleteItem = async (sheetId, itemIndex) => {
    if (!window.confirm('Are you sure you want to delete this expense item?')) return;
    
    try {
      await api.delete(`/employee/expense-sheets/${sheetId}/item/${itemIndex}?user_id=${user.id}`);
      toast.success('Item deleted');
      fetchSheets();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleSubmitForApproval = async () => {
    if (!currentSheet) return;
    
    if (currentSheet.items?.length === 0) {
      toast.error('Please add at least one expense item before submitting');
      return;
    }
    
    if (!window.confirm('Are you sure you want to submit this expense sheet for approval? You won\'t be able to edit it after submission.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      await api.put(`/employee/expense-sheets/${currentSheet.id}/submit?user_id=${user.id}`);
      toast.success('Expense sheet submitted for approval');
      fetchSheets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit expense sheet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    try {
      setUploadingReceipt(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'expense_receipts');
      
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Backend returns url in file_url or url field
      const uploadedUrl = res.data.file_url || res.data.url || res.data.path;
      if (uploadedUrl) {
        setItemForm(prev => ({ ...prev, receipt_url: uploadedUrl }));
        toast.success('Receipt uploaded successfully');
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: FileText, label: 'Draft' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Pending Approval' },
      verified: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Eye, label: 'Verified' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: IndianRupee, label: 'Paid' }
    };
    return badges[status] || badges.draft;
  };

  const canEdit = (sheet) => {
    return sheet?.status === 'draft' || sheet?.status === 'rejected';
  };

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="expense-claims">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expense Claims</h1>
          <p className="text-slate-500 mt-1">Submit monthly project expenses for reimbursement</p>
        </div>
        {!currentSheet && (
          <button
            onClick={() => setShowSheetModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            data-testid="create-sheet-btn"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Create {monthNames[currentMonth]} Sheet
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Claimed ({currentYear})</p>
              <p className="text-xl font-bold text-slate-800">₹{(summary?.total_claimed || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Paid</p>
              <p className="text-xl font-bold text-green-600">₹{(summary?.total_paid || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Approval</p>
              <p className="text-xl font-bold text-amber-600">₹{(summary?.total_pending || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${summary?.balance_due > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary?.balance_due > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <Receipt className={summary?.balance_due > 0 ? 'text-red-600' : 'text-slate-400'} size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance Due</p>
              <p className={`text-xl font-bold ${summary?.balance_due > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                ₹{(summary?.balance_due || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {[
            { id: 'current', label: `Current (${monthNames[currentMonth]})`, icon: FileSpreadsheet },
            { id: 'history', label: 'All Sheets', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Current Month Sheet */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          {currentSheet ? (
            <>
              {/* Sheet Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {currentSheet.month_name} {currentSheet.year} Expense Sheet
                    </h2>
                    <p className="text-sm text-slate-500">Sheet No: {currentSheet.sheet_no}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const badge = getStatusBadge(currentSheet.status);
                      return (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                          <badge.icon className="w-4 h-4" />
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500">Total Expenses</p>
                    <p className="font-semibold text-slate-800">₹{(currentSheet.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Advance Received</p>
                    <p className="font-semibold text-green-600">₹{(currentSheet.advance_received || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Previous Due</p>
                    <p className="font-semibold text-amber-600">₹{(currentSheet.previous_due || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Net Claim Amount</p>
                    <p className={`font-bold text-lg ${currentSheet.net_claim_amount >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                      ₹{(currentSheet.net_claim_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Items</p>
                    <p className="font-semibold text-slate-800">{currentSheet.item_count || 0}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-slate-500">
                    {canEdit(currentSheet) ? (
                      <span className="text-green-600">✓ You can add/edit expenses</span>
                    ) : (
                      <span className="text-amber-600">⚠ Sheet is {currentSheet.status} - cannot edit</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canEdit(currentSheet) && (
                      <>
                        <button
                          onClick={() => { resetItemForm(); setShowAddItemModal(true); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                          data-testid="add-expense-item-btn"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </button>
                        <button
                          onClick={handleSubmitForApproval}
                          disabled={submitting || currentSheet.items?.length === 0}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="submit-for-approval-btn"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit for Approval
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Expense Items Table */}
              {currentSheet.items && currentSheet.items.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">S.No</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project/Customer</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bill Type</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Place</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">Receipt</th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentSheet.items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50" data-testid={`expense-item-${index}`}>
                            <td className="px-3 py-3 text-sm text-slate-600">{index + 1}</td>
                            <td className="px-3 py-3 text-sm text-slate-800">
                              {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-sm font-medium text-slate-800">{item.project_name || '-'}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                {item.bill_type}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-600 max-w-[150px] truncate" title={item.description}>
                              {item.description || '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-600">{item.place || '-'}</td>
                            <td className="px-3 py-3 text-sm font-semibold text-slate-800 text-right">
                              ₹{(item.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {item.receipt_url ? (
                                <a
                                  href={item.receipt_url.startsWith('http') ? item.receipt_url : `${API_URL}${item.receipt_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                  title="View Receipt"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleViewItem(item)}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEdit(currentSheet) && (
                                  <>
                                    <button
                                      onClick={() => handleEditItem(item, index)}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(currentSheet.id, index)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={6} className="px-3 py-3 text-right text-sm font-semibold text-slate-700">
                            Total:
                          </td>
                          <td className="px-3 py-3 text-right text-lg font-bold text-blue-600">
                            ₹{(currentSheet.total_amount || 0).toLocaleString()}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No expense items added yet</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Add Item" to start adding your expenses</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No expense sheet for {monthNames[currentMonth]} {currentYear}</p>
              <p className="text-sm text-slate-400 mt-1">Create a new expense sheet to start adding your expenses</p>
              <button
                onClick={() => setShowSheetModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Expense Sheet
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Sheets History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {sheets.length > 0 ? (
            sheets.map(sheet => (
              <div key={sheet.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
                >
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="w-5 h-5 text-slate-400" />
                    <div>
                      <h3 className="font-medium text-slate-800">{sheet.month_name} {sheet.year}</h3>
                      <p className="text-xs text-slate-500">Sheet No: {sheet.sheet_no} • {sheet.item_count} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Net Claim</p>
                      <p className="font-semibold text-slate-800">₹{(sheet.net_claim_amount || 0).toLocaleString()}</p>
                    </div>
                    {(() => {
                      const badge = getStatusBadge(sheet.status);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          <badge.icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      );
                    })()}
                    {expandedSheet === sheet.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
                
                {expandedSheet === sheet.id && sheet.items && sheet.items.length > 0 && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div><p className="text-xs text-slate-500">Total Expenses</p><p className="font-semibold">₹{(sheet.total_amount || 0).toLocaleString()}</p></div>
                      <div><p className="text-xs text-slate-500">Advance</p><p className="font-semibold text-green-600">₹{(sheet.advance_received || 0).toLocaleString()}</p></div>
                      <div><p className="text-xs text-slate-500">Previous Due</p><p className="font-semibold text-amber-600">₹{(sheet.previous_due || 0).toLocaleString()}</p></div>
                      <div><p className="text-xs text-slate-500">Submitted</p><p className="font-semibold">{new Date(sheet.submitted_at).toLocaleDateString('en-IN')}</p></div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs text-slate-500">Date</th>
                            <th className="px-2 py-2 text-left text-xs text-slate-500">Project</th>
                            <th className="px-2 py-2 text-left text-xs text-slate-500">Type</th>
                            <th className="px-2 py-2 text-left text-xs text-slate-500">Description</th>
                            <th className="px-2 py-2 text-right text-xs text-slate-500">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.items.map((item, idx) => (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="px-2 py-2">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                              <td className="px-2 py-2">{item.project_name || '-'}</td>
                              <td className="px-2 py-2">{item.bill_type}</td>
                              <td className="px-2 py-2 truncate max-w-[150px]">{item.description}</td>
                              <td className="px-2 py-2 text-right font-medium">₹{item.amount?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No expense sheets found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Sheet Modal */}
      {showSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create Expense Sheet</h3>
              <button onClick={() => setShowSheetModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateSheet} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month *</label>
                  <select value={sheetForm.month} onChange={(e) => setSheetForm({ ...sheetForm, month: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" required>
                    {monthNames.slice(1).map((name, idx) => (<option key={idx + 1} value={idx + 1}>{name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                  <select value={sheetForm.year} onChange={(e) => setSheetForm({ ...sheetForm, year: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" required>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Advance Received (₹)</label>
                <input type="number" value={sheetForm.advance_received} onChange={(e) => setSheetForm({ ...sheetForm, advance_received: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="0" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Advance Received Date</label>
                <input type="date" value={sheetForm.advance_received_date} onChange={(e) => setSheetForm({ ...sheetForm, advance_received_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Previous Due (₹)</label>
                <input type="number" value={sheetForm.previous_due} onChange={(e) => setSheetForm({ ...sheetForm, previous_due: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="Carry forward from previous month" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea value={sheetForm.remarks} onChange={(e) => setSheetForm({ ...sheetForm, remarks: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={2} placeholder="Any additional notes" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowSheetModal(false)} className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Creating...' : 'Create Sheet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">{editingItemIndex !== null ? 'Edit' : 'Add'} Expense Item</h3>
              <button onClick={() => { setShowAddItemModal(false); resetItemForm(); }} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddOrEditItem} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" value={itemForm.date} onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input type="number" value={itemForm.amount} onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="0.00" min="1" step="0.01" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project/Customer Name *</label>
                <input type="text" value={itemForm.project_name} onChange={(e) => setItemForm({ ...itemForm, project_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Indospace Polivakkam, Philips Taramani" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bill Type *</label>
                <select value={itemForm.bill_type} onChange={(e) => setItemForm({ ...itemForm, bill_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" required>
                  {BILL_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <input type="text" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Paint, Thinner, Bus fare to site" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Place</label>
                  <input type="text" value={itemForm.place} onChange={(e) => setItemForm({ ...itemForm, place: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="e.g., Chennai" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select value={itemForm.mode} onChange={(e) => setItemForm({ ...itemForm, mode: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                    {PAYMENT_MODES.map(mode => (<option key={mode} value={mode}>{mode}</option>))}
                  </select>
                </div>
              </div>
              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt/Bill Photo</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                  {itemForm.receipt_url ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-700">Receipt uploaded</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={itemForm.receipt_url.startsWith('http') ? itemForm.receipt_url : `${API_URL}${itemForm.receipt_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></a>
                        <button type="button" onClick={() => setItemForm({ ...itemForm, receipt_url: '' })} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer">
                      {uploadingReceipt ? (
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-500">Click to upload receipt photo</span>
                          <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF (Max 5MB)</span>
                        </>
                      )}
                      <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" disabled={uploadingReceipt} />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddItemModal(false); resetItemForm(); }} className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting || uploadingReceipt} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : (editingItemIndex !== null ? 'Update Item' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Expense Details</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500">Date</p><p className="font-medium">{new Date(viewingItem.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                <div><p className="text-xs text-slate-500">Amount</p><p className="font-bold text-blue-600 text-lg">₹{viewingItem.amount?.toLocaleString()}</p></div>
              </div>
              <div><p className="text-xs text-slate-500">Project/Customer</p><p className="font-medium">{viewingItem.project_name || '-'}</p></div>
              <div><p className="text-xs text-slate-500">Bill Type</p><p className="font-medium">{viewingItem.bill_type}</p></div>
              <div><p className="text-xs text-slate-500">Description</p><p className="font-medium">{viewingItem.description || '-'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500">Place</p><p className="font-medium">{viewingItem.place || '-'}</p></div>
                <div><p className="text-xs text-slate-500">Payment Mode</p><p className="font-medium">{viewingItem.mode || '-'}</p></div>
              </div>
              {viewingItem.receipt_url && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Receipt</p>
                  <a href={viewingItem.receipt_url.startsWith('http') ? viewingItem.receipt_url : `${API_URL}${viewingItem.receipt_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                    <Eye className="w-4 h-4" /> View Receipt
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-2">📋 How Expense Claims Work</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Create Sheet:</strong> Create a monthly expense sheet</li>
            <li><strong>Add Items:</strong> Add each expense with project name, bill type, amount, and receipt</li>
            <li><strong>Review:</strong> View, edit, or delete items before submitting</li>
            <li><strong>Submit:</strong> Click "Submit for Approval" to send to Finance</li>
            <li><strong>Approval:</strong> Finance dept. verifies and processes payment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaims;
