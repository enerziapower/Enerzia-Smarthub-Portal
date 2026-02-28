# Workhub Enerzia ERP System - PRD

## Latest Updates

### Backend Route Protection (P0 Security Fix) ✅ COMPLETE (Feb 27, 2026)
**Critical Security Enhancement**

| Feature | Description |
|---------|-------------|
| **Permission Middleware** | Created `/app/backend/utils/permissions.py` with `require_permission` decorator |
| **Protected Routes** | Lead Management, User Access Control, Sales Enquiries, Sales Quotations |
| **Role-Based Bypass** | Super admin and admin roles can access all endpoints |
| **Clear Error Messages** | Returns 403 with message: "Access denied. Required permission: X, Y" |
| **Authentication Enforcement** | Returns 401 for unauthenticated or invalid tokens |

**Files Modified:**
- `/app/backend/utils/permissions.py` - NEW: Permission middleware with require_permission decorator
- `/app/backend/routes/lead_management.py` - All endpoints protected with sales_dept/lead_management
- `/app/backend/routes/user_access.py` - All endpoints protected with user_access_control/administration
- `/app/backend/routes/sales.py` - Enquiries and Quotations endpoints protected

**Test Results:** 100% success rate (21/21 tests passed) - See `/app/test_reports/iteration_78.json`

---

### Lead Management Customer Linking Fix ✅ COMPLETE (Feb 27, 2026)
**Location:** Sales → Lead Management → New Follow-up Form

| Feature | Description |
|---------|-------------|
| **Customer Search API** | Created `/api/lead-management/customers/search` endpoint to search existing customers |
| **Frontend Integration** | Updated `FollowUpForm.js` to use the new unified search endpoint |
| **Database Fix** | Changed backend from non-existent `db.domestic_customers`/`db.overseas_customers` to use actual `db.clients` collection |
| **Dropdown Display** | Shows customers with type indicator (🇮🇳 Domestic / 🌍 Overseas) |

**Files Modified:**
- `/app/backend/routes/lead_management.py` - Added customer search endpoint, fixed customer lookup to use `db.clients`
- `/app/frontend/src/pages/sales/FollowUpForm.js` - Updated to call new unified search API

---

## Original Problem Statement
Building a comprehensive ERP system for Enerzia Power Solutions (now "Workhub Enerzia"), an electrical services company. Key modules include:
1. Equipment Test Reports
2. AMC (Annual Maintenance Contract) management
3. IR Thermography reports
4. Calibration Services module
5. Work Planner with Pre-Project Tasks
6. **5-Hub Navigation System** (Company Hub, My Workspace, Departments, Management, Administration)
7. **Customer Portal** (Read-only for external customers)

## Target Users
- **Admin/Super Admin:** Full system access
- **Department Heads:** Manage department-specific tasks
- **Employees:** Self-service portal access
- **External Customers:** Read-only portal for AMC status, WCC, reports

## Core Requirements

### ✅ Completed Features

#### Rebranding to "Workhub Enerzia" ✅ COMPLETE (Feb 6, 2026)
**Location:** Throughout the application

| Feature | Description |
|---------|-------------|
| **Login Page** | Displays "Workhub Enerzia" with "Sign in to your workspace" |
| **Sidebar Branding** | Shows "Workhub" with "Enerzia" below logo |
| **HTML Title** | Changed to "Workhub Enerzia" |
| **PWA Manifest** | Updated name to "Workhub Enerzia", short_name to "Workhub" |
| **Meta Tags** | All meta descriptions updated to "Workhub Enerzia" |

#### 5-Hub Navigation Reorganization ✅ COMPLETE (Feb 6, 2026)
**Location:** Main sidebar navigation

| Hub | Contents |
|-----|----------|
| **Company Hub** | Dashboard, Domestic Customers, Overseas Customers, Vendors, Team Members, Customer Portal, Shared Reports, Weekly Meetings, Payment Requests |
| **My Workspace (Employee Hub)** | My Dashboard, My Attendance, Travel Log, Overtime Requests, Leave Management, Permission Requests, Expense Claims, Transport Requests, My Journey, My Reports, My Profile |
| **Departments** | 8 Sub-departments: Projects, Accounts, Sales, Purchase, Exports, Finance, HR & Admin, Operations (each with expandable sub-menus) |
| **Management** | Payment Approvals, Reports Center |
| **Administration** | Organization Settings, User Management, Announcements, Events Manager, Holiday Calendar, PDF Templates |

**Features:**
- Collapsible hub sections with visual indicators
- Auto-expansion based on current route
- Color-coded hub icons (blue, emerald, purple, amber, rose)
- Role-based visibility (Management/Administration hubs restricted by role)

#### Mobile Responsiveness ✅ COMPLETE (Feb 8, 2026)
**Location:** Main layout and sidebar (`Layout.js`)

| Feature | Description |
|---------|-------------|
| **Hamburger Menu** | Three-line menu icon appears on mobile (< 768px width) |
| **Slide-out Sidebar** | Sidebar slides in from left with smooth CSS transform animation |
| **Close Button** | X button in sidebar header to close on mobile |
| **Overlay Click** | Clicking outside (dark overlay) closes sidebar |
| **Auto-close on Nav** | Sidebar automatically closes when navigating on mobile |
| **Desktop Collapse** | Sidebar can collapse to icon-only mode (64px) on desktop |
| **Responsive Header** | Compact header on mobile with essential controls only |

**Technical Implementation:**
- Uses `useState` for `isMobile` and `sidebarOpen` state
- Window resize listener detects viewport changes
- CSS `translate-x-full` / `translate-x-0` for smooth animations
- `transition-all duration-300` for 300ms animation
- `.mobile-menu-btn` class for hamburger button targeting

#### Session Management Improvements ✅ COMPLETE (Feb 8, 2026)
**Location:** `AuthContext.js`, `api.js`

| Feature | Description |
|---------|-------------|
| **Token Expiration Check** | Client-side JWT expiration validation with 5-minute buffer |
| **Periodic Validation** | Token checked every 5 minutes via `setInterval` |
| **Cross-tab Logout** | `storage` event listener syncs logout across browser tabs |
| **401 Auto-redirect** | API interceptor automatically redirects to `/login` on 401 |
| **Graceful Degradation** | Only redirects if user had a token (prevents login page loops) |

**Technical Details:**
- `isTokenExpired()` decodes JWT payload to check `exp` claim
- `useCallback` for `checkAuth` to prevent infinite re-renders
- Cleanup functions remove event listeners and intervals on unmount

#### Calibration PDF Report Design Fix ✅ COMPLETE (Feb 5, 2026)
**Location:** Calibration Module → Generate Report PDF

| Feature | Description |
|---------|-------------|
| **Cover Page** | Exact clone of AMC: Orange decorative curves (top-right, bottom-left), centered info box, "Submitted By" section at bottom-right |
| **Cover Footer** | Orange line with "Enerzia Power Solutions" and "www.enerzia.com" |
| **Header (Page 2+)** | "CALIBRATION SERVICE CONTRACT REPORT" on left, logo on right, "REPORT No:" below title, orange accent line |
| **Footer (Page 2+)** | Orange line, company name, website, page number |
| **Table of Contents** | "CONTENTS" header (not "TABLE OF CONTENTS"), same column widths as AMC |
| **Back Cover** | "Contact Us" page WITHOUT header/footer (matches AMC) |
| **Endpoints** | Both `/api/calibration-report/{contract_id}/pdf` AND `/api/calibration-report/{contract_id}/report-pdf` now generate the AMC-style report |
| **Fix Applied** | OLD `/pdf` endpoint now redirects to use the comprehensive AMC-style report generator |

#### Customer Hub (Internal) ✅ COMPLETE (Feb 3, 2026)
**Location:** Main ERP sidebar → Customer Hub → Customers

| Page | Features |
|------|----------|
| **Customer Directory** | Stats (Total, Active Portal, With Linked Projects), Search, Filter by portal status, Customer list |
| **Add Customer** | Name, Company, Email, Phone, GST, Address fields |
| **Customer Profile** | Details tab, Linked Projects tab, Portal Access tab |
| **Project Linking** | Auto-Link by Company Name, Manual Link Projects, Unlink |
| **Portal Access** | Toggle portal access, Set/Reset password, View portal URL |

#### Customer Portal (External) ✅ COMPLETE (Feb 3, 2026)
**Location:** `/customer-portal/*` (Separate from main ERP)

| Page | Features |
|------|----------|
| **Login** | Email/Password auth, Registration |
| **Dashboard** | Stats (Projects, Ongoing, Completed, AMCs, WCC, Reports), Upcoming Visits, Quick Actions |
| **My Projects** | Project list with progress bars, Document counts per project |
| **AMC Contracts** | AMC list with search/filter, Contract details, Equipment list, Service history |
| **WCC** | Work Completion Certificates list with search |
| **Reports** | Test reports, IR Thermography, Calibration certificates |

#### Dashboard UI Fixes ✅ COMPLETE (Feb 3, 2026)
- Removed "Projects Requiring Attention" section
- Fixed "Category-wise Billing" chart (PSS, OSS, AS, CS)
- Fixed "Project Status Distribution" pie chart labels

#### Hub-Based Navigation ✅ COMPLETE
- Employee Hub (My Workspace)
- Company Hub (Central Functions)
- Customer Hub (Customer Management) - NEW
- Administration (Admin Panel)

#### Link Service Reports to AMC Visits ✅ COMPLETE (Feb 4, 2026)
**Location:** Projects → AMC Management → Edit AMC → Service Visits tab

| Feature | Description |
|---------|-------------|
| **Link Service Reports Button** | Green button in Service Visits tab for each visit |
| **Service Reports Modal** | Shows Service Reports (Electrical, HVAC, Fire Protection, etc.) with category filter buttons |
| **Category Filters** | All Categories, Electrical, HVAC Systems, Fire Protection Systems, CCTV Systems, Air Condition, Lighting, Diesel Generator, General Services |
| **Report Display** | Shows SRN number, service category badge, customer name, service date |
| **PDF Table** | Proper cell wrapping for long customer names |
| **PDF Annexure** | Service Report PDFs attached as "ANNEXURE - Service Reports" |
| **Data Source** | Fetches from `/api/customer-service` (service_requests collection) |

#### My Workspace Module ✅ COMPLETE (Feb 5, 2026)
**Location:** Employee Hub → My Workspace

**Employee Self-Service (My Workspace):**
| Page | Features |
|------|----------|
| **My Dashboard** | Personal dashboard with quick stats |
| **My Attendance** | View attendance records |
| **Overtime Requests** | Request overtime work |
| **Leave Management** | Apply for leave (Casual, Sick, Earned, Comp-Off), view leave balance, track status |
| **Permission Requests** | Request late coming, early leaving, or short leave |
| **Expense Claims** | Submit expense reimbursements with receipt uploads |
| **Transport Requests** | Request company vehicle or cab reimbursement |
| **My Journey** | View career milestones, promotions, awards, certifications |
| **My Reports** ✅ | View history of leave, permission, and expense requests with stats |
| **My Profile** ✅ | View/edit personal information, change password, upload profile photo |

**Approval Workflows:**
| Request Type | Approval Page | Approver |
|--------------|---------------|----------|
| Leave Requests | `/hr/leave-approvals` | HR Department |
| Expense Claims | `/finance/expense-approvals` | Finance Department |
| Permission Requests | `/hr/permission-approvals` | HR/Manager |

**Features:**
- Status tracking (Pending, Approved, Rejected)
- Search and filter functionality
- Employee name, department, and request details display
- One-click Approve/Reject buttons
- Real-time status updates
- My Reports: Summary stats (Leave Taken, Permissions, Expenses Claimed, Pending)
- My Profile: Edit personal info, change password, profile photo upload

#### PDF Template Settings ✅ COMPLETE (Feb 6, 2026)
**Location:** Admin Panel → PDF Templates (/admin/pdf-templates)

**Two Tabs:**
1. **Global Settings** - Apply to ALL report types
2. **Cover Page Designs** - Per-report-type design selection

**Global Settings (Same for All):**
| Section | Configurable Options |
|---------|---------------------|
| **Branding & Logo** | Logo upload, Primary accent color |
| **Company Information** | Company name, Tagline, Address, Phone, Email, Website, GST Number |
| **Cover Page Options** | Show logo, Show decorative design, Show "Submitted By", Footer line |
| **Header & Footer** | Show header/footer, Page numbers, Logo in header |
| **Back Cover** | Enable/disable, Title, Contact info visibility |

