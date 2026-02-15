import React, { useState, useEffect } from 'react';
import { 
  FileText, Save, RotateCcw, Upload, Eye, Palette, Building2, 
  FileImage, ChevronDown, ChevronRight, Loader2, Check,
  Image, Type, Phone, Mail, Globe, Hash, ExternalLink,
  Layers, Paintbrush
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Report type labels
const REPORT_TYPE_LABELS = {
  'amc': 'AMC Reports',
  'calibration': 'Calibration Reports',
  'wcc': 'Work Completion Certificate',
  'equipment_test': 'Equipment Test Reports',
  'ir_thermography': 'IR Thermography Reports',
  'service': 'Service Reports',
  'project_completion': 'Project Completion Reports',
  'project_schedule': 'Project Schedule Reports'
};

// Reports that have cover pages (front and back)
const REPORTS_WITH_COVER_PAGES = ['amc', 'calibration', 'ir_thermography', 'project_completion', 'project_schedule'];

// Reports that only have header/footer
const REPORTS_HEADER_FOOTER_ONLY = ['wcc', 'equipment_test', 'service'];

// Design options
const DESIGN_OPTIONS = {
  'design_1': { name: 'Flowing Waves', description: 'Elegant flowing curves at corners' },
  'design_2': { name: 'Geometric Arcs', description: 'Bold geometric arc patterns' },
  'design_3': { name: 'Diagonal Stripes', description: 'Dynamic diagonal stripe accents' },
  'design_4': { name: 'Corner Brackets', description: 'Modern corner bracket frames' },
  'design_5': { name: 'Circular Dots', description: 'Minimalist circular dot pattern' },
  'design_6': { name: 'Multi-Color Waves', description: 'Elegant flowing waves in teal, blue, and green' }
};

// Default colors for each report type
const DEFAULT_COLORS = {
  'amc': '#F7931E',
  'calibration': '#2563eb',
  'wcc': '#22c55e',
  'equipment_test': '#8b5cf6',
  'ir_thermography': '#ef4444',
  'service': '#f59e0b',
  'project_completion': '#06b6d4',
  'project_schedule': '#0d9488'
};

const PDFTemplateSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('global');
  const [selectedReportType, setSelectedReportType] = useState('amc');
  const [expandedSections, setExpandedSections] = useState({
    branding: true,
    company: false,
    cover: false,
    back: false,
    headerFooter: false
  });
  const [previewReportType, setPreviewReportType] = useState('amc');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/pdf-template/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to load PDF template settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/pdf-template/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('PDF template settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all PDF template settings to defaults?')) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/pdf-template/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        toast.success('Settings reset to defaults');
      } else {
        toast.error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Error resetting settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/pdf-template/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          branding: { ...prev.branding, logo_url: data.logo_url }
        }));
        toast.success('Logo uploaded successfully');
      } else {
        toast.error('Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error uploading logo');
    }
  };

  const updateSettings = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateReportDesign = (reportType, field, value) => {
    setSettings(prev => ({
      ...prev,
      report_designs: {
        ...prev.report_designs,
        [reportType]: {
          ...prev.report_designs?.[reportType],
          [field]: value
        }
      }
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPreviewUrl = (reportType = previewReportType) => {
    return `${API}/api/pdf-template/preview?page_type=cover&report_type=${reportType}&t=${Date.now()}`;
  };

  const getLogoDisplayUrl = () => {
    const logoUrl = settings?.branding?.logo_url;
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http')) return logoUrl;
    return `${API}${logoUrl}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pdf-template-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PDF Template Settings</h1>
          <p className="text-slate-500 mt-1">Configure branding, company info, and cover page designs for all PDF reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            data-testid="save-pdf-settings-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'global'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Global Settings
          </div>
        </button>
        <button
          onClick={() => setActiveTab('designs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'designs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Cover Page Designs
          </div>
        </button>
      </div>

      {activeTab === 'global' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="space-y-4">
            {/* Branding & Logo */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('branding')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Palette className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Branding & Logo</h3>
                    <p className="text-sm text-slate-500">Company logo and accent colors</p>
                  </div>
                </div>
                {expandedSections.branding ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              
              {expandedSections.branding && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                      {getLogoDisplayUrl() ? (
                        <img 
                          src={getLogoDisplayUrl()}
                          alt="Logo" 
                          className="h-16 max-w-[200px] object-contain border border-slate-200 rounded-lg p-2 bg-white"
                        />
                      ) : (
                        <div className="h-16 w-32 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Image className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">This logo will appear on cover pages, headers, and back covers of all PDF reports.</p>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings?.branding?.primary_color || '#F7931E'}
                        onChange={(e) => updateSettings('branding', 'primary_color', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={settings?.branding?.primary_color || '#F7931E'}
                        onChange={(e) => updateSettings('branding', 'primary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Used for accent lines, footer highlights</p>
                  </div>
                </div>
              )}
            </div>

            {/* Company Information */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('company')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Company Information</h3>
                    <p className="text-sm text-slate-500">Name, address, contact details</p>
                  </div>
                </div>
                {expandedSections.company ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              
              {expandedSections.company && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={settings?.company_info?.company_name || ''}
                        onChange={(e) => updateSettings('company_info', 'company_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
                      <input
                        type="text"
                        value={settings?.company_info?.tagline || ''}
                        onChange={(e) => updateSettings('company_info', 'tagline', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={settings?.company_info?.address_line1 || ''}
                        onChange={(e) => updateSettings('company_info', 'address_line1', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={settings?.company_info?.address_line2 || ''}
                        onChange={(e) => updateSettings('company_info', 'address_line2', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={settings?.company_info?.city || ''}
                        onChange={(e) => updateSettings('company_info', 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={settings?.company_info?.state || ''}
                        onChange={(e) => updateSettings('company_info', 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={settings?.company_info?.postal_code || ''}
                        onChange={(e) => updateSettings('company_info', 'postal_code', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={settings?.company_info?.country || ''}
                        onChange={(e) => updateSettings('company_info', 'country', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Phone className="w-4 h-4 inline mr-1" />Phone
                      </label>
                      <input
                        type="text"
                        value={settings?.company_info?.phone || ''}
                        onChange={(e) => updateSettings('company_info', 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Alt Phone</label>
                      <input
                        type="text"
                        value={settings?.company_info?.alt_phone || ''}
                        onChange={(e) => updateSettings('company_info', 'alt_phone', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Mail className="w-4 h-4 inline mr-1" />Email
                      </label>
                      <input
                        type="email"
                        value={settings?.company_info?.email || ''}
                        onChange={(e) => updateSettings('company_info', 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Globe className="w-4 h-4 inline mr-1" />Website
                      </label>
                      <input
                        type="text"
                        value={settings?.company_info?.website || ''}
                        onChange={(e) => updateSettings('company_info', 'website', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Hash className="w-4 h-4 inline mr-1" />GST Number
                      </label>
                      <input
                        type="text"
                        value={settings?.company_info?.gst_number || ''}
                        onChange={(e) => updateSettings('company_info', 'gst_number', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cover Page Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('cover')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileImage className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Cover Page Options</h3>
                    <p className="text-sm text-slate-500">Common settings for all cover pages</p>
                  </div>
                </div>
                {expandedSections.cover ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              
              {expandedSections.cover && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between col-span-2">
                      <label className="text-sm text-slate-600">Show Logo on Cover</label>
                      <input
                        type="checkbox"
                        checked={settings?.cover_page?.show_logo ?? true}
                        onChange={(e) => updateSettings('cover_page', 'show_logo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <label className="text-sm text-slate-600">Show Decorative Design</label>
                      <input
                        type="checkbox"
                        checked={settings?.cover_page?.show_decorative_design ?? true}
                        onChange={(e) => updateSettings('cover_page', 'show_decorative_design', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <label className="text-sm text-slate-600">Show "Submitted By" Section</label>
                      <input
                        type="checkbox"
                        checked={settings?.cover_page?.show_submitted_by ?? true}
                        onChange={(e) => updateSettings('cover_page', 'show_submitted_by', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <label className="text-sm text-slate-600">Show Footer Line</label>
                      <input
                        type="checkbox"
                        checked={settings?.cover_page?.show_footer_line ?? true}
                        onChange={(e) => updateSettings('cover_page', 'show_footer_line', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">"Submitted By" Title</label>
                    <input
                      type="text"
                      value={settings?.cover_page?.submitted_by_title || 'Submitted By'}
                      onChange={(e) => updateSettings('cover_page', 'submitted_by_title', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Header & Footer Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('headerFooter')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <FileText className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Header & Footer</h3>
                    <p className="text-sm text-slate-500">Content page headers and footers</p>
                  </div>
                </div>
                {expandedSections.headerFooter ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              
              {expandedSections.headerFooter && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Show Header</label>
                      <input
                        type="checkbox"
                        checked={settings?.header_footer?.show_header ?? true}
                        onChange={(e) => updateSettings('header_footer', 'show_header', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Show Footer</label>
                      <input
                        type="checkbox"
                        checked={settings?.header_footer?.show_footer ?? true}
                        onChange={(e) => updateSettings('header_footer', 'show_footer', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Page Numbers</label>
                      <input
                        type="checkbox"
                        checked={settings?.header_footer?.show_page_numbers ?? true}
                        onChange={(e) => updateSettings('header_footer', 'show_page_numbers', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Header Logo</label>
                      <input
                        type="checkbox"
                        checked={settings?.header_footer?.show_header_logo ?? true}
                        onChange={(e) => updateSettings('header_footer', 'show_header_logo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back Cover Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('back')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Layers className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Back Cover (Contact Us)</h3>
                    <p className="text-sm text-slate-500">Last page with contact details</p>
                  </div>
                </div>
                {expandedSections.back ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              
              {expandedSections.back && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Enable Back Cover</label>
                    <input
                      type="checkbox"
                      checked={settings?.back_cover?.enabled ?? true}
                      onChange={(e) => updateSettings('back_cover', 'enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Page Title</label>
                    <input
                      type="text"
                      value={settings?.back_cover?.title || 'Contact Us'}
                      onChange={(e) => updateSettings('back_cover', 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </h3>
                <select
                  value={previewReportType}
                  onChange={(e) => setPreviewReportType(e.target.value)}
                  className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                >
                  {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-100 min-h-[500px]">
              <div className="mb-2 text-right">
                <a 
                  href={getPreviewUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 justify-end"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
              </div>
              <object
                key={`preview-${previewReportType}-${Date.now()}`}
                data={getPreviewUrl()}
                type="application/pdf"
                className="w-full h-[500px] border border-slate-300 rounded-lg bg-white"
              >
                <div className="flex items-center justify-center h-full">
                  <a href={getPreviewUrl()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Open Preview PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'designs' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <strong>Reports with Cover Pages:</strong> AMC, Calibration, IR Thermography, and Project Completion reports have front and back cover pages with decorative designs.
              <br />
              <strong>Header/Footer Only:</strong> WCC, Equipment Test, and Service reports only use header and footer styling.
            </p>
          </div>

          {/* Reports WITH Cover Pages */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Reports with Cover Pages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {REPORTS_WITH_COVER_PAGES.map((reportType) => {
                const label = REPORT_TYPE_LABELS[reportType];
                const design = settings?.report_designs?.[reportType] || {};
                const designId = design.design_id || 'design_1';
                const designColor = design.design_color || DEFAULT_COLORS[reportType];
                
                return (
                  <div key={reportType} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: designColor + '20' }}
                      >
                        <FileText className="w-5 h-5" style={{ color: designColor }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">{label}</h3>
                        <p className="text-xs text-slate-500">{DESIGN_OPTIONS[designId]?.name}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Design Style</label>
                        <select
                          value={designId}
                          onChange={(e) => updateReportDesign(reportType, 'design_id', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          {Object.entries(DESIGN_OPTIONS).map(([id, info]) => (
                            <option key={id} value={id}>{info.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Design Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={designColor}
                            onChange={(e) => updateReportDesign(reportType, 'design_color', e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border-0"
                          />
                          <input
                            type="text"
                            value={designColor}
                            onChange={(e) => updateReportDesign(reportType, 'design_color', e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <a
                        href={`${API}/api/pdf-template/preview?page_type=cover&report_type=${reportType}&t=${Date.now()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                      >
                        Preview Cover
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reports WITHOUT Cover Pages (Header/Footer Only) */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Reports with Header/Footer Only</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {REPORTS_HEADER_FOOTER_ONLY.map((reportType) => {
                const label = REPORT_TYPE_LABELS[reportType];
                
                return (
                  <div key={reportType} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-200">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{label}</h3>
                        <p className="text-xs text-slate-500">Uses header/footer settings only</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              These reports do not have cover pages. They use the Header & Footer settings configured in the Global Settings tab.
            </p>
          </div>

          {/* All Designs Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-4">Preview All Design Styles</h3>
            <p className="text-sm text-slate-500 mb-4">Click below to see all 6 design options in a single PDF:</p>
            <a
              href={`${API}/api/pdf-template/preview-designs?design_color=${settings?.branding?.primary_color || '#F7931E'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Eye className="w-4 h-4" />
              View All Design Options PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFTemplateSettings;