**Cover Page Designs (4 Report Types with Cover Pages):**
| Report Type | Default Design | Default Color |
|-------------|----------------|---------------|
| AMC Reports | Flowing Waves | Orange (#F7931E) |
| Calibration Reports | Geometric Arcs | Blue (#2563eb) |
| IR Thermography Reports | Diagonal Stripes | Red (#ef4444) |
| Project Completion Reports | Corner Brackets | Cyan (#06b6d4) |

**Reports with Header/Footer Only (No Cover Pages):**
- Work Completion Certificate (WCC)
- Equipment Test Reports
- Service Reports

**5 Decorative Design Options:**
1. **Flowing Waves** - Elegant flowing curves at corners
2. **Geometric Arcs** - Bold geometric arc patterns  
3. **Diagonal Stripes** - Dynamic diagonal stripe accents
4. **Corner Brackets** - Modern corner bracket frames
5. **Circular Dots** - Minimalist circular dot pattern

**API Endpoints:**
- `GET /api/pdf-template/settings` - Fetch current settings
- `PUT /api/pdf-template/settings` - Update all settings
- `PUT /api/pdf-template/report-design/{report_type}` - Update single report design
- `GET /api/pdf-template/designs` - Get available design options
- `POST /api/pdf-template/upload-logo` - Upload company logo
- `GET /api/pdf-template/preview?report_type=amc` - Preview specific report type
- `GET /api/pdf-template/preview-designs` - Preview all 5 designs
- `POST /api/pdf-template/reset` - Reset to defaults

**Integration Status:** ✅ COMPLETE
- AMC PDF (`amc_pdf.py`) - Fully integrated
- Calibration PDF (`calibration_pdf.py`) - Fully integrated

#### AMC PDF & UI Bug Fixes ✅ COMPLETE (Feb 6, 2026)

**PDF Bug Fixes:**
| Issue | Fix Applied |
|-------|-------------|
| **Customer name missing** | Cover page & executive summary now use `customer_info` from AMC with fallback to project data |
| **Text wrapping in cells** | Added Paragraph objects with `wordWrap='CJK'` and `splitLongWords=True` to Customer Info (page 3), Service Visits (page 7), and Spare Consumables (page 8) tables |
| **PDF download not working** | Fixed endpoint URL in `AMCManagement.js` from `/api/amc/{id}/pdf` to `/api/amc-report/{id}/pdf` |

**UI Bug Fixes:**
| Issue | Fix Applied |
|-------|-------------|
| **"Invalid Date" display** | Fixed to use `contract_details.end_date` instead of non-existent `end_date` |
| **AMC contracts not displaying** | Fixed filter logic - all AMCs now show when search is empty (was filtering out entries with null customer_name) |

#### Customer Portal Finalization ✅ COMPLETE (Feb 6, 2026)
**Location:** `/customer-portal/*`

**New Features Added:**
| Feature | Description |
|---------|-------------|
| **Notifications** | In-app notification center with unread badges, mark as read functionality |
| **Customer Profile** | View/edit profile, change password, displays email, company, contact info, GST, address |
| **Feedback & Ratings** | 5-star rating system, feedback types (general, service, AMC, report), feedback history |
| **Support/Contact** | Ticket creation, conversation threading, status tracking (open, in_progress, resolved), priority levels |
| **Download History** | Track downloaded documents, filter by type, delete records |

**New API Endpoints:**
- `GET /api/customer-portal/notifications` - Get customer notifications
- `PUT /api/customer-portal/notifications/{id}/read` - Mark notification as read
- `GET/PUT /api/customer-portal/profile` - Get/update profile
- `PUT /api/customer-portal/profile/password` - Change password
- `POST/GET /api/customer-portal/feedback` - Submit/retrieve feedback
- `POST/GET /api/customer-portal/support` - Create/list support tickets
- `GET /api/customer-portal/support/{id}` - Get ticket details
- `POST /api/customer-portal/support/{id}/message` - Add ticket message
- `POST/GET/DELETE /api/customer-portal/downloads` - Manage download history

**New Frontend Pages:**
- `CustomerNotifications.js` - Notifications list with filtering
- `CustomerProfile.js` - Profile view/edit with password change
- `CustomerFeedback.js` - Feedback submission and history
- `CustomerSupport.js` - Support ticket system
- `CustomerDownloads.js` - Download history tracking

**UI Enhancements:**
- Header icons: Bell (notifications), Headphones (support), User (profile)
- Quick actions: Added "Submit Feedback" and "Download History" links
- Dark theme consistent with existing portal design

#### Shared Reports Admin Panel ✅ COMPLETE (Feb 6, 2026)
**Location:** Admin Panel → Shared Reports (`/admin/shared-reports`)

**Features:**
| Feature | Description |
|---------|-------------|
| **Document Sharing** | Admins can share any report type with specific customers |
| **Share Modal** | Filter by document type, search documents, one-click share |
| **Customer Selection** | Dropdown with all registered customer portal users |
| **Shared List** | View all shared documents with customer info |
| **Unshare** | Remove document access with one click |
| **Auto Notification** | Customer receives notification when document is shared |

**Supported Document Types:**
- Test Reports
- IR Thermography Reports
- Work Completion Certificates (WCC)
- Calibration Certificates
- AMC Reports

**API Endpoints:**
- `POST /api/customer-portal/admin/share-document` - Share a document
- `DELETE /api/customer-portal/admin/share-document/{id}` - Unshare
- `GET /api/customer-portal/admin/shared-documents` - List all shared
- `GET /api/customer-portal/admin/available-documents` - Get shareable docs
- `GET /api/customer-portal/admin/customers-list` - Get customers

**Integration:** Customer portal reports endpoint now includes both auto-matched documents (by company/email) and explicitly shared documents.

### 🔲 Upcoming Tasks (Priority Order)

#### P1 - High Priority
1. **Project Completion Report Module** - New module based on sample PDF

#### P2 - Medium Priority
1. **Invoice Generation** - Auto-generate PDF invoices from billing module
2. **Billing Page** - Connect to real data (currently static charts)
3. **Automated Email Notifications** - AMC expiry alerts, service visit reminders

#### P3 - Lower Priority
1. **Analytics Dashboard** - Advanced analytics

### ✅ Recently Completed Features

#### User Access Control System ✅ COMPLETE (Feb 27, 2026)
**Location:** Administration → User Access Control

| Feature | Description |
|---------|-------------|
| **User Permission Management** | Admins can assign specific module/sub-module access to individual users |
| **12 Module Groups** | Company Hub, My Workspace, Projects, Sales, Accounts, Finance, HR, Purchase, Exports, Operations, Management, Administration |
| **70+ Sub-modules** | Granular permission control for each page/feature |
| **Grant/Revoke All** | Quick buttons to enable or disable all permissions |
| **Permission Persistence** | Saved to database and applied on user's next login |
| **Super Admin Protection** | Cannot modify super admin permissions |
| **Sidebar Filtering** | Sidebar dynamically shows/hides modules based on user permissions |
| **Login Returns Permissions** | User permissions included in login response for immediate sidebar filtering |
| **Re-login Notification** | Toast message informs admin that user must re-login for changes to take effect |

**Backend API Endpoints:**
- `GET /api/user-access/modules` - List all available modules
- `GET /api/user-access/user/{user_id}` - Get user's permissions
- `PUT /api/user-access/user/{user_id}` - Update user's permissions
- `GET /api/user-access/users-list` - List all users with permission summary

**Files Modified/Created:**
- `/app/backend/routes/user_access.py` - Backend API for permission CRUD
- `/app/backend/server.py` - Login & /auth/me endpoints updated to return permissions
- `/app/frontend/src/pages/admin/UserAccessControl.js` - Admin UI
- `/app/frontend/src/components/Layout.js` - Sidebar filtering based on permissions
- `/app/frontend/src/context/AuthContext.js` - Permission helper functions

**Bug Fix (Feb 27, 2026):** Fixed issue where permissions set via User Access Control page were not being applied. Root cause was that login and /auth/me endpoints in server.py were not returning user permissions. Fixed by adding permissions to both endpoint responses.

#### My Attendance Bug Fix ✅ COMPLETE (Feb 26, 2026)
**Location:** My Workspace → My Attendance

| Issue | Fix |
|-------|-----|
| **Check In button not showing** | Fixed condition to check `todayRecord?.check_in` instead of just `todayRecord` |
| **Showing "Working" when not checked in** | Now correctly shows "Not Checked In" when no check_in time exists |

**Root Cause:** The API returns a record object for every day (even days without check-in), causing `todayRecord` to be truthy even when user hadn't checked in.

**Verified Flow:**
- Not Checked In → Check In button visible ✅
- Working (after check-in) → Check Out button visible ✅
- Day Completed (after check-out) → No buttons ✅

#### IR Thermography Form Enhancement ✅ COMPLETE (Feb 26, 2026)
**Location:** Projects Dept → Project Reports → Audit Reports → IR Thermography → New/Edit

| Feature | Description |
|---------|-------------|
| **Thermography Inspection By** | Changed from dropdown to manual text input field |
| **Report Prepared By** | Changed from dropdown to manual text input field |
| **Report Reviewed By** | Changed from dropdown to manual text input field |
| **Analyzed By** | Changed from dropdown to manual text input field (in Inspection Items) |
| **Load Condition** | Added new field for specifying load condition during inspection |
| **Clone Inspection Item** | Blue copy button to duplicate an inspection item with all its data |
| **Drag & Drop Images** | Image upload areas now support drag and drop functionality |
| **PDF Template Settings** | Cover page now uses design settings from PDF Template Settings |

**Route:** `/projects/project-reports/audit/ir-thermography/new`

#### Calibration Services PDF Report ✅ COMPLETE (Feb 5, 2026)
**Location:** Projects Dept → Calibration Services → Edit Contract → Download Report

| Feature | Description |
|---------|-------------|
| **Comprehensive PDF Report** | 13-page report similar to AMC Report structure |
| **Cover Page** | Professional design with customer details |
| **Table of Contents** | All sections with page numbers |
| **Document Details** | Contract info, NABL cert, service provider |
| **Executive Summary** | Key metrics at a glance |
| **Scope & Objective** | Calibration scope and standard services |
| **Meter/Equipment List** | All meters under contract |
| **Calibration Visits** | Visit schedule with status and technician |
| **Equipment Test Reports** | Linked reports table |
| **Annexure** | Attached Equipment Test Report PDFs |
| **Link Test Reports** | Modal to link/unlink test reports to visits |

#### User Management CRUD ✅ COMPLETE (Feb 4, 2026)
**Location:** Admin Panel → User Management (/admin/users)

| Feature | Description |
|---------|-------------|
| **User List** | Shows all users with role, department, status, created date |
| **Stats Dashboard** | Total Users, Active, Admins, Inactive counts |
| **Filters** | Search by name/email, filter by role, department, status |
| **Invite User** | Create new user with auto-generated temp password (emailed) |
| **Edit User** | Update name, role, department |
| **Toggle Status** | Activate/deactivate users |
| **Reset Password** | Admin can reset any user's password |
| **Delete User** | Super Admin only can delete users |
| **Role-Based Access** | Admin required for most ops, Super Admin for delete |

## Technical Architecture

### Backend Routes
```
/api/customer-hub/          - Internal customer management
  /customers                - CRUD for customers
  /customers/{id}           - Customer details
  /customers/{id}/link-projects
  /customers/{id}/auto-link
  /customers/{id}/set-portal-password
  /customers/{id}/toggle-portal-access
  /customers/{id}/documents

/api/customer-portal/       - External customer access
  /login                    - Customer auth
  /register                 - Customer registration
  /dashboard                - Dashboard stats
  /dashboard/full           - Full dashboard with projects
  /projects                 - Linked projects
  /projects/{id}            - Project detail
  /amcs                     - AMC contracts
  /amcs/{id}                - AMC detail
  /wcc                      - Work Completion Certificates
  /service-reports          - Service reports
  /reports                  - All reports
```

### Frontend Routes
```
/customer-hub               - Customer Directory (internal)
/customer-hub/:customerId   - Customer Profile (internal)

/customer-portal/login      - Customer Login (external)
/customer-portal/dashboard  - Customer Dashboard (external)
/customer-portal/projects   - My Projects (external)
/customer-portal/amcs       - AMC Contracts (external)
/customer-portal/wcc        - WCC (external)
/customer-portal/reports    - Reports (external)
```

### Database Collections
- `customers` - Customer accounts and portal settings
- `projects` - Project data
- `amcs` - AMC contracts
- `work_completion_certificates` - WCC documents
- `test_reports` - Test reports
- Plus existing collections

## Test Credentials
- **Admin (ERP):** admin@enerzia.com / admin123
- **Customer (Portal):** test.customer@example.com / test123

## Known Issues
- Billing page charts are static (P2) - Dashboard shows placeholder data, needs backend API connection
- ~~Session expiration bug (P3)~~ - **FIXED** (Feb 8, 2026) - Improved token validation and periodic checks

## 3rd Party Integrations
- ReportLab, PyPDF2 (PDF generation)
- jsPDF/jspdf-autotable (Frontend PDF)
- react-big-calendar (Calendar views)
- date-fns (Date utilities)
- Passlib/Bcrypt (Auth)
- Redis (Session/caching)
- openpyxl (Excel generation)
- Zoho SMTP (Email integration)

#### Relay Test Report PDF Generation Fix ✅ COMPLETE (Feb 9, 2026)
**Location:** Backend PDF Generation (`backend/routes/equipment_pdf.py`)

| Issue | Fix Applied |
|-------|-------------|
| **NameError: HEADER_BLUE not defined** | Added missing color constants (`HEADER_BLUE`, `HEADER_GREEN`, `HEADER_AMBER`) to the file |
| **PDF endpoint failing** | Fixed - endpoint `/api/equipment-report/relay/{report_id}/pdf` now generates valid PDF |

**Technical Details:**
- Defined color constants matching the UI: `HEADER_BLUE = colors.HexColor('#3b82f6')`, `HEADER_GREEN = colors.HexColor('#22c55e')`, `HEADER_AMBER = colors.HexColor('#f59e0b')`
- These are used for table header backgrounds in the multi-section Relay Test Report (Setting Details, Pickup Test, Characteristic Check tables)
- PDF generation tested and confirmed working (123KB valid PDF generated)

---
*Last Updated: February 9, 2026*
*Status: Relay PDF Generation Fix COMPLETE ✅*

---

#### Battery Test Report Module ✅ COMPLETE (Feb 9, 2026)
**Location:** 
- Frontend: `frontend/src/pages/projects/EquipmentServiceReport.js`, `EquipmentTestReports.js`
- Backend: `backend/routes/equipment_pdf.py`

| Feature | Implementation |
|---------|---------------|
| **Equipment Type** | Added 'battery' with prefix 'BAT' |
| **Equipment Details** | Location, Device Name, Battery Make, Battery Type, Battery AH, No. of Batteries, Batch Code |
| **Inspection Checklist** | 8 items (Visual Inspection, Corrosion Check, Housing Condition, Electrolyte Level, Vent Cap, Mounting & Cabling, Cleaning, Temperature Check) |
| **Test Data Table** | S.No, Resistance (mΩ), Voltage (VDC), Status (Normal/Warning/Critical) |
| **PDF Generation** | Full PDF with all sections, color-coded status |

**Sections in PDF:**
1. Customer Information
2. Service Provider Details
3. Equipment Details - Battery
4. Inspection Checklist (with Yes/No/N/A columns)
5. Battery Test Data (with resistance and voltage readings)
6. Remarks & Recommendations

---
*Last Updated: February 9, 2026*
*Status: Battery Test Report Module COMPLETE ✅*

---

#### Travel Log Odometer OCR Feature ✅ COMPLETE (Feb 10, 2026)
**Location:** 
- Backend: `backend/routes/travel_log.py` - `/api/travel-log/ocr/odometer` endpoint
- Frontend: `frontend/src/pages/employee/TravelLog.js`

| Feature | Implementation |
|---------|---------------|
| **OCR Endpoint** | POST `/api/travel-log/ocr/odometer` - accepts photo file, returns odometer reading |
| **AI Model** | Gemini 2.0 Flash via emergentintegrations library |
| **Auto-Detection** | Uploads odometer photo → AI extracts reading → Auto-fills Start/End KM field |
| **Distance Calc** | Automatically calculates km travelled (End KM - Start KM) |
| **UI Feedback** | Loading spinner during OCR, success/error toast notifications |

**How it works:**
1. User captures/uploads odometer photo
2. Photo sent to backend OCR endpoint
3. AI vision model extracts numeric reading
4. KM field auto-populated with detected value
5. Distance and allowance calculated automatically

---
*Last Updated: February 10, 2026*
*Status: Travel Log OCR Feature COMPLETE ✅*

---

#### Project Schedule PDF Enhancement ✅ COMPLETE (Feb 11, 2026)
**Location:** 
- Backend: `backend/routes/project_schedule_pdf.py` - New comprehensive PDF generation module
- Frontend: `frontend/src/pages/projects/ProjectSchedule.js` - Updated `exportToPDF` function

| Feature | Implementation |
|---------|---------------|
| **Cover Page** | Professional design with teal decorative curves, company logo, project info box |
| **Project Information** | Two-column layout with PID, Client, Location, Dates, Engineer, Status |
| **Service Provider** | Company details, Address, GST, Contact info |
| **Phases Table** | S.No, Phase Name, Start/End Dates, Progress %, Status with color coding |
| **Gantt Chart** | Visual timeline with weekly columns and color-coded phase bars |
| **Milestones** | Target dates and completion status with checkmarks |
| **Summary Stats** | Total phases, completed, in-progress, pending, average progress |
| **API Endpoint** | POST `/api/project-schedule/pdf` - accepts schedule JSON data |

**PDF Structure:**
1. Cover Page - Decorative teal design, project name, duration, status, Prepared By section
2. Project Information - Two-column table with project and provider details
3. Project Notes (if available)
4. Phases & Timeline Table - Progress tracking with status colors
5. Gantt Chart Visualization - Weekly timeline with colored bars
6. Key Milestones - With completion status
7. Schedule Summary - Statistics overview

**Technical Details:**
- Uses ReportLab for professional PDF generation
- Integrates with PDF Template Settings for branding consistency
- Handles multiple date formats (DD/MM/YYYY, YYYY-MM-DD, ISO)
- Color-coded status indicators (green: completed, blue: in-progress, amber: pending)
- Responsive Gantt chart that adapts to project duration
- Tested with 14/14 backend tests passed

---
*Last Updated: February 11, 2026*
*Status: Project Schedule PDF Enhancement COMPLETE ✅*

---

#### Project Schedule Enhancements v2 ✅ COMPLETE (Feb 11, 2026)
**Location:** 
- Frontend: `frontend/src/pages/projects/ProjectSchedule.js` - Complete rewrite
- Backend: `backend/routes/project_schedule_pdf.py` - Added new sections

| Feature | Implementation |
|---------|---------------|
| **Edit Functionality** | Edit button on schedule cards, pre-fills all data, "Update Schedule" button |
| **Customer Information** | New section with 6 fields: Name, Company, Location, Contact Person, Phone, Email |
| **Sub-Items/Sub-Phases** | Expandable phases with detailed breakdown items |
| **Sub-Item Fields** | Description, Quantity, Unit, Location, Remarks |
| **Auto-Populate** | Customer info auto-fills from selected project's client/location |

**UI Changes:**
1. Create modal renamed based on mode: "Create Project Schedule" / "Edit Project Schedule"
2. Customer Information section with indigo background
3. "Phases & Sub-Items" section with expand/collapse toggles
4. "+ Add Item" button for each phase to add sub-items
5. "Update Schedule" button when editing (vs "Save Schedule" for new)
6. Customer name displayed on schedule card header

**PDF Changes:**
1. New "CUSTOMER INFORMATION" section with indigo header
2. New "PHASE BREAKDOWN & DETAILS" section with cyan header
3. Sub-items table with columns: S.No, Description, Qty, Unit, Location, Remarks

**Use Case Example:**
- Phase: "Material Delivery"
- Sub-Items:
  - "4C x 35mm Cable" | 500 | m | Various locations | Partial delivery
  - "Cable Tray 300mm" | 200 | m | All floors | -
- Phase: "Cable Installation"
- Sub-Items:
  - "4C x 35mm Cable" | 200 | m | 1st Floor - Panel A to DB1 | Completed
  - "4C x 35mm Cable" | 300 | m | 2nd Floor - Panel B to DB2 | In Progress

---
*Last Updated: February 11, 2026*
*Status: Project Schedule Enhancements v2 COMPLETE ✅*

---

## Pre-Deployment Stability Check ✅ PASSED (Feb 11, 2026)

### Test Results Summary
| Category | Status | Details |
|----------|--------|---------|
| **Backend API** | ✅ 100% (27/27) | All endpoints responding correctly |
| **Frontend Pages** | ✅ 100% | All pages load without JS errors |
| **Database** | ✅ Connected | 44 collections, healthy data |
| **Services** | ✅ Running | backend, frontend, nginx, proxy |
| **Disk Space** | ✅ 18% used | 78GB free |
| **Memory** | ✅ Adequate | 6.6GB of 16GB |

### Modules Verified
- ✅ Authentication (login/logout)
- ✅ Dashboard (stats, charts, notifications)
- ✅ Projects (361 total: 86 live, 275 completed)
- ✅ AMC Management (2 contracts)
- ✅ Calibration Services (2 contracts)
- ✅ Equipment Test Reports (16 equipment types)
- ✅ Project Schedule (create/edit/PDF generation)
- ✅ PDF Template Settings (8 report types)
- ✅ Travel Log (OCR, approval workflow)
- ✅ Attendance (check-in/out, payroll)
- ✅ Leave Management (balances, requests)
- ✅ User Management (16 users)

### Known Limitations
- ⚠️ Billing Page: Uses static mocked data (not functional)

### Deployment Status: **READY** 🚀

---
*Last Updated: February 11, 2026*
*Status: PRE-DEPLOYMENT CHECKS PASSED ✅*

---

#### Sales Department Module ✅ COMPLETE (Feb 12, 2026)
**Location:** 
- Backend: `backend/routes/sales.py` - Full CRUD API for Enquiries, Quotations, Orders, Targets, Dashboard
- Frontend: `frontend/src/pages/sales/` - Enquiries.js, Quotations.js, Orders.js, SalesDashboard.js

| Feature | Implementation |
|---------|---------------|
| **Enquiry Management** | Full CRUD with auto-numbering (Enq/Year/XXXX format) |
| **Enquiry Fields** | Date, Company Name, Location, Description, Value, Contact Person, Phone, Email, Category, Status, Source |
| **Enquiry Statuses** | New, Site Visited, Quoted, Accepted, Declined, Invoiced |
| **Quotation Management** | Full CRUD with line items, GST calculation, linked to enquiries |
| **Quotation Fields** | Customer info, Date, Valid Until, Subject, Line Items (Description, Unit, Qty, Price, Total), GST (0%/5%/12%/18%/28%), Payment Terms, Delivery Terms |
| **Quotation Statuses** | Draft, Sent, Accepted, Rejected, Expired |
| **Order Management** | Full CRUD with line items, status tracking, payment tracking |
| **Order Fields** | Customer info, PO Number, PO Date, Delivery Date, Line Items, GST, Notes |
| **Order Statuses** | Pending, Confirmed, Processing, Shipped, Delivered, Cancelled |
| **Payment Statuses** | Unpaid, Partial, Paid |
| **Linked Flow** | Enquiry → Quotation → Order (auto-updates statuses when converting) |
| **Dashboard** | Real-time stats, Sales Pipeline visualization, Recent activity sections |
| **Auto-Numbering** | Enq/Year/XXXX (enquiries), QT-YY-YY-XXXX (quotations), SO-YY-YY-XXXX (orders) |

**API Endpoints:**
- `GET/POST /api/sales/enquiries` - List/Create enquiries
- `GET/PUT/DELETE /api/sales/enquiries/{id}` - Get/Update/Delete enquiry
- `GET /api/sales/enquiries/stats` - Enquiry statistics
- `GET/POST /api/sales/quotations` - List/Create quotations
- `GET/PUT/DELETE /api/sales/quotations/{id}` - Get/Update/Delete quotation
- `GET /api/sales/quotations/stats` - Quotation statistics
- `POST /api/sales/quotations/{id}/convert-to-order` - Convert quotation to order
- `GET/POST /api/sales/orders` - List/Create orders
- `GET/PUT/DELETE /api/sales/orders/{id}` - Get/Update/Delete order
- `GET /api/sales/orders/stats` - Order statistics
- `GET /api/sales/dashboard/stats` - Dashboard statistics

**Test Results:** 100% pass rate (20/20 backend tests, all frontend pages functional)

---
*Last Updated: February 12, 2026*
*Status: SALES MODULE COMPLETE ✅*

---

#### Lead Management Module ✅ COMPLETE (Feb 27, 2026)
**Location:** Sales Department → Lead Management
- Backend: `/app/backend/routes/lead_management.py`
- Frontend: `/app/frontend/src/pages/sales/LeadManagement.js`, `FollowUpForm.js`, `FollowUpsList.js`, `FollowUpCalendar.js`, `FollowUpDetails.js`

| Feature | Description |
|---------|-------------|
| **Follow-up Types** | Cold Call, Site Visit, Call Back Request, Visit Later, General |
| **Statuses** | Scheduled, Pending, Completed, Cancelled, Rescheduled |
| **Customer Linking** | Link to existing Domestic/Overseas customer OR create new lead entry |
| **Priority Levels** | High, Medium, Low |
| **Assignment** | Assign follow-ups to team members |
| **Comments/Notes** | Add comments and activity log to each follow-up |
| **Dashboard** | Stats cards (Today, This Week, Overdue, Completed), Type breakdown, Overdue/Today/Upcoming sections |
| **Calendar View** | Monthly calendar with follow-ups displayed on dates |
| **List View** | Filterable table (status, type, priority, date range, search) |
| **Quick Actions** | Mark Complete (with outcome), Reschedule (with reason), Cancel |

**API Endpoints:**
- `GET /api/lead-management/followups` - List with filters & pagination
- `POST /api/lead-management/followups` - Create follow-up
- `GET /api/lead-management/followups/{id}` - Get single follow-up
- `PUT /api/lead-management/followups/{id}` - Update follow-up
- `DELETE /api/lead-management/followups/{id}` - Delete follow-up
- `POST /api/lead-management/followups/{id}/complete` - Mark as complete
- `POST /api/lead-management/followups/{id}/reschedule` - Reschedule
- `POST /api/lead-management/followups/{id}/comments` - Add comment
- `GET /api/lead-management/followups/stats` - Dashboard statistics
- `GET /api/lead-management/followups/today` - Today's follow-ups
- `GET /api/lead-management/followups/upcoming` - Upcoming (7 days)
- `GET /api/lead-management/followups/overdue` - Overdue follow-ups
- `GET /api/lead-management/followups/calendar` - Calendar view by month
- `GET /api/lead-management/team-members` - Sales team for assignment

**Routes:**
- `/sales/lead-management` - Dashboard
- `/sales/lead-management/new` - Create follow-up
- `/sales/lead-management/edit/:id` - Edit follow-up
- `/sales/lead-management/followups` - All follow-ups list
- `/sales/lead-management/followups/:id` - Follow-up details
- `/sales/lead-management/calendar` - Calendar view

**Test Results:** 100% pass rate (22/22 backend tests, all UI flows working)

---

#### AMC Module Bug Fixes ✅ COMPLETE (Feb 12, 2026)
**Location:** 
- Backend: `backend/routes/amc.py`, `backend/routes/amc_pdf.py`
- Frontend: `frontend/src/pages/projects/AMCList.js`, `AMCManagement.js`

| Issue | Fix Applied |
|-------|-------------|
| **PDF Download Not Working** | VERIFIED WORKING - PDF download endpoint `/api/amc-report/{id}/pdf` generates valid 4.7MB PDF with correct headers |
| **Test Report Ordering** | FIXED - Reports now sorted by equipment_list order (transformer > vcb > acb > relay > earth-pit) |
| **Equipment Reports API** | FIXED - `/api/amc/{id}/equipment-reports` returns reports in correct equipment order |
| **Single AMC API** | FIXED - `GET /api/amc/{id}` returns test_reports sorted by equipment order |

**Technical Details:**
- Added `equipment_order` mapping based on equipment_list position
- Implemented `sort_key` function: `(equipment_order, report_no)` for consistent sorting
- Applied sorting to: `get_amc()`, `get_amc_equipment_reports()`, `generate_amc_report_pdf()`
- Created comprehensive pytest suite: `/app/backend/tests/test_amc_module.py` (16 tests, 100% pass)

**Test Results:** 
- Backend: 100% (16/16 tests passed)
- Frontend: 100% (PDF download works, reports display in correct order)

---
*Last Updated: February 12, 2026*
*Status: AMC MODULE BUG FIXES COMPLETE ✅*

---

#### AMC Module Additional Fix ✅ (Feb 12, 2026)
**Issue:** AMC list showing empty customer details and site_location on first navigation

**Root Cause:** 
1. Backend `get_all_amcs` endpoint was not properly extracting `customer_name` from the AMC's `customer_info` object
2. `site_location` was inside `customer_info` but frontend expected it at top level

**Fix Applied:**
- Modified `/app/backend/routes/amc.py` lines 117-165
- Now extracts `customer_name` from `customer_info.customer_name` first, then falls back to project data
- Now extracts `site_location` from `customer_info.site_location` first, then falls back to project data
- Both fields are now set at top level for easy frontend access

**Verified:** 
- Data displays correctly immediately on navigation without needing to edit first
- PDF download working (4.78MB valid PDF)
- All customer info, site location, and contract details visible on first load

**User-Reported PDF Observations (NOT BUGS - Data State Issues):**
- Equipment reports showing "Draft" status: The test reports in database actually have status "draft" (only transformer is "completed")
- Missing test data on page 12: The transformer report doesn't have `test_results` or `tests_performed` data recorded in the database

---
*Last Updated: February 12, 2026*
*Status: ALL AMC ISSUES RESOLVED ✅*

---

#### AMC Module - Transformer Report Linking Fix ✅ (Feb 12, 2026)
**Issue:** Transformer test report in AMC PDF showed generic "No specific test results recorded" instead of actual test data (Oil BDV, IR tests, OLTC tests, etc.)

**Root Cause:** The `generate_test_report_pdf()` function in `equipment_pdf.py` was using a generic equipment PDF generator that doesn't handle transformer-specific test data fields. The transformer report has specialized fields like `oil_bdv_before_flash_point`, `ir_tests[]`, `oltc_bdv_before`, etc. that weren't being rendered.

**Fix Applied:**
- Modified `/app/backend/routes/equipment_pdf.py` line 3866-3886
- Now detects `equipment_type == 'transformer'` and uses the dedicated `transformer_pdf.generate_pdf_buffer()` function
- This ensures transformer reports in AMC PDFs include all test sections: Oil BDV Test, IR Test, Magnetic Balance, Ratio Test, OLTC, etc.

**Result:** Transformer reports attached to AMC PDFs now show full test data matching the standalone report

---
*Last Updated: February 12, 2026*
*Status: TRANSFORMER LINKING FIX COMPLETE ✅*

---

#### AMC PDF - Section G and Report Type Fixes ✅ (Feb 12, 2026)
**Issues Fixed:**
1. **Section G Table**: Changed "STATUS" column to "NEXT DUE DATE" - now shows `next_due_date` from each test report
2. **Transformer Report Type**: Added "Annual Shutdown Maintenance" to the checkbox options - now shows tick mark when selected

**Files Modified:**
- `/app/backend/routes/amc_pdf.py` - Changed column header and data field
- `/app/backend/routes/transformer_pdf.py` - Updated report type checkbox options

---
*Last Updated: February 13, 2026*
*Status: ALL FIXES COMPLETE ✅*

---

## Phase 1: Project Profit Module ✅ (Feb 13, 2026)

### New Feature: Project Profitability Tracking

**Purpose:** Track project profit based on order value (from Sales/Zoho) vs actual costs incurred.

**Backend API:** `/app/backend/routes/project_profit.py`
- `POST /api/project-profit/budget` - Create budget allocation
- `GET /api/project-profit/budget/{project_id}` - Get project budget
- `PUT /api/project-profit/budget/{project_id}` - Update budget
- `POST /api/project-profit/budget/{project_id}/approve` - Approve budget
- `POST /api/project-profit/costs` - Add cost entry
- `GET /api/project-profit/costs/{project_id}` - Get project costs
- `GET /api/project-profit/analysis/{project_id}` - Get profit analysis
- `GET /api/project-profit/dashboard` - Get overall profit dashboard

**Frontend Pages:**
- `/app/frontend/src/pages/sales/ProjectProfitDashboard.js` - Main dashboard
- `/app/frontend/src/pages/sales/BudgetAllocation.js` - Budget allocation modal

**Database Collections:**
- `project_budgets` - Budget allocations per project
- `project_costs` - Cost entries per project

**Route:** `/sales/project-profit`

---

### 🔄 Zoho Integration Bug Fixes (Feb 13, 2026)

**Issue 1: View Synced Data UI - FIXED ✅**
- Added "View" button next to each sync type (Customers, Vendors, Invoices, Sales Orders, Payments)
- Created modal popup to display synced data with proper formatting
- Each data type shows relevant fields (name, email, amounts, status, etc.)

**Issue 2: Payments Sync OAuth Scope - FIXED ✅**
- Root cause: OAuth scope was requesting `ZohoBooks.vendorpayments.READ` instead of `ZohoBooks.customerpayments.READ`
- Fixed in `/app/backend/routes/zoho_integration.py` line 63
- **User Action Required:** Re-authorize Zoho connection to get the new scope

**Files Modified:**
- `/app/backend/routes/zoho_integration.py` - Fixed OAuth scope
- `/app/frontend/src/pages/settings/ZohoIntegration.js` - Added View buttons and modal

---

### 🚀 Deployment Readiness Check (Feb 14, 2026)

**Status: READY FOR DEPLOYMENT ✅**

**Checks Performed:**
- ✅ Backend running (FastAPI on port 8001)
- ✅ Frontend running (React on port 3000)
- ✅ MongoDB connected
- ✅ API health check passed
- ✅ Login/Authentication working
- ✅ Environment variables properly configured
- ✅ .gitignore cleaned up (removed malformed entries)
- ✅ In-memory cache fallback working (Redis optional)
- ✅ JavaScript lint: No issues
- ⚠️ Python lint: Minor warnings only (unused variables, style) - no critical bugs

**Known Limitations:**
- Redis caching is optional (in-memory fallback works)
- Zoho Payments sync requires re-authorization (scope fix applied)

---

### 📝 Enquiries Module - Complete Summary (Feb 14, 2026)

**Enquiry Form Fields:**
| # | Field | Type | Description |
|---|-------|------|-------------|
| 1 | Enquiry Date * | Date Picker | YYYY-MM-DD format |
| 2 | Target Date | Date Picker | Expected completion date |
| 3 | Category | Dropdown | PSS, AS, OSS, CS, DOM_LIGHTING, EXPORTS |
| 4 | Company Name * | Dropdown | Linked to Domestic Customers (592+ records) |
| 5 | Location | Text | Auto-filled from customer or manual entry |
| 6 | Contact Person | Text | Auto-filled from customer record |
| 7 | Contact Phone | Text | Auto-filled from customer record |
| 8 | Contact Email | Text | Auto-filled from customer record |
| 9 | Description * | Textarea | Enquiry details |
| 10 | Estimated Value | Number | Value in ₹ |
| 11 | Department | Dropdown | PROJECTS, SALES, ACCOUNTS, PURCHASE, EXPORTS, FINANCE, HR, OPERATIONS |
| 12 | Assigned To | Dropdown | Filtered by selected department |
| 13 | Priority | Dropdown | High, Medium, Low |
| 14 | Status | Dropdown | New, Price Enquiry, Site Visit Needed, Site Visited, Under Progress, Quoted, Negotiation, Accepted, Declined, Invoiced |
| 15 | Remarks | Textarea | Additional notes |

**Status Options:**
- New, Price Enquiry, Site Visit Needed, Site Visited, Under Progress, Quoted, Negotiation, Accepted, Declined, Invoiced

**Export Features:**
- ✅ PDF Export - Enquiry No, Date, Company, Description, Value, Priority, Status, Assigned To
- ✅ Excel Export - All 16 fields including Priority, Status, Department
- ✅ Bulk Upload - Download template, upload filled Excel file

**Key Features:**
- Company Name dropdown links to Domestic Customers from Settings
- Department selection filters Assigned To dropdown (shows only dept members)
- Auto-fill contact info when customer is selected
- Stats cards: Total Enquiries, New, Quoted, Accepted, Pipeline Value

**Files:**
- Frontend: `/app/frontend/src/pages/sales/Enquiries.js`
- Backend: `/app/backend/routes/sales.py` (endpoints: enquiries, export/pdf, export/excel, bulk/template, bulk/upload)

**Removed from Sales Menu:**
- Customers (removed)
- Leads (removed)

---

### Customer Management Module ✅ COMPLETE (Feb 14, 2026)
**Location:** 
- Frontend: `/app/frontend/src/pages/sales/CustomerManagement.js`
- Backend: `/app/backend/routes/customer_management.py`
- Route: `/sales/customer-management`

**7 Dashboard Tabs:**
| Tab | Features |
|-----|----------|
| **Overview** | Total Customers (592), Active Customers (4), Pipeline Value, Total Revenue, Conversion Rate (50%), Enquiry Funnel visualization, Top Customers by Revenue |
| **Enquiry Analysis** | Status Distribution, Category Distribution (PSS, CS), Department Distribution, Monthly Trend, Priority Distribution, Top Companies by Enquiry Count, Conversion Funnel (Total→Quoted→Won) |
| **Quote Analysis** | Total Quotes, Accepted/Declined/Pending counts, Win Rate (66.7%), Avg Quote Value, Value Breakdown (Total/Accepted/Pending/Declined), Quote Aging buckets (0-7, 8-14, 15-30, 30+ days), Pending Quotes table |
| **Order Analysis** | Total Orders, Total Revenue, Avg Order Value, Unique Customers, Repeat Customers, Repeat Rate, Top Customers by Order Value, Orders by Category, Recent Orders table |
| **Projections** | Avg Monthly Revenue, Growth Rate, Pipeline Value, Weighted Pipeline (probability-weighted), Revenue Projections (Next 3 Months with confidence levels), Pipeline by Status breakdown |
| **Customer Targeting** | Total/Active/Prospects/Dormant/High Value customer counts, Prospects list (no enquiries yet), Dormant Customers list (need re-engagement), Follow-up Required table (quoted >14 days) |
| **All Customers** | Searchable customer grid (592 domestic customers), Per-customer analytics (Enquiries, Won, Pending), Clickable cards to open Customer 360 |

**Customer 360° Modal:**
- Opens when clicking any customer
- Shows contact info (Person, Phone, Email, Location)
- Metrics: Total Enquiries, Won, Pending, Win Rate, Avg Order Value
- Value Summary: Total Business Value, Won Value, Pending Value
- Enquiry Status Breakdown by status type
- Recent Enquiries table with status badges

**API Endpoints:**
- `GET /api/customer-management/overview` - Dashboard summary stats
- `GET /api/customer-management/enquiry-analysis` - Enquiry analytics
- `GET /api/customer-management/quote-analysis` - Quote/quotation analytics
- `GET /api/customer-management/order-analysis` - Order analytics
- `GET /api/customer-management/projections` - Revenue projections
- `GET /api/customer-management/customer-targeting` - CRM targeting insights
- `GET /api/customer-management/customers?limit=100` - Customer list with analytics
- `GET /api/customer-management/customer/{name}/360` - Individual customer 360° view

**Testing:** 100% pass rate (41/41 backend tests, all frontend tabs verified)

---
### Quotations Module Enhancement ✅ COMPLETE (Feb 14, 2026)
**Location:** `/app/frontend/src/pages/sales/Quotations.js`

**New Features:**
| Feature | Description |
|---------|-------------|
| **Link to Enquiry** | Dropdown to select existing enquiries, auto-fills all customer data |
| **Customer Autocomplete** | Searchable customer name with datalist from 592 domestic customers |
| **Auto-fill GST & Address** | Automatically populates GST Number and Address when customer is selected |
| **Date Calendar Picker** | HTML5 date input with calendar UI, defaults to today |
| **Valid Until Calendar Picker** | HTML5 date input, defaults to 30 days from today |
| **Enhanced Line Items** | Add/remove items, unit dropdown (11 options), quantity, price, line totals |
| **GST Calculation** | Dropdown (0%, 5%, 12%, 18%, 28%), auto-calculates GST amount and total |
| **Default Terms** | Pre-filled Payment Terms (50% Advance, 50% on delivery) and Delivery Terms |

**Data Flow:**
```
Enquiry Selection → Auto-fills Customer Name, Contact, Phone, Email
    ↓
Customer Name → Looks up GST, Address from clients database
    ↓  
Line Items → Auto-calculates Subtotal → GST → Total Amount
```

**Testing:** 100% pass rate (18/18 backend tests, all frontend features verified)

### Order Lifecycle Management Module ✅ COMPLETE (Feb 14, 2026)
**Location:** 
- Frontend: `/app/frontend/src/pages/sales/OrderLifecycle.js`
- Backend: `/app/backend/routes/order_lifecycle.py`
- Route: `/sales/order-lifecycle`

**Phase 1 - Order Management Dashboard (Central Hub):**
| Feature | Description |
|---------|-------------|
| **Dashboard Stats** | Total Orders, Revenue, Profit, Margin, Purchase Cost, Execution Expenses, Pending Payments |
| **Orders by Status** | 7-stage pipeline: New → Procurement → Execution → Delivered → Invoiced → Paid → Closed |
| **Order List** | Order Value, Purchase Cost, Expenses, Profit per order with action buttons |
| **Configure Lifecycle** | Budget Targets (% or ₹), Payment Milestones, Credit Period, Project Linking |
| **Add Expense** | 7 categories: Material Purchase, Labor, Transport, Site Expenses, Subcontractor, Equipment Rental, Misc |
| **View Details** | Order financials, Budget vs Actual bars, Expenses list, Payment Milestones status |
| **Status Control** | Click status buttons to advance order through pipeline |

**Budget Targets Configuration:**
```
Order Value: ₹1,18,000
├── Purchase Budget: 40% = ₹47,200
├── Execution Budget: 25% = ₹29,500
└── Target Profit: 35% = ₹41,300
```

**Payment Milestones (Custom per customer):**
- Advance: 30% on Order Confirmation
- On Delivery: 50% on Material Delivery
- Final: 20% within 30 days from Invoice
- Credit Period: Configurable (default 30 days)

**API Endpoints:**
- `GET /api/order-lifecycle/orders` - List orders with lifecycle and financials
- `GET /api/order-lifecycle/orders/{id}` - Order details
- `POST /api/order-lifecycle/orders/{id}/lifecycle` - Create/update lifecycle
- `PUT /api/order-lifecycle/orders/{id}/lifecycle/status` - Update status
- `PUT /api/order-lifecycle/orders/{id}/payment/{id}` - Update payment milestone
- `GET/POST/PUT/DELETE /api/order-lifecycle/expenses` - Expense management
- `GET /api/order-lifecycle/dashboard/stats` - Dashboard statistics
- `GET /api/order-lifecycle/dashboard/profitability` - Order-wise P&L
- `GET /api/order-lifecycle/dashboard/savings-report` - Purchase & Execution savings
- `GET /api/order-lifecycle/dashboard/payment-tracking` - Payment status

**Testing:** 100% pass rate (30/30 backend tests, all frontend features verified)

---

### Purchase Module (Phase 2) ✅ COMPLETE (Feb 14, 2026)
**Location:** 
- Frontend: `/app/frontend/src/pages/purchase/PurchaseModule.js`
- Backend: `/app/backend/routes/purchase_module.py`
- Route: `/purchase/procurement`

**Features:**
| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats (PRs, POs, Total Value, Pending Deliveries), Purchase Savings Analysis |
| **Purchase Requests** | Create PR (link to sales order), set priority, add items with estimated prices |
| **Vendor Quotes** | Add quotes from multiple vendors, compare side-by-side, highlight lowest |
| **Quote Comparison** | View totals, delivery days, potential savings if choosing lowest |
| **Purchase Orders** | Auto-create PO from selected quote with GST calculation |
| **GRN (Goods Receipt)** | Record received goods, update PO status (partial/received) |
| **Savings Tracking** | Budget vs Actual comparison per order from Order Lifecycle |

**Workflow:**
```
Sales Order → Purchase Request → Vendor Quotes → Compare → Select Lowest → Create PO → GRN → Track Savings
```

**Status Flows:**
- **Purchase Request:** pending → quoted → approved → ordered → closed
- **Purchase Order:** draft → sent → confirmed → partial → received

**API Endpoints:**
- `GET/POST /api/purchase-module/requests` - Purchase requests CRUD
- `POST /api/purchase-module/requests/from-order/{id}` - Create PR from sales order
- `GET/POST /api/purchase-module/quotes` - Vendor quotes
- `GET /api/purchase-module/quotes/compare/{id}` - Compare quotes for a PR
- `PUT /api/purchase-module/quotes/{id}/select` - Select winning quote
- `GET/POST /api/purchase-module/orders` - Purchase orders
- `POST /api/purchase-module/orders/from-quote/{id}` - Create PO from quote
- `GET/POST /api/purchase-module/grn` - Goods Receipt Notes
- `GET /api/purchase-module/dashboard/stats` - Dashboard statistics
- `GET /api/purchase-module/dashboard/savings` - Savings analysis
- `GET /api/purchase-module/vendors` - Vendor list

**Testing:** 100% pass rate (35/35 backend tests, all frontend features verified)

---

### Expense Management Module (Phase 3) ✅ COMPLETE (Dec 15, 2026)
**Location:** 
- Frontend: `/app/frontend/src/pages/accounts/ExpenseManagement.js`
- Backend: `/app/backend/routes/expense_management.py`
- Route: `/accounts/expense-management`

**Features:**
| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats (Total Expenses, Approved Amount, Pending Approval, This Month), Category breakdown |
| **Expense CRUD** | Create/Edit/Delete expenses linked to sales orders |
| **8 Categories** | Material Purchase, Labor, Transport, Site Expenses, Subcontractor, Equipment Rental, Travel, Misc |
| **6 Payment Modes** | Cash, Bank Transfer, UPI, Cheque, Credit Card, Petty Cash |
| **Receipt Upload** | Upload JPG, PNG, PDF receipts for each expense |
| **Approval Workflow** | Submit → Approve/Reject/Request Info with comments |
| **Bulk Approve** | Select multiple expenses and approve at once |
| **Approval History** | Timeline of all status changes with timestamps |
| **Reports** | Category-wise, Vendor-wise, Order-wise expense summaries |

**Approval Status Flow:**
```
Pending → Submitted → Approved/Rejected/Info Requested
```

**API Endpoints:**
- `GET/POST /api/expense-management/expenses` - Expense CRUD
- `GET/PUT/DELETE /api/expense-management/expenses/{id}` - Single expense
- `POST /api/expense-management/expenses/{id}/upload` - Upload receipt
- `GET /api/expense-management/expenses/{id}/attachments/{file_id}` - Download attachment
- `PUT /api/expense-management/expenses/{id}/submit` - Submit for approval
- `PUT /api/expense-management/expenses/{id}/approve` - Approve/Reject/Request Info
- `GET /api/expense-management/approval-queue` - Pending approvals
- `POST /api/expense-management/bulk-approve` - Bulk approve
- `GET /api/expense-management/dashboard/stats` - Dashboard statistics
- `GET /api/expense-management/dashboard/category-report` - Category breakdown
- `GET /api/expense-management/dashboard/vendor-report` - Vendor breakdown
- `GET /api/expense-management/dashboard/order-expenses` - Order-wise summary
- `GET /api/expense-management/categories` - List categories
- `GET /api/expense-management/payment-modes` - List payment modes

**Testing:** 100% pass rate (27/27 backend tests, all frontend features verified)

---

### Finance Dashboard Module (Phase 4) ✅ COMPLETE (Dec 15, 2026)
**Location:** 
- Frontend: `/app/frontend/src/pages/finance/FinanceDashboard.js`
- Backend: `/app/backend/routes/finance_dashboard.py`
- Route: `/finance`

**Features:**
| Feature | Description |
|---------|-------------|
| **Overview Dashboard** | Revenue, Costs, Profit, Pending Payments with KPI cards |
| **Order P&L Analysis** | Order-wise profit/loss table with margins and status |
| **Cash Flow Projections** | 6-month cash inflow forecast based on payment milestones |
| **Savings Analysis** | Budget vs Actual comparison for Purchase & Execution |
| **Expense Breakdown** | Category-wise expense distribution with percentages |
| **Payment Status** | Overdue, Pending, Fully Paid collections tracking |
| **Department Performance** | Purchase, Sales, Accounts department metrics |
| **Monthly Trends** | Revenue vs Cost bar chart for last 6/12 months |
| **Financial KPIs** | Avg Order Value, Profit Margin, Cost Ratio, Collection Rate |

**Tabs:**
1. **Overview** - Main dashboard with KPIs and trends
2. **Order P&L** - Order-wise profitability table
3. **Cash Flow** - Monthly payment projections
4. **Savings Report** - Budget compliance analysis
5. **Expenses & Depts** - Category breakdown and department metrics

**API Endpoints:**
- `GET /api/finance-dashboard/overview` - Financial overview stats
- `GET /api/finance-dashboard/order-profitability` - Order-wise P&L
- `GET /api/finance-dashboard/cash-flow` - Cash flow projections
- `GET /api/finance-dashboard/savings-analysis` - Budget vs Actual
- `GET /api/finance-dashboard/expense-breakdown` - Category breakdown
- `GET /api/finance-dashboard/payment-status` - Payment collection status
- `GET /api/finance-dashboard/department-performance` - Dept metrics
- `GET /api/finance-dashboard/monthly-trends` - Monthly trends data
- `GET /api/finance-dashboard/kpis` - Financial KPIs

**Testing:** 100% pass rate (43/43 backend tests, all frontend features verified)

---

## Order Lifecycle Management System - COMPLETE ✅

All 4 phases successfully implemented and tested:
1. **Phase 1:** Order Management Dashboard (Sales -> Order Lifecycle)
2. **Phase 2:** Purchase Module (Purchase -> Procurement)
3. **Phase 3:** Expense Management (Accounts -> Expense Management)
4. **Phase 4:** Finance Dashboard (Finance -> Dashboard)

---

## Quotation Module - Zoho-like Rework ✅ COMPLETE (Feb 16, 2026)
**Location:** `/app/frontend/src/pages/sales/Quotations.js`, `/app/backend/routes/sales.py`, `/app/backend/utils/pid_system.py`

### Form Layout (Updated)

| Order | Section | Fields |
|-------|---------|--------|
| 1 | **Link to Enquiry** | Optional dropdown - filters out already-quoted enquiries |
| 2 | **Customer Information** | Customer Name, GST Treatment, GSTIN, Place of Supply, Billing/Shipping Address, Kind Attention, Phone, Email |
| 3 | **Quotation Details** | Financial Year (text input), Quote Number (preview), Quote Date (calendar), Expiry Date (calendar), Assigned To, Delivery in Days, Payment Terms |
| 4 | **Subject/Description** | Text input |
| 5 | **Line Items** | S.No, Description, HSN/SAC, Unit, Qty, Rate, Amount |
| 6 | **GST Calculation** | Subtotal, GST %, GST Amount, Total |
| 7 | **Transport & Shipping** | Transport Mode, Incoterms |
| 8 | **Terms** | Delivery Terms, Terms & Conditions, Notes |

### Quote Number Format
- **Format:** `Quote/FY/sequence` (e.g., `Quote/25-26/0001`, `Quote/28-29/0001`)
- **Financial Year:** Text input (YY-YY format) - can enter any year like `28-29`
- Quote Number: Auto-generated preview updates dynamically when FY changes
- New API: `GET /api/sales/quotations/next-number?financial_year=25-26`

### Changes Made (Feb 16, 2026 - Session 4)
1. ✅ **Financial Year** - Changed from dropdown to TEXT INPUT (can enter any year like `28-29`)
2. ✅ **Assigned To dropdown** - Fixed fetch (was using wrong API endpoint)
3. ✅ Quote Number preview updates when FY changes (e.g., `Quote/28-29/0001`)

### Changes Made (Feb 16, 2026 - Session 3)
1. ✅ Financial Year field is now EDITABLE
2. ✅ Quote Number shows live preview
3. ✅ "Salesperson" renamed to "Assigned To"

### Changes Made (Feb 16, 2026 - Session 2)
1. ✅ Quote number format: `Quote/25-26/0001`
2. ✅ Category field REMOVED
3. ✅ Quotation Details section below Customer Information
4. ✅ Enquiry dropdown filters already-quoted enquiries
5. ✅ Payment Terms in Quotation Details section

### Testing
- Backend accepts any financial_year (e.g., `28-29`) and generates `Quote/28-29/0001`
- Assigned To dropdown shows all team members
- All frontend UI features verified

---

## Convert to Order Modal - Reworked ✅ (Feb 16, 2026)
**Location:** `/app/frontend/src/pages/sales/Quotations.js`, `/app/backend/routes/sales.py`

### New Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Customer PO Number | Text Input | ✅ | Customer's PO reference number |
| PO Date | Date Picker | | Date of the PO |
| PO Attachment | File Upload | | Upload PO document (PDF, Image) |
| Order Type | Dropdown | | Work Order, Purchase Order, E.mail/Verbal, Order Pending |
| Expected Delivery Date | Date Picker | | Expected delivery date |
| Category | Dropdown | ✅ | PSS, AS, OSS, CS |
| Remarks | Textarea | | Additional notes |

### Order Type Options
- Work Order
- Purchase Order
- E.mail / Verbal Confirmation
- Order Pending

### Category Options
- PSS - Power System Solutions
- AS - Automation Solutions
- OSS - Other System Solutions
- CS - Consulting Services

### Backend Changes
- `OrderCreate` model updated with: `po_attachment`, `po_attachment_name`, `order_type`, `remarks`
- `OrderUpdate` model updated with same fields
- File upload supported via existing `/api/upload` endpoint

### Additional Change
- Convert to Order button now visible for `draft`, `sent`, and `accepted` quotations

---
*Last Updated: February 16, 2026*
*Status: DEPLOYMENT READY ✅ | QUOTATION & ORDER MODULES COMPLETE ✅*

---

## Gantt Chart PDF Investigation ✅ (Feb 17, 2026)
**Location:** `/app/backend/routes/project_schedule_pdf.py`

### Investigation Summary
**Status: NO BUG FOUND - WORKING CORRECTLY ✅**

The user reported that the Gantt chart in Project Schedule PDFs was not rendering color-coded bars. After thorough investigation:

### Test Results
1. **PDF 1 (PID/25-26/017 - B & P Electrical Works):**
   - Schedule ID: `45952777-45d5-4b83-9daa-c33e34235abe`
   - Generated: 114KB valid PDF
   - Gantt colors found: Blue (#3b82f6), Orange (#f49e0b), Yellow (#ffea57), Light Blue (#87ceff)
   - All 5 phases with colored bars visible

2. **PDF 2 (PID/25-26/385 - UPS Cable Laying Work):**
   - Schedule ID: `2f1cd175-ff0e-42f6-84a4-99bab1ad274f`
   - Generated: 115KB valid PDF
   - Gantt colors found: Blue (#3b82f6), Light Blue (#87ceff), Cyan (#0e7490)
   - All 4 phases with colored bars visible

### Technical Verification
| Component | Status | Details |
|-----------|--------|---------|
| Date Parsing | ✅ Working | Handles DD/MM/YYYY, YYYY-MM-DD, and ISO formats |
| Week Calculation | ✅ Working | Correctly maps phase dates to timeline weeks |
| Bar Coloring | ✅ Working | 8 distinct phase colors defined and applied |
| PDF Generation | ✅ Working | 200 HTTP response, valid PDF structure |

### Date Format Handling
The `parse_date()` function correctly handles mixed formats:
- Project dates in `DD/MM/YYYY` (e.g., `20/02/2026`)
- Phase dates in `YYYY-MM-DD` (e.g., `2026-02-20`)
- Both parsed correctly for timeline comparison

### AI Analysis Confirmation
File analysis tool confirmed:
> "Yes, there are colored bars showing both phases and sub-items in the Gantt chart area. Darker colored blocks represent phase timelines. Lighter blocks represent sub-item/task timelines within each phase."

### Conclusion
The Gantt chart rendering is working as designed. The reported issue may have been:
- A specific data issue with a particular project schedule
- A viewing/display issue in the PDF viewer
- Already fixed in a previous update

**No code changes required.**

---
*Last Updated: February 17, 2026*
*Status: GANTT CHART VERIFIED WORKING ✅*

---

## Transformer Test Report - Default Values Fix ✅ (Feb 17, 2026)
**Location:** `/app/frontend/src/pages/projects/TransformerTestReport.js`

### Issue
Default values of `417.5` were pre-populated in the Applied Primary Voltage fields for:
- TEST 4: Transformer Ratio Test
- TEST 5: Three Phase Magnetising Current Test

### Fix Applied
Removed hardcoded default values from 4 locations:

| Location | Before | After |
|----------|--------|-------|
| Initial `ratio_tests` array (line 140) | `applied_1u1v: '417.5'` | `applied_1u1v: ''` |
| Initial `magnetising_current_tests` array (line 145) | `applied_1u1v: '417.5'` | `applied_1u1v: ''` |
| Add Tap button handler (line 1372) | `applied_1u1v: '417.5'` | `applied_1u1v: ''` |
| Add Tap Position button handler (line 1455) | `applied_1u1v: '417.5'` | `applied_1u1v: ''` |

### Result
All Applied Primary Voltage fields (1U-1V, 1V-1W, 1W-1U) now start empty, allowing users to enter their own test values.

---
*Last Updated: February 17, 2026*
*Status: TRANSFORMER DEFAULT VALUES FIX COMPLETE ✅*

---

## Voltmeter & Ammeter Test Results Format Change ✅ (Feb 17, 2026)
**Files Modified:**
- `/app/frontend/src/pages/projects/EquipmentServiceReport.js` (UI)
- `/app/backend/routes/equipment_pdf.py` (PDF generation)

### Changes Made

**Old Format (Removed):**
- Two separate tables: "TEST RESULTS (Voltage/Current)" and "TEST RESULTS (Reading)"
- DUC Reading vs STD Reading layout
- Final/Initial/Difference rows with single Error %

**New Format (Implemented):**

#### Voltmeter - MEASUREMENT TEST
| PHASE REFERENCE | TEST METER READING (V) | STANDARD METER READING (V) | ERROR % | ERROR LIMIT % |
|-----------------|------------------------|---------------------------|---------|---------------|
| R-PHASE         |                        |                           |         | ±1.0          |
| Y-PHASE         |                        |                           |         | ±1.0          |
| B-PHASE         |                        |                           |         | ±1.0          |
| R&Y-PHASE       |                        |                           |         | ±1.0          |
| Y&B-PHASE       |                        |                           |         | ±1.0          |
| R&B-PHASE       |                        |                           |         | ±1.0          |

#### Ammeter - MEASUREMENT TEST
| PHASE REFERENCE | TEST METER READINGS (A) | STANDARD METER READINGS (A) | ERROR(%) | ERROR LIMIT (%) |
|-----------------|------------------------|---------------------------|---------|---------------|
| R-PHASE         |                        |                           |         | ±1.0          |
| Y-PHASE         |                        |                           |         | ±1.0          |
| B-PHASE         |                        |                           |         | ±1.0          |

### Technical Implementation
- Changed data model from nested objects to array format for flexibility
- Added handler functions: `handleVoltmeterMeasurementTestChange`, `handleAmmeterMeasurementTestChange`
- PDF generation includes backwards compatibility for old data format
- Default error limit set to ±1.0 for all rows

---
*Last Updated: February 17, 2026*
*Status: VOLTMETER & AMMETER FORMAT CHANGE COMPLETE ✅*

---

## Relay Calibration Report - New Tests Added ✅ (Feb 17, 2026)
**Files Modified:**
- `/app/frontend/src/pages/projects/EquipmentServiceReport.js` (UI)
- `/app/backend/routes/equipment_pdf.py` (PDF generation)

### New Sections Added

#### TEST 3: MASTER TRIP RELAY
- **Relay Details:** Make, Type, Serial No, Auxiliary Supply
- **Test Results Table:**
  | Parameter | Set Value | Measured Value | Status |
  |-----------|-----------|----------------|--------|
  | Pick-up Voltage | | | OK/NOT OK/N/A |
  | Drop-off Voltage | | | OK/NOT OK/N/A |
  | Operating Time | | | OK/NOT OK/N/A |
  | Contact Resistance | | | OK/NOT OK/N/A |
  | Coil Resistance | | | OK/NOT OK/N/A |
  | Insulation Resistance | | | OK/NOT OK/N/A |
- **Remarks** field
- **Enable/Disable Toggle** (Default: Disabled)

#### TEST 4: TRIP CIRCUIT SUPERVISION RELAY
- **Relay Details:** Make, Type, Serial No, Auxiliary Supply
- **Test Results Table:**
  | Parameter | Set Value | Measured Value | Status |
  |-----------|-----------|----------------|--------|
  | Pick-up Voltage | | | OK/NOT OK/N/A |
  | Drop-off Voltage | | | OK/NOT OK/N/A |
  | Operating Time | | | OK/NOT OK/N/A |
  | LED Indication Check | | | OK/NOT OK/N/A |
  | Alarm Contact Check | | | OK/NOT OK/N/A |
  | Coil Resistance | | | OK/NOT OK/N/A |
  | Insulation Resistance | | | OK/NOT OK/N/A |
- **Remarks** field
- **Enable/Disable Toggle** (Default: Disabled)

### Technical Implementation
- Added `relay_section_toggles` entries for both new tests
- Added data structures with relay_details and test_results arrays
- PDF generation includes both tests when enabled
- Data persistence on save and load for existing reports

---
*Last Updated: February 17, 2026*
*Status: RELAY CALIBRATION TESTS 3 & 4 COMPLETE ✅*

---

## Rebranding: Workhub → Smarthub ✅ (Feb 17, 2026)

### Brand Name Changes
| Location | Old Name | New Name |
|----------|----------|----------|
| App Title | Workhub Enerzia | Smarthub Enerzia |
| Sidebar | Workhub | Smarthub |
| Copyright | WorkHub Enerzia | Smarthub Enerzia |
| PWA Manifest | Workhub Enerzia | Smarthub Enerzia |
| Email Templates | Workhub Enerzia | Smarthub Enerzia |
| Password Reset | workhub.enerzia.com | smarthub.enerzia.com |

### Files Updated
**Frontend:**
- `/app/frontend/src/components/Layout.js`
- `/app/frontend/src/pages/Login.js`
- `/app/frontend/src/pages/ResetPassword.js`
- `/app/frontend/src/pages/Setup.js`
- `/app/frontend/src/pages/settings/ZohoIntegration.js`
- `/app/frontend/public/index.html`
- `/app/frontend/public/manifest.json`

**Backend:**
- `/app/backend/routes/zoho_integration.py`
- `/app/backend/routes/password_reset.py`
- `/app/backend/routes/customer_management.py`
- `/app/backend/routes/attendance_reports.py`
- `/app/backend/routes/travel_log.py`
- `/app/backend/server.py`
- `/app/backend/services/email_service.py`
- `/app/backend/tests/test_pre_deployment_stability.py`

### Deployment Target
**Custom Domain:** www.smarthub.enerzia.com

---
*Last Updated: February 17, 2026*
*Status: REBRANDING COMPLETE ✅ | READY FOR DEPLOYMENT*


---

## Lightning Arrestor Test Report - 4 Bug Fixes ✅ (Feb 18, 2026)
**Files Modified:**
- `/app/backend/routes/equipment_pdf.py` (PDF generation)
- `/app/frontend/src/pages/projects/EquipmentServiceReport.js` (UI)

### Issues Fixed

| Issue | Fix Applied |
|-------|-------------|
| **1. Duplicate TEST RESULTS in PDF** | Added `lightning-arrestor` to exclusion list in generic `create_test_results_section` call (line 3931-3932) |
| **2. Equipment Name/Location in PDF** | Removed "Equipment Name" and "Equipment Location" rows from equipment details (line 622-629) |
| **3. Date of Energization → Next Due On** | Renamed field label in both PDF (line 628) and UI (lines 1821-1842) |
| **4. Data missing on Edit** | Added `test_results` to the formData merge object (line 807-808) and fixed `overall_condition` → `overall_result` mapping (line 896-907) |

### Technical Details - Data Loading Fix

**Root Cause:** When editing a Lightning Arrestor report, the `test_results` array was not being merged from the saved report data into the form state. It was only being initialized from the template.

**Fix Applied (EquipmentServiceReport.js):**
```javascript
// Added to merge object (line 807-808)
test_results: reportData.test_results || prev.test_results,

// Added overall_condition to overall_result mapping (lines 896-907)
if (reportData.overall_condition) {
  const conditionMap = {
    'satisfactory': 'Satisfactory',
    'needs_attention': 'Needs Attention', 
    'critical': 'Critical'
  };
  merged.overall_result = conditionMap[reportData.overall_condition.toLowerCase()] || reportData.overall_condition;
}
```

### Testing Results
- Backend: 100% (8/8 tests passed)
- Frontend: 100% (all UI changes verified via screenshots)
- All fields now load correctly when editing: Test Results (IR value, Leakage Current), Checklist status, Overall Result, Remarks

---
*Last Updated: February 18, 2026*
*Status: LIGHTNING ARRESTOR FIXES COMPLETE ✅*


---

## HR & Payroll System - Phase 2 ✅ COMPLETE (Feb 20, 2026)

### Overview
Comprehensive HR & Payroll module for employee management, salary processing, advances, leave tracking, and overtime management.

### Phase 1 (Previously Completed)
- Employee Master Data with full statutory compliance
- Payroll Processing with EPF, ESIC, Professional Tax calculations
- Leave Balance management APIs

### Phase 2 Features (Completed Feb 20, 2026)

#### 1. Payslip PDF Generation ✅
**Location:** `/app/backend/routes/hr_payslip_pdf.py`

| Feature | Implementation |
|---------|---------------|
| **PDF Endpoints** | `GET /api/hr/payslip/{record_id}/pdf`, `GET /api/hr/payslip/{emp_id}/{month}/{year}/pdf` |
| **Professional Layout** | Company header, employee info, attendance summary, earnings/deductions side-by-side, net salary box |
| **Statutory Info** | Shows EPF, ESIC, Professional Tax deductions with employer contributions |
| **Color-coded** | Green for earnings, red for deductions, blue for net salary |
| **Auto-download** | Proper filename: `Payslip_{EmpName}_{Month}_{Year}.pdf` |

#### 2. Advances & Loans Management ✅
**Location:** `/app/frontend/src/pages/hr/AdvancesLoans.js`, `/app/backend/routes/hr_payroll.py`

| Feature | Implementation |
|---------|---------------|
| **Route** | `/hr/advances` |
| **Stats Cards** | Pending Approval, Active Loans, Outstanding Balance, Total Disbursed |
| **CRUD Operations** | Create, Approve, Reject advance requests |
| **EMI Tracking** | Shows repayment progress bar, paid EMIs / total EMIs |
| **Status Workflow** | pending → approved → active → completed |

**API Endpoints:**
- `GET /api/hr/advances` - List all advances
- `POST /api/hr/advances` - Create advance request
- `PUT /api/hr/advances/{id}/approve` - Approve advance
- `PUT /api/hr/advances/{id}/reject` - Reject advance

#### 3. Leave Dashboard ✅
**Location:** `/app/frontend/src/pages/hr/LeaveDashboard.js`

| Feature | Implementation |
|---------|---------------|
| **Route** | `/hr/leave-dashboard` |
| **Stats Cards** | Active Employees, Total CL/SL/EL Balance |
| **Employee Table** | Name, ID, Department, CL/SL/EL/CO individual balances |
| **Detail Panel** | Click employee to see breakdown (Total, Taken, Remaining) |
| **Visual Progress** | Progress bars showing leave usage |
| **Leave Types** | Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), Comp Off (CO) |

#### 4. Overtime Management ✅
**Location:** `/app/frontend/src/pages/hr/OvertimeManagement.js`, `/app/backend/routes/hr_payroll.py`

| Feature | Implementation |
|---------|---------------|
| **Route** | `/hr/overtime` |
| **Stats Cards** | Pending Approval, Total OT Hours, Total OT Amount, Employees with OT |
| **CRUD Operations** | Create, Edit, Delete, Approve, Reject overtime records |
| **Filters** | Month, Year, Status |
| **Rate Calculation** | Hours × Rate per hour = Amount |

**API Endpoints:**
- `GET /api/hr/overtime` - List overtime records
- `POST /api/hr/overtime` - Create overtime record
- `PUT /api/hr/overtime/{id}` - Update overtime record
- `PUT /api/hr/overtime/{id}/approve` - Approve overtime
- `PUT /api/hr/overtime/{id}/reject` - Reject overtime
- `DELETE /api/hr/overtime/{id}` - Delete overtime record
- `GET /api/hr/overtime/summary/{emp_id}` - Employee overtime summary

### Navigation Update
Added to HR & Admin sidebar:
- Advances & Loans
- Leave Dashboard
- Overtime Management

### Testing Results
- Backend: 100% (25/25 tests passed)
- Frontend: 100% (all features working)
- Test file: `/app/backend/tests/test_hr_phase2.py`
- Test report: `/app/test_reports/iteration_63.json`

### Bug Fixed During Implementation
- **API URL Issue:** Frontend HR pages were using `/api/hr/...` URLs causing double prefix `/api/api/hr/...`. Fixed by changing to `/hr/...` (axios baseURL already includes `/api`).

---
*Last Updated: February 20, 2026*
*Status: HR & PAYROLL PHASE 2 COMPLETE ✅*

---

## HR & Payroll System - Phase 3 ✅ COMPLETE (Feb 20, 2026)

### Overview
Phase 3 completes the core payroll functionality with attendance integration, bulk processing, lock/finalize, dashboard, and statutory reports.

### Phase 3 Features (Completed Feb 20, 2026)

#### 1. Attendance Integration ✅
**API:** `GET /api/hr/attendance-summary/{emp_id}?month=X&year=Y`

| Feature | Implementation |
|---------|---------------|
| **Auto LOP Calculation** | Fetches from `attendance` collection, calculates working days vs present days |
| **Working Days** | Excludes Sundays (configurable) |
| **Effective Present** | Full days + (half days × 0.5) |
| **LOP Days** | Working Days - Effective Present - Paid Leaves |

#### 2. Bulk Payroll Processing ✅
**APIs:**
- `POST /api/hr/payroll/preview` - Preview without saving
- `POST /api/hr/payroll/bulk-run` - Process and save all records

| Feature | Implementation |
|---------|---------------|
| **Preview Mode** | Shows calculated values before committing |
| **Attendance Integration** | Auto-fetches attendance data |
| **Overtime Inclusion** | Adds approved overtime to earnings |
| **Advance EMI** | Auto-deducts active advance EMIs |
| **Department Filter** | Process specific department only |

#### 3. Payroll Lock/Finalize ✅
**APIs:**
- `POST /api/hr/payroll/finalize/{month}/{year}` - Lock payroll
- `POST /api/hr/payroll/unlock/{month}/{year}` - Unlock for corrections

| Feature | Implementation |
|---------|---------------|
| **Status Workflow** | not_processed → processed → finalized |
| **Finalize** | Prevents further modifications |
| **Unlock** | Allows admin to reopen for corrections |
| **Audit Trail** | Records who finalized/unlocked and when |

#### 4. Monthly Payroll Dashboard ✅
**Route:** `/hr/payroll-dashboard`
**API:** `GET /api/hr/payroll/dashboard/{month}/{year}`

| Feature | Implementation |
|---------|---------------|
| **Summary Cards** | Total Gross, Net Payable, Deductions, Employee Count |
| **Deductions Breakdown** | EPF, ESIC, PT, LOP, Advance EMI |
| **Employer Contributions** | EPF (12%), ESIC (3.25%), Total CTC |
| **Department Breakdown** | Dept-wise employee count, gross, deductions, net |
| **MoM Comparison** | Gross/Net change % vs previous month |

#### 5. Statutory Reports ✅
**Route:** `/hr/statutory-reports`

| Report | API | Contents |
|--------|-----|----------|
| **EPF Report** | `GET /api/hr/reports/epf/{month}/{year}` | UAN, PF Account, EPF Wages, Employee EPF, Employer EPF, EPS, EDLI |
| **ESIC Report** | `GET /api/hr/reports/esic/{month}/{year}` | ESIC Number, ESIC Wages, Employee/Employer ESIC (gross ≤ ₹21,000) |
| **Professional Tax** | `GET /api/hr/reports/professional-tax/{month}/{year}` | TN PT deductions by employee |

**Features:**
- Summary totals for each report
- CSV export functionality
- Print-friendly layout
- Month/Year selector

### Navigation Updates
Added to HR & Admin sidebar:
- Payroll Dashboard (new)
- Payroll Records (existing)
- Statutory Reports (new)

### Testing Results
- Backend: 100% (18/18 tests passed)
- Frontend: 100% (all features working)
- Test file: `/app/backend/tests/test_hr_phase3.py`
- Test report: `/app/test_reports/iteration_64.json`

### Technical Notes
- LOP is calculated only when attendance records exist; otherwise assumes full LOP
- ESIC applies only when adjusted gross ≤ ₹21,000
- PT calculated on adjusted gross (after LOP deduction)
- Negative net salary possible if LOP exceeds gross

---

## Overtime System Integration ✅ COMPLETE (Feb 20, 2026)

### What Was Connected
Linked Employee Workspace Overtime Requests with HR Overtime Management and Payroll.

### Flow Diagram
```
Employee Workspace              HR Department              Payroll
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Submit OT        │ ───► │ Pending Requests │ ───► │ Approved OT      │
│ Request          │      │ Approve/Reject   │      │ Added to Salary  │
│ /employee/       │      │ Set Rate/Hour    │      │                  │
│ overtime-requests│      │ /hr/overtime     │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### Changes Made

| Component | Change |
|-----------|--------|
| **Employee API** | `/api/employee/overtime` now creates records in `hr_overtime` collection |
| **Employee UI** | Shows payroll amount for approved OT, info box explaining flow |
| **HR Overtime UI** | New tabs: All/Pending/Approved, shows source (Employee/HR Entry) |
| **Unified Collection** | Single `hr_overtime` collection used by both modules |
| **Payroll Integration** | Approved OT automatically included in salary calculations |

### API Endpoints Updated
- `POST /api/employee/overtime` - Employee submits OT request (status: pending)
- `PUT /api/employee/overtime/{id}/withdraw` - Employee withdraws pending request
- `GET /api/hr/overtime` - HR views all OT (includes employee requests)
- `PUT /api/hr/overtime/{id}/approve` - HR approves (triggers payroll inclusion)
- `PUT /api/hr/overtime/{id}/reject` - HR rejects

### Data Fields
```json
{
  "id": "uuid",
  "emp_id": "EMP001",
  "emp_name": "Employee Name",
  "date": "2026-02-20",
  "hours": 3.0,
  "rate_per_hour": 100,
  "amount": 300,
  "reason": "Project deadline",
  "project": "Project Name",
  "status": "pending|approved|rejected",
  "source": "employee_request|hr_entry",
  "user_id": "linked_user_id"
}
```

---

---

## Leave Management Enhancement ✅ COMPLETE (Feb 20, 2026)

### What Was Implemented
Full integration of Employee Leave Requests with HR Approval and Payroll.

### Workflow Integration Fix ✅ COMPLETE (Feb 20, 2026)

**Issue:** Employee requests from "My Workspace" were not properly flowing to "HR & Admin" for approval. Leave approval failed with "Leave request not found" error. There were duplicate UIs (`LeaveApprovals.js` and `LeaveDashboard.js`) causing confusion.

**Root Cause:** Backend approval endpoints only accepted MongoDB ObjectId format, but the frontend was passing string IDs from the serialized documents.

**Fixes Applied:**
| Component | Fix |
|-----------|-----|
| **Backend Endpoints** | Updated all approval endpoints (Leave, Permission, Transport, Expense) to handle both ObjectId and string 'id' formats |
| **UI Consolidation** | Removed redundant `Leave Approvals` menu item, merged functionality into `Leave Management` (LeaveDashboard.js) |
| **Pending Requests First** | LeaveDashboard now shows "Pending Requests" tab first for immediate action |
| **API Consistency** | All approval flows now use `employeeHubAPI` which correctly integrates with the unified collections |

**Backend Files Updated:**
- `/app/backend/routes/employee_hub.py` - Lines 391-413 (Leave), 260-295 (Permission), 343-387 (Transport), 553-595 (Expense)

**Frontend Files Updated:**
- `/app/frontend/src/pages/hr/LeaveDashboard.js` - Uses `employeeHubAPI`, shows pending first
- `/app/frontend/src/components/Layout.js` - Removed "Leave Approvals" menu item

**Testing:** All 16/16 backend tests passed, all frontend workflows verified working.

### Flow Diagram
```
Employee Workspace              HR Department              Payroll
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Submit Leave     │ ───► │ Pending Requests │ ───► │ LOP Deduction    │
│ Request          │      │ Approve/Reject   │      │ from Salary      │
│ (type, dates,    │      │                  │      │                  │
│  reason)         │      │ Auto-deduct from │      │                  │
│                  │      │ employee balance │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### New APIs Created

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hr/leave/dashboard` | GET | HR Leave Dashboard with stats, pending requests, dept breakdown |
| `/api/hr/leave/requests` | GET | All leave requests with filters |
| `/api/hr/leave/approve/{id}` | POST | Approve leave & auto-deduct from balance |
| `/api/hr/leave/reject/{id}` | POST | Reject leave request |
| `/api/hr/leave/employee-balance/{emp_id}` | GET | Detailed leave balance for employee |
| `/api/hr/leave/balance/{emp_id}/reset` | PUT | Reset leave balance for new year |
| `/api/hr/leave/calendar/{month}/{year}` | GET | Leave calendar (who's on leave each day) |

### Features

| Feature | Description |
|---------|-------------|
| **HR Dashboard** | Overview, Pending Requests, Employee Balances tabs |
| **Auto-Deduction** | Approved leaves auto-deduct from employee balance |
| **LOP Calculation** | When balance exhausted, excess marked as Loss of Pay |
| **Leave Types** | Casual (12), Sick (6), Earned (15), Comp Off (2) per year |
| **Low Balance Alert** | Shows employees with ≤5 days remaining |
| **Department Breakdown** | Leave statistics by department |
| **Type Breakdown** | Leave statistics by leave type |

### UI Updates
- **HR Leave Dashboard**: Complete redesign with tabs, stats, approve/reject actions
- **Employee Leave Page**: Added info box explaining flow, shows LOP info on approved leaves

### Integration with Payroll
- Approved leaves deduct from HR employee leave balance
- Excess leaves (beyond balance) marked as LOP days
- LOP days automatically deducted from monthly salary in payroll calculation

---
*Last Updated: February 20, 2026*

*Last Updated: February 20, 2026*


---
*Last Updated: February 20, 2026*
*Status: HR WORKFLOW INTEGRATION FIX COMPLETE ✅*


---

### Monthly Expense Claims Module ✅ COMPLETE (Feb 21, 2026)

**Location:**
- Frontend Employee: `frontend/src/pages/employee/ExpenseClaims.js`
- Frontend Finance: `frontend/src/pages/finance/ExpenseApprovals.js`
- Backend Employee: `backend/routes/employee_hub.py` - Lines 658-988
- Backend Finance: `backend/routes/finance_dashboard.py` - Lines 790-920

**Issue Addressed:** The Expense Claims module was incomplete. Users reported: 1) Receipt upload not working, 2) No view/edit functionality for expense items, 3) No submit button to send to finance, 4) Finance approval workflow not integrated.

**Solution Implemented:**

| Component | Implementation |
|-----------|---------------|
| **Monthly Expense Sheets** | Employees create monthly expense sheets with advance tracking and previous dues |
| **Expense Items** | Individual line items with date, project, bill type, description, amount, place, payment mode |
| **Receipt Attachment** | File upload for each expense item (supports jpg, png, pdf) via `/api/upload` |
| **View/Edit/Delete** | Full CRUD operations for expense items (only on draft/rejected sheets) |
| **Submit for Approval** | "Submit for Approval" button changes sheet status from draft to pending |
| **Finance Verification** | Finance dept can verify pending sheets |
| **Finance Approval** | Finance approves verified sheets |
| **Finance Rejection** | Finance can reject with reason (employee can edit and resubmit) |
| **Payment Recording** | Finance marks approved sheets as paid with payment details |

**Workflow:**
```
Employee                        Finance Department
┌──────────────────┐           ┌───────────────────────────────────┐
│ Create Sheet     │           │                                   │
│ (Month, Year,    │           │   Pending Sheets                  │
│  Advance, Dues)  │           │      ↓                            │
│       ↓          │           │   [Verify] → Verified             │
│ Add Expense Items│           │      ↓                            │
│ (Receipt Upload) │  ──────►  │   [Approve] → Approved            │
│       ↓          │  Submit   │      ↓                            │
│ Submit for       │           │   [Mark Paid] → Paid              │
│ Approval         │           │      or                           │
│                  │  ◄──────  │   [Reject] → Rejected (resubmit)  │
└──────────────────┘  Rejected └───────────────────────────────────┘
```

**API Endpoints (Employee):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employee/expense-sheets` | POST | Create new monthly expense sheet |
| `/api/employee/expense-sheets` | GET | Get user's expense sheets |
| `/api/employee/expense-sheets/{id}` | GET | Get sheet details |
| `/api/employee/expense-sheets/{id}` | PUT | Update sheet (draft only) |
| `/api/employee/expense-sheets/{id}/add-item` | POST | Add expense item |
| `/api/employee/expense-sheets/{id}/item/{index}` | DELETE | Delete expense item |
| `/api/employee/expense-sheets/{id}/submit` | PUT | Submit for approval |
| `/api/employee/expense-sheets/summary/{user_id}` | GET | Get expense summary |

**API Endpoints (Finance):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/expense-sheets` | GET | Get all submitted sheets |
| `/api/finance/expense-sheets/{id}` | GET | Get sheet details |
| `/api/finance/expense-sheets/{id}/verify` | PUT | Verify expense sheet |
| `/api/finance/expense-sheets/{id}/approve` | PUT | Approve verified sheet |
| `/api/finance/expense-sheets/{id}/reject` | PUT | Reject with reason |
| `/api/finance/expense-sheets/{id}/pay` | PUT | Mark as paid with details |

**Frontend Features:**
| Feature | Location | Description |
|---------|----------|-------------|
| Summary Cards | ExpenseClaims.js | Total Claimed, Total Paid, Pending, Balance Due |
| Current Sheet | ExpenseClaims.js | Current month's sheet with items table |
| All Sheets History | ExpenseClaims.js | Historical sheets with expandable details |
| Status Badges | Both | Color-coded badges (draft, pending, verified, approved, rejected, paid) |
| Receipt Upload | ExpenseClaims.js | Photo/PDF upload in add/edit item modal |
| View Modal | ExpenseClaims.js | View expense item details |
| Edit Modal | ExpenseClaims.js | Edit expense item (draft only) |
| Finance Stats | ExpenseApprovals.js | Pending count, Verified count, Approved count, Paid count |
| Approval Actions | ExpenseApprovals.js | Verify, Approve, Reject, Mark Paid buttons |
| Payment Modal | ExpenseApprovals.js | Record payment mode, reference, amount |

**Database Collection:** `expense_sheets`
```json
{
  "id": "uuid",
  "sheet_no": "EXP-2026-0001",
  "user_id": "user_id",
  "user_name": "Employee Name",
  "department": "Department",
  "month": 2,
  "year": 2026,
  "month_name": "February",
  "items": [
    {
      "date": "2026-02-15",
      "project_name": "Customer Project",
      "bill_type": "Travel - Bus/Auto/Cab",
      "description": "Site visit",
      "amount": 500,
      "place": "Chennai",
      "mode": "Cash",
      "receipt_url": "/api/uploads/expense_receipts/xxx.pdf"
    }
  ],
  "total_amount": 5000,
  "advance_received": 2000,
  "previous_due": 500,
  "net_claim_amount": 3500,
  "status": "draft|pending|verified|approved|rejected|paid",
  "submitted_at": "ISO timestamp",
  "verified_by": "Finance Name",
  "approved_by": "Finance Manager",
  "paid_amount": 3500,
  "payment_mode": "Bank Transfer",
  "payment_reference": "TXN123456"
}
```

**Testing:** 100% pass rate - 19/19 backend tests, all frontend workflows verified.

---
*Last Updated: February 21, 2026*
*Status: MONTHLY EXPENSE CLAIMS MODULE COMPLETE ✅*

---

### Advance Payment Management ✅ COMPLETE (Feb 21, 2026)

**Location:**
- Frontend Employee: `frontend/src/pages/employee/ExpenseClaims.js` (Advance Balance section, Request modal, History modal)
- Frontend Finance: `frontend/src/pages/finance/ExpenseApprovals.js` (Advance Management tab)
- Backend Employee: `backend/routes/employee_hub.py` - Lines 185-265 (Advance Request endpoints)
- Backend Finance: `backend/routes/finance_dashboard.py` - Lines 960-1180 (Advance Management endpoints)

**Feature Overview:** Complete advance payment management system where employees can request advances and Finance can approve, record payments, and track running balances.

**Workflow:**
```
Employee                           Finance Department
┌─────────────────────┐           ┌──────────────────────────────────┐
│ View Advance Balance│           │  View Pending Requests           │
│ (Running Balance)   │           │        ↓                         │
│       ↓             │           │  [Approve] or [Reject]           │
│ Request Advance     │  ───────► │        ↓                         │
│ (Amount, Purpose,   │  Request  │  [Record Payment]                │
│  Project)           │           │  (Amount, Date, Mode, Reference) │
│       ↓             │           │        ↓                         │
│ View History        │  ◄─────── │  Employee Balance Updated        │
│ (Transactions)      │  Balance  │                                  │
└─────────────────────┘           │  OR                              │
                                  │  [Record Direct Advance]         │
                                  │  (for urgent/walk-in cases)      │
                                  └──────────────────────────────────┘

Running Balance = Total Advances Paid - Total Advances Used in Expense Sheets
```

**API Endpoints (Employee):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employee/advance-requests` | POST | Request new advance |
| `/api/employee/advance-requests` | GET | Get my advance requests |
| `/api/employee/advance-requests/{id}` | DELETE | Withdraw pending request |
| `/api/employee/advance-balance/{user_id}` | GET | Get my running balance |

**API Endpoints (Finance):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/advance-requests` | GET | Get all advance requests |
| `/api/finance/advance-requests/{id}/approve` | PUT | Approve request |
| `/api/finance/advance-requests/{id}/reject` | PUT | Reject request |
| `/api/finance/advance-requests/{id}/pay` | PUT | Record payment |
| `/api/finance/advances/direct` | POST | Record direct advance |
| `/api/finance/advances/employee/{user_id}` | GET | Employee advance history |
| `/api/finance/advances/balances` | GET | All employee balances |

**Frontend Features:**
| Feature | Location | Description |
|---------|----------|-------------|
| Advance Balance Card | ExpenseClaims.js | Shows running balance, received, used |
| Request Advance Modal | ExpenseClaims.js | Form for amount, purpose, project |
| Advance History Modal | ExpenseClaims.js | Transaction history, balance breakdown |
| Advance Management Tab | ExpenseApprovals.js | New tab for advance workflow |
| Pending Requests List | ExpenseApprovals.js | Approve/Reject buttons |
| Payment Recording Modal | ExpenseApprovals.js | Payment details form |
| Direct Advance Modal | ExpenseApprovals.js | Record walk-in advances |
| Employee Balances Table | ExpenseApprovals.js | All employees with outstanding advances |

**Database Collection:** `advance_requests`
```json
{
  "id": "uuid",
  "user_id": "user_id",
  "user_name": "Employee Name",
  "emp_id": "EMP001",
  "department": "Engineering",
  "amount": 5000,
  "purpose": "Site visit expenses",
  "project_name": "Project Name",
  "remarks": "Additional notes",
  "status": "pending|approved|rejected|paid",
  "requested_at": "ISO timestamp",
  "approved_by": "Finance User",
  "approved_at": "ISO timestamp",
  "rejected_by": null,
  "rejection_reason": null,
  "paid_amount": 5000,
  "payment_date": "2026-02-21",
  "payment_mode": "Bank Transfer",
  "payment_reference": "TXN123456",
  "paid_by": "Finance User",
  "is_direct_payment": false
}
```

**Testing:** 100% pass rate - 24/24 backend tests, all frontend workflows verified.

---
*Last Updated: February 21, 2026*
*Status: ADVANCE PAYMENT MANAGEMENT COMPLETE ✅*

---

## Known Issue - Production Environment

### Email Sender Name (SMTP_FROM_NAME) ⚠️
**Status:** Requires manual user action in production

**Issue:** Password reset emails in production show "Workhub Enerzia" instead of "Smarthub Enerzia"

**Root Cause:** The `SMTP_FROM_NAME` environment variable in the production deployment settings was not updated during redeployment.

**Fix Required:**
1. Go to Emergent deployment settings
2. Navigate to "Environment Variables"
3. Update `SMTP_FROM_NAME` value to `Smarthub Enerzia`
4. Re-deploy the application

**Note:** Preview environment is working correctly - this is a production-only issue.

---
*Last Updated: February 21, 2026*

---

## Sales Order to Project Integration ✅ COMPLETE (Feb 22, 2026)

### Order Handoff Module
**Location:** 
- Frontend: `/app/frontend/src/pages/projects/OrderHandoff.js`
- Backend: `/app/backend/routes/project_orders.py`
- Route: `/projects/order-handoff`

**Purpose:** Bridge between Sales and Projects departments - allows Projects team to view confirmed sales orders and create projects from them.

**Dashboard Stats:**
| Stat | Description |
|------|-------------|
| **Pending Orders** | Count and total value of confirmed orders without linked projects |
| **Active Projects** | Number of active projects created from orders |
| **This Week Billing** | Total weekly billing amount for order-linked projects |
| **This Month** | Number of projects created from orders this month |

**Features:**
| Feature | Description |
|---------|-------------|
| **Pending Orders Tab** | List of confirmed orders waiting for project assignment with "Create Project" buttons |
| **All Orders Status Tab** | Table view showing order-to-project mapping with PID, status, and completion % |
| **Create Project Modal** | Pre-fills order details (customer, value, category), allows budget allocation, engineer selection, dates |
| **Search/Filter** | Filter orders by order number, customer name, or PID |
| **Refresh** | Manual refresh button to reload all data |

**Create Project Modal Fields:**
- Order Summary (Customer, Order Value, Category)
- Project Budget Allocation
- Project Type (PSS, AS, OSS, CS)
- Engineer in Charge (from Projects team)
- Estimated Start Date
- Target Completion Date
- Notes

**Workflow:**
```
Sales Order (Confirmed) → Order Handoff Dashboard → Create Project → Project Created (PID generated)
     ↓                                                                       ↓
Order Status: pending  →  Order Status: processing  →  Project Status: Need to Start
```

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/project-orders/dashboard` | GET | Dashboard stats (pending count, active projects, billing) |
| `/api/project-orders/pending-orders` | GET | Orders without linked projects |
| `/api/project-orders/orders-with-projects` | GET | All orders with project assignment status |
| `/api/project-orders/create-project-from-order` | POST | Create project from order |
| `/api/project-orders/weekly-billing` | POST | Record weekly billing entry |
| `/api/project-orders/weekly-billing/{project_id}` | GET | Billing history for a project |
| `/api/project-orders/weekly-billing/summary/current-week` | GET | Current week billing summary |
| `/api/project-orders/project/{project_id}/order-details` | GET | Project with linked order details |

**Database Updates:**
- When project is created from order:
  - Order status updated to `processing`
  - Order gets `project_id` and `project_pid` fields
  - Project gets `linked_order_id` and `linked_order_no` fields
  - `order_lifecycle` collection updated with project link
  - Notification created for Projects department

**Testing:** 100% pass rate (26/26 backend tests, all frontend workflows verified)

---
*Last Updated: February 22, 2026*
*Status: SALES ORDER TO PROJECT INTEGRATION COMPLETE ✅*


---

## Sales → Projects Workflow Update (Feb 22, 2026)

### Changes Made Per User Requirements:

#### 1. Order Handoff - Simplified Create Project Modal
**Before:** Modal had Budget Allocation, Project Type, Engineer, Dates, Notes
**After:** Modal only has Engineer in Charge (required) + Notes (optional)

**Why:** Budget allocation is managed by Sales in Order Management. Projects will be linked after creation.

#### 2. Project Management - Redesigned with Accordion Status Groups
**Route:** `/projects/lifecycle`

**Status Groups (Accordion Style):**
| Status | Icon | Color |
|--------|------|-------|
| Need to Start | Clock | Amber |
| Ongoing | PlayCircle | Blue |
| Completed | CheckCircle | Green |
| Invoiced | Receipt | Emerald |
| Partially Invoiced | Receipt | Purple |
| Cancelled | AlertCircle | Red |

**Edit Project Modal Fields:**
- Status dropdown (Quick Update)
- Project Date
- Target Completion
- Work Summary / Line Items (with Upload Excel, Add Item)

#### 3. Order Lifecycle - Link Project Feature
**Location:** Order Details panel in Order Lifecycle page

**Workflow:**
```
Sales → Order Details → Click "Link Project" → Select existing project → Link
```

**API:** `POST /api/order-lifecycle/orders/{order_id}/link-project`

**What it does:**
- Lists unlinked projects from Projects department
- Links selected project to the order
- Updates both project and order with cross-references

### Complete Updated Workflow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SALES → PROJECTS COMPLETE WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────────┘

1. SALES creates Order (Order/FY/number format)
   → Budget configured in Order Management
         │
         ▼
2. PROJECTS sees order in Order Handoff Dashboard
   → Views pending orders with "Create Project" button
         │
         ▼
3. PROJECTS clicks "Create Project"
   → Only assigns Engineer in Charge
   → Project created with auto-generated PID
   → Budget inherited from order
         │
         ▼
4. Project appears in:
   • Projects & Services (/projects)
   • Project Management (/projects/lifecycle) - in "Need to Start" accordion
         │
         ▼
5. SALES can link project in Order Lifecycle
   → Order Details → "Link Project" button
   → Selects the project created by Projects dept
         │
         ▼
6. Project manager uses Project Management
   → Changes status (Need to Start → Ongoing → Completed)
   → Updates dates, work items
         │
         ▼
7. Payment Requests (/projects/payment-requests)
   → Projects raises payment requests for materials/expenses
   → Finance reviews → CEO approves → Payment made
         │
         ▼
8. Track in Order Lifecycle
   → Expense tracking
   → Profitability analysis
```

**Testing:** 100% pass rate (25/25 backend tests, all frontend verified)

---
*Last Updated: February 22, 2026*
*Status: WORKFLOW UPDATE COMPLETE ✅*


---

## Streamlined Sales → Projects Workflow (Feb 22, 2026) - Option D Implemented

### What Changed:

#### ✅ KEPT - Order Handoff (Enhanced)
**Route:** `/projects/order-handoff`
**Owner:** Projects Department

Enhanced Create Project modal now includes:
| Field | Description |
|-------|-------------|
| Customer | Editable, pre-filled from order |
| Location | Project location |
| Category | PSS, AS, OSS, CS, AMC, CAL |
| Vendor | Default: Enerzia |
| Project Name | Auto-generated, editable |
| Engineer in Charge | Required dropdown |
| Team Members | Add multiple team members |
| Project Actions | Scope of work description |
| Work Items | **Derived from quotation** - pre-filled line items with qty, unit, rate |
| Notes | Additional notes |

#### ✅ KEPT - Project Management (Accordion Style)
**Route:** `/projects/lifecycle`
**Owner:** Projects Department

Groups by status: Need to Start → Ongoing → Completed → Invoiced → Partially Invoiced → Cancelled

#### ❌ REMOVED - Link Project Button
**From:** Order Lifecycle (Sales view)
**Why:** Projects dept is the sole owner of project creation

#### ✅ UPDATED - Order Lifecycle Project Status (Read-Only)
**Route:** `/sales/order-lifecycle` 
**Owner:** Sales Department (view only)

Sales can now ONLY VIEW (not edit) project status:
- PID number
- Status badge (Need to Start, Ongoing, Completed, etc.)
- **Completion %** with progress bar
- **Budget vs Actual Expenses**
- Engineer in Charge

### Final Streamlined Workflow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STREAMLINED SALES → PROJECTS WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────────────────┘

                  SALES DEPARTMENT                    PROJECTS DEPARTMENT
                        │                                    │
                        ▼                                    │
              ┌─────────────────┐                            │
              │ Create Order    │                            │
              │ Configure Budget│                            │
              └────────┬────────┘                            │
                       │                                     │
                       │ Order Confirmed                     │
                       │                                     │
                       ▼                                     ▼
              ┌─────────────────┐               ┌─────────────────────────┐
              │ Order Lifecycle │               │  Order Handoff          │
              │ (Track Status)  │◄──────────────│  - View pending orders  │
              └────────┬────────┘   Automatic   │  - Create Project       │
                       │            Link        │  - Assign Engineer/Team │
                       │                        │  - Set Work Items       │
                       │                        └───────────┬─────────────┘
                       │                                    │
                       ▼                                    ▼
              ┌─────────────────┐               ┌─────────────────────────┐
              │ VIEW ONLY:      │               │  Project Management     │
              │ - Project PID   │               │  - Update Status        │
              │ - Completion %  │               │  - Track Progress       │
              │ - Budget/Actual │               │  - Manage Work Items    │
              └─────────────────┘               └───────────┬─────────────┘
                                                           │
                                                           ▼
                                               ┌─────────────────────────┐
                                               │  Payment Requests       │
                                               │  - Raise for materials  │
                                               │  - Finance → CEO flow   │
                                               └─────────────────────────┘
```

### Key Metrics Tracked:
1. **Project Completion %** - Visible in both Order Lifecycle and Project Management
2. **Budget vs Actual Expenses** - Sales tracks in Order Lifecycle, Projects manages in Project Management

**Testing:** 100% pass rate (36/36 backend tests passed, 8 skipped due to no pending orders)

---
*Last Updated: February 22, 2026*
*Status: WORKFLOW STREAMLINED ✅*


---

## Weekly Billing & Menu Updates (Feb 22, 2026)

### 1. Weekly Billing Feature
**Route:** `/projects/weekly-billing`

**Purpose:** Project Managers submit weekly billing entries for ongoing projects.

**Features:**
| Feature | Description |
|---------|-------------|
| Current Week Display | Shows week date range (Mon-Sun) |
| Stats | Ongoing Projects count, This Week Billing total, Entries count |
| Project List | Filtered by status, search by PID/client |
| Add Billing Modal | Amount, Completion %, Work Description, Remarks |

**API Endpoints:**
- `GET /api/project-orders/weekly-billing/summary/current-week`
- `POST /api/project-orders/weekly-billing`

### 2. Menu Updates
**Order Summary** (renamed from Order Handoff):
- Moved to TOP of Projects menu (below Dashboard)
- Shows orders from Sales, allows creating projects

**Payment Requests**:
- Added to Projects menu
- Route: `/projects/payment-requests`

### 3. Payment Request Flow
```
Projects → New Payment Request → Finance Review → CEO Approval → Paid
```

**Categories:** Site Expenses, Material Purchase, Vendor Payment, Transport, Employee Expenses, etc.

**Testing:** 100% pass rate (all backend APIs and frontend UIs verified)

---
*Last Updated: February 22, 2026*
*Status: WEEKLY BILLING & MENU UPDATES COMPLETE ✅*


---

## Project Management Revamp (Feb 22, 2026)

### Revamped Project Management Page
**Route:** `/projects/lifecycle`

**Design:** Now matches Order Management style with:

**1. Dashboard Tab:**
| Stat | Description |
|------|-------------|
| Total Projects | Count of all projects |
| Need to Start | Projects waiting to begin |
| Ongoing | Projects in progress |
| Completed | Finished projects (Completed, Invoiced, Paid, Closed) |
| Budget Summary | Total Budget, Total Expenses, Budget Utilization % |
| Profit Summary | Total Profit, Margin % |

**2. Projects Tab:**
| Feature | Description |
|---------|-------------|
| Pipeline Workflow | Need to Start → Ongoing → Completed → Invoiced → Paid → Closed |
| Budget Tracking | Budget, Expenses, Balance, Profit per project |
| Over Budget Alert | Red badge when expenses exceed budget |
| Linked Order | Shows linked order number (from Order Summary) |
| Completion Progress | Progress bar with percentage |
| Action Buttons | View Details, Payment Request, Material Request, Delivery Request |

**3. Action Buttons:**
| Button | Icon | Action |
|--------|------|--------|
| View Details | Eye | Opens project details modal |
| Payment Request | Credit Card | Navigates to `/projects/payment-requests?project_id=...` |
| Material Request | Package | Navigates to `/purchase/requirements?project_id=...` |
| Delivery Request | Truck | Future feature |

**4. View Details Modal:**
- Project info (PID, Client, Status, Category, Engineer, Location)
- Budget & Expenses (Budget, Expenses, Balance, Invoiced)
- Completion Progress bar
- Quick action buttons

### "+Add Project" Button Kept
**Location:** Projects & Services (`/projects`)
**Purpose:** Create standalone internal projects (not linked to orders)

### Complete Projects Module Summary

| Page | Route | Purpose |
|------|-------|---------|
| **Order Summary** | `/projects/order-handoff` | View orders from Sales, create projects |
| **Projects & Services** | `/projects` | List all projects, +Add Project for standalone |
| **Project Management** | `/projects/lifecycle` | Track projects with pipeline, budget, actions |
| **Weekly Billing** | `/projects/weekly-billing` | Submit weekly billing entries |
| **Payment Requests** | `/projects/payment-requests` | Create payment requests |
| **Work Planner** | `/projects/work-schedule` | Schedule work |
| **AMC Management** | `/projects/amc-management` | Manage AMC contracts |

**Testing:** 100% pass rate (all features verified)

---
*Last Updated: February 22, 2026*
*Status: PROJECT MANAGEMENT REVAMP COMPLETE ✅*



---

## Project Schedule Bug Fixes ✅ COMPLETE (Feb 24, 2026)
**Location:** `/app/frontend/src/pages/projects/ProjectSchedule.js`, `/app/backend/routes/project_schedules.py`

### Issues Fixed

| Bug | Status | Fix Applied |
|-----|--------|-------------|
| **1. Date Format (DD-MM-YYYY)** | ✅ FIXED | `formatDate` function (line 401-431) correctly converts YYYY-MM-DD to DD-MM-YYYY for display |
| **2. Data Missing on Edit (Project, Dates)** | ✅ FIXED | `handleEdit` function (line 271-325) enhanced with multi-format project matching |
| **3. Escalation Matrix Not Saving** | ✅ FIXED | Backend PUT endpoint (line 150) now correctly saves empty arrays |

### Technical Details

**1. Date Format Fix:**
- The `formatDate` function handles multiple input formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
- Outputs dates consistently in DD-MM-YYYY format for display
- The DatePicker component displays DD-MM-YYYY while storing YYYY-MM-DD for backend

**2. Project Matching in handleEdit:**
```javascript
// Matches project by:
// 1. Direct ID match (UUID)
// 2. PID string match (e.g., 'PID-25-26-017')
// 3. Normalized PID match (handles leading zeros)
```

**3. Escalation Matrix Persistence:**
- Backend PUT endpoint now includes logic to save empty arrays
- Frontend loads defaultEscalationMatrix if saved matrix is empty

### Test Results
- **Backend:** 100% (9/9 tests passed)
- **Frontend:** 100% (all UI tests passed)
- Test file: `/app/backend/tests/test_project_schedule_bugs.py`

### Verified Features
- ✅ Date format DD-MM-YYYY in schedule list
- ✅ Date format DD-MM-YYYY in edit modal date pickers
- ✅ Project dropdown selection when editing
- ✅ Customer info fields population when editing
- ✅ Start/End date population when editing
- ✅ Phases data population when editing
- ✅ Escalation matrix data persistence (create, save, reload)

---
*Last Updated: February 24, 2026*
*Status: PROJECT SCHEDULE BUG FIXES COMPLETE ✅*

---

## Project Schedule UI Enhancements ✅ COMPLETE (Feb 24, 2026)
**Location:** `/app/frontend/src/pages/projects/ProjectSchedule.js`

### Features Implemented

| Feature | Description |
|---------|-------------|
| **1. Escalation Matrix Team Member Dropdown** | Each escalation level (1-4) now has a dropdown to select team members. Selecting a member auto-fills Name, Designation, Email, and Mobile fields. |
| **2. Wider Phase Date Fields** | Increased date picker width from `w-28` (112px) to `w-36` (144px) for better visibility of DD-MM-YYYY format. |

### Technical Details

**Team Member Dropdown:**
- Fetches team members from all departments (projects, sales, accounts, hr, purchase, finance, operations, exports)
- Removes duplicates by ID
- Shows member name and designation in dropdown options
- `handleTeamMemberSelect()` function auto-fills: name, designation, email, phone (as mobile)

**Phase Date Fields:**
- Date pickers now have `className="w-36 h-8"` (previously `w-28`)
- Phase name input has `min-w-[150px]` to prevent shrinking
- Items count has `whitespace-nowrap` to prevent text wrapping

### API Endpoints Used
- `GET /api/departments/{dept}/team` - Fetches team members for each department

---
*Last Updated: February 24, 2026*
*Status: PROJECT SCHEDULE ENHANCEMENTS COMPLETE ✅*



---

## Zoho Books Quotations - Two-Way Sync ✅ IMPLEMENTED (Feb 24, 2026)
**Location:** 
- Backend: `/app/backend/routes/zoho_integration.py`
- Frontend: `/app/frontend/src/pages/sales/ZohoQuotationsTab.js`, `/app/frontend/src/pages/sales/Quotations.js`

### Features Implemented

| Feature | Description |
|---------|-------------|
| **View Zoho Quotations** | New tab in Sales > Quotations to view all synced Zoho estimates |
| **Create Quotations** | Create new quotations directly in Zoho Books from ERP |
| **Edit Quotations** | Modify existing Zoho quotations with line items |
| **Delete Quotations** | Remove quotations from Zoho Books |
| **Send via Email** | Email quotations to customers through Zoho |
| **Mark Status** | Mark quotations as Accepted or Declined |
| **Convert to Order** | Convert accepted Zoho quotes to ERP Sales Orders |

### Technical Details

**OAuth Scope Updated:**
```
ZohoBooks.estimates.READ
ZohoBooks.estimates.CREATE
ZohoBooks.estimates.UPDATE
ZohoBooks.estimates.DELETE
```

**API Endpoints Added:**
- `POST /api/zoho/sync/estimates` - Sync estimates from Zoho
- `GET /api/zoho/estimates` - Get synced estimates
- `GET /api/zoho/estimates/{id}` - Get estimate details
- `POST /api/zoho/estimates` - Create new estimate in Zoho
- `PUT /api/zoho/estimates/{id}` - Update estimate in Zoho
- `DELETE /api/zoho/estimates/{id}` - Delete estimate from Zoho
- `POST /api/zoho/estimates/{id}/send` - Send estimate via email
- `POST /api/zoho/estimates/{id}/mark-as-accepted` - Mark as accepted
- `POST /api/zoho/estimates/{id}/mark-as-declined` - Mark as declined
- `POST /api/zoho/estimates/{id}/convert-to-order` - Convert to ERP order

### Convert to Order Flow
When a Zoho quotation is converted to an ERP order:
1. Fetches full estimate details from Zoho (including line items)
2. Creates new Sales Order in ERP with:
   - Auto-generated order number (SO-{FY}-{seq})
   - Customer details from Zoho
   - Line items mapped from Zoho estimate
   - GST calculations
   - Zoho estimate ID linked for reference
3. Order enters Order Lifecycle Management workflow

### User Action Required
⚠️ **Re-authorization Needed:** User must re-authorize with Zoho Books to grant new permissions for estimates. Go to Settings > Zoho Integration and click "Re-authorize with Zoho".

---
*Last Updated: February 24, 2026*
*Status: ZOHO QUOTATIONS TWO-WAY SYNC IMPLEMENTED ✅*
