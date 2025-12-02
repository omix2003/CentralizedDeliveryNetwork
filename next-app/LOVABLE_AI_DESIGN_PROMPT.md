# Design Prompt for Lovable AI - Centralized Delivery Network Platform

## 🎯 Project Overview

Design a comprehensive **Centralized Delivery Network Platform** - a full-stack web application that unifies multiple food delivery partners (like Swiggy, Zomato, etc.) with a single network of delivery agents. This is a three-sided marketplace platform with distinct interfaces for **Agents**, **Partners**, and **Admins**.

**Core Concept**: Instead of delivery agents needing multiple apps (one for each delivery platform), they use ONE unified app. Partners integrate via REST APIs to get instant agent assignment for their delivery orders.

---

## 👥 User Roles & Access

The application has **three distinct user types**, each with their own dashboard and features:

### 1. **AGENT** (Delivery Personnel)
- Mobile-first interface (responsive design)
- Access: `/agent/*` routes
- Primary workflow: Go online → Receive order offers → Accept orders → Complete deliveries

### 2. **PARTNER** (Business/Platform Integration)
- Desktop-optimized dashboard
- Access: `/partner/*` routes
- Primary workflow: Create orders via API/Dashboard → Track deliveries → View analytics

### 3. **ADMIN** (Platform Administrators)
- Full-featured desktop dashboard
- Access: `/admin/*` routes
- Primary workflow: Monitor system → Manage agents & partners → Oversee operations

**Authentication**: Role-based access control with NextAuth.js. Users are redirected to their role-specific dashboard upon login.

---

## 🎨 Design System Requirements

### Color Scheme
- **Primary**: Professional blue (#2563EB or similar) - trust, reliability
- **Success**: Green (#10B981) - completed orders, online status
- **Warning**: Amber (#F59E0B) - pending actions, alerts
- **Error**: Red (#EF4444) - cancellations, errors
- **Neutral**: Gray scale for backgrounds, text, borders

### Typography
- **Headings**: Bold, clear hierarchy (H1-H6)
- **Body**: Readable sans-serif (Inter, Roboto, or system font)
- **Code/API**: Monospace for API keys, technical data

### UI Components Style
- **Modern & Clean**: Minimalist design with clear visual hierarchy
- **Card-based Layout**: Use cards for orders, metrics, and information blocks
- **Responsive**: Mobile-first for Agent interface, desktop-optimized for Partner/Admin
- **Real-time Indicators**: Visual feedback for live updates (badges, animations, status indicators)
- **Loading States**: Skeleton loaders for better UX
- **Toast Notifications**: Non-intrusive notifications for actions

---

## 📱 Feature Breakdown by Role

### **AGENT INTERFACE** (`/agent`)

#### Dashboard Layout
- **Header**: 
  - Agent name/avatar
  - Online/Offline toggle (large, prominent switch)
  - Current earnings summary
  - Notification bell icon
  
- **Main Content Area**:
  - **Status Card**: Current status (OFFLINE/ONLINE/ON_TRIP), rating, total orders
  - **Active Order Card** (if ON_TRIP): 
    - Order details (pickup/drop locations)
    - Map view with route
    - Status buttons (Picked Up → Out for Delivery → Delivered)
    - Timer showing delivery time
  - **Available Orders List** (if ONLINE):
    - Scrollable list of order cards
    - Each card shows: Distance, Payout amount, Pickup/Drop addresses, Time estimate
    - Accept/Reject buttons on each card
    - Real-time updates (new orders appear automatically)

- **Bottom Navigation** (mobile):
  - Home/Dashboard
  - Orders History
  - Profile
  - Earnings

#### Key Pages:
1. **Dashboard** (`/agent/dashboard`)
   - Main hub with status toggle and order management

2. **Profile** (`/agent/profile`)
   - Personal information
   - Vehicle type selection
   - Document upload (License, Vehicle Registration, ID Proof)
   - KYC status indicator
   - Performance metrics (rating, acceptance rate, completed orders)

3. **Orders History** (`/agent/orders`)
   - List of all past orders
   - Filter by status, date
   - Order details with timeline

4. **Earnings** (`/agent/earnings`)
   - Daily/Weekly/Monthly earnings breakdown
   - Payout history
   - Charts showing earnings trends

#### Design Notes for Agent:
- **Mobile-optimized**: Large touch targets, easy-to-read text
- **High Contrast**: Important actions (Accept Order) should stand out
- **Status Visibility**: Online/Offline status should be immediately visible
- **Real-time Feel**: Smooth animations for new order notifications
- **Map Integration**: Embedded Mapbox map for active orders showing route

---

### **PARTNER INTERFACE** (`/partner`)

#### Dashboard Layout
- **Header**:
  - Company name
  - API key display (with copy button)
  - Webhook configuration link
  - Logout

- **Sidebar Navigation**:
  - Dashboard Overview
  - Create Order
  - Active Orders
  - Order History
  - Analytics
  - Settings

- **Main Content Area**:
  - **Metrics Cards**: Total orders, Active orders, Completed today, Average delivery time
  - **Recent Orders Table**: Quick view of latest orders with status
  - **Quick Actions**: Create New Order button

#### Key Pages:
1. **Dashboard** (`/partner/dashboard`)
   - Overview metrics
   - Recent activity
   - Quick stats

2. **Create Order** (`/partner/orders/create`)
   - Form with:
     - Pickup location (address input + map picker)
     - Drop location (address input + map picker)
     - Payout amount
     - Priority level (HIGH/NORMAL/LOW)
   - Preview map showing route
   - Submit button

3. **Active Orders** (`/partner/orders/active`)
   - List of all active orders (SEARCHING_AGENT, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY)
   - Each order shows:
     - Order ID
     - Status badge
     - Agent info (if assigned)
     - Real-time map tracking (if agent is on trip)
     - Estimated/Actual delivery time

4. **Order Tracking** (`/partner/orders/[id]`)
   - Detailed order view
   - Full-screen map with:
     - Pickup marker
     - Drop marker
     - Agent location (real-time, if assigned)
     - Route visualization
   - Status timeline
   - Order details sidebar

5. **Order History** (`/partner/orders/history`)
   - Filterable table (by date, status, agent)
   - Export functionality
   - Search capability

6. **Analytics** (`/partner/analytics`)
   - Charts showing:
     - Orders over time (line chart)
     - Order status distribution (pie chart)
     - Average delivery times (bar chart)
     - Agent performance (if applicable)
   - Date range filters
   - Export reports

7. **Settings** (`/partner/settings`)
   - API key management (regenerate, view)
   - Webhook URL configuration
   - Company information
   - Integration documentation link

#### Design Notes for Partner:
- **Desktop-focused**: More screen real estate for data tables and maps
- **Data-dense**: Tables, charts, analytics - information-rich interface
- **Professional**: Business-oriented design
- **Map-heavy**: Order tracking is a core feature - make maps prominent
- **API Integration Focus**: Clear documentation and API key management

---

### **ADMIN INTERFACE** (`/admin`)

#### Dashboard Layout
- **Header**:
  - Platform logo/branding
  - Admin name
  - System health indicator
  - Notifications

- **Sidebar Navigation**:
  - Dashboard Overview
  - Live Map
  - Agents Management
  - Partners Management
  - Orders Management
  - Analytics & Reports
  - Support Tickets
  - System Settings

- **Main Content Area**:
  - **KPI Cards**: Total agents, Active agents, Total orders today, System health
  - **Charts**: Orders trend, Agent activity, Partner activity
  - **Recent Activity Feed**: Latest system events

#### Key Pages:
1. **Dashboard** (`/admin/dashboard`)
   - System-wide metrics
   - Real-time statistics
   - Activity feed
   - Quick actions

2. **Live Map** (`/admin/map`)
   - **Full-screen Mapbox map** showing:
     - All online agents (as markers/clusters)
     - Agent status color coding (ONLINE = green, ON_TRIP = blue, OFFLINE = gray)
     - Click agent marker → popup with agent details
     - Filter controls (by status, city, vehicle type)
     - Real-time location updates (agents move on map)
   - **Sidebar Panel**:
     - Agent list with search
     - Selected agent details
     - Quick actions (view profile, block, etc.)

3. **Agents Management** (`/admin/agents`)
   - **Agents Table** with columns:
     - Name, Phone, Status, Rating, Total Orders, City, Approval Status
     - Actions: View, Approve/Reject, Block/Unblock
   - **Filters**: By status, approval status, city, vehicle type
   - **Search**: By name, phone, email
   - **Agent Detail Page** (`/admin/agents/[id]`):
     - Full profile
     - Performance metrics
     - Order history
     - Documents (for KYC verification)
     - Action buttons (Approve, Block, Suspend)

4. **Partners Management** (`/admin/partners`)
   - Partners list table
   - Partner analytics
   - Partner detail page with order heatmap

5. **Orders Management** (`/admin/orders`)
   - All orders table
   - Filters and search
   - Order detail page with ability to:
     - Force reassign
     - Cancel order
     - View full timeline

6. **Analytics & Reports** (`/admin/analytics`)
   - Comprehensive charts:
     - Orders over time
     - Agent performance metrics
     - Partner comparison
     - Geographic heatmaps
     - Revenue analytics
   - Export functionality
   - Custom date ranges

7. **Support Tickets** (`/admin/support`)
   - Ticket management interface
   - Filter by status, priority
   - Ticket detail view with resolution workflow

#### Design Notes for Admin:
- **Power User Interface**: Dense information, advanced features
- **Real-time Monitoring**: Live updates, WebSocket connections visible
- **Map is Critical**: Live map is a core feature - make it prominent and performant
- **Data Tables**: Sortable, filterable, paginated tables
- **Action-oriented**: Many quick actions (approve, block, reassign) should be easily accessible

---

## 🔄 Key User Flows & Interactions

### Agent Flow: Accepting an Order
1. Agent toggles ONLINE
2. System queries nearby orders
3. New order card appears in "Available Orders" with notification
4. Agent sees: Distance, Payout, Addresses, Time estimate
5. Agent clicks "Accept" → Order moves to "Active Order" section
6. Agent navigates to pickup → Clicks "Picked Up"
7. Agent navigates to drop → Clicks "Out for Delivery" → "Delivered"
8. Order moves to history, agent can accept new orders

### Partner Flow: Creating & Tracking Order
1. Partner navigates to "Create Order"
2. Enters pickup/drop addresses (with map picker)
3. Sets payout amount and priority
4. Submits order → Order appears in "Active Orders" with status "SEARCHING_AGENT"
5. Status updates to "ASSIGNED" when agent accepts
6. Partner can click order → Full tracking page with real-time agent location
7. Status updates: PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
8. Order moves to history

### Admin Flow: Monitoring System
1. Admin opens Live Map
2. Sees all agents on map (color-coded by status)
3. Clicks agent marker → Views agent details
4. Can filter by status, city, etc.
5. Can navigate to Agents Management for detailed actions
6. Dashboard shows real-time metrics updating

---

## 🗂️ Application Structure

### Route Organization
```
/ (landing/login)
├── /login
├── /register
│   ├── /register/agent
│   ├── /register/partner
│   └── /register/admin
│
├── /agent (protected - AGENT role)
│   ├── /agent/dashboard
│   ├── /agent/profile
│   ├── /agent/orders
│   └── /agent/earnings
│
├── /partner (protected - PARTNER role)
│   ├── /partner/dashboard
│   ├── /partner/orders
│   │   ├── /partner/orders/create
│   │   ├── /partner/orders/active
│   │   ├── /partner/orders/history
│   │   └── /partner/orders/[id]
│   ├── /partner/analytics
│   └── /partner/settings
│
└── /admin (protected - ADMIN role)
    ├── /admin/dashboard
    ├── /admin/map
    ├── /admin/agents
    │   └── /admin/agents/[id]
    ├── /admin/partners
    ├── /admin/orders
    ├── /admin/analytics
    └── /admin/support
```

### Component Structure
```
components/
├── shared/           # Reusable components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Toast.tsx
│   └── LoadingSpinner.tsx
│
├── agent/            # Agent-specific components
│   ├── OnlineToggle.tsx
│   ├── OrderCard.tsx
│   ├── ActiveOrderView.tsx
│   └── LocationTracker.tsx
│
├── partner/          # Partner-specific components
│   ├── OrderForm.tsx
│   ├── OrderTrackingMap.tsx
│   ├── OrdersTable.tsx
│   └── AnalyticsCharts.tsx
│
├── admin/            # Admin-specific components
│   ├── LiveMap.tsx
│   ├── AgentMarker.tsx
│   ├── MetricsCards.tsx
│   └── DataTable.tsx
│
└── maps/             # Map components (Mapbox)
    ├── MapView.tsx
    ├── RouteDisplay.tsx
    └── LocationMarker.tsx
```

### Layout Structure
- **Root Layout**: Common header/footer, auth provider
- **Role Layouts**: 
  - `app/(agent)/layout.tsx` - Agent-specific navigation
  - `app/(partner)/layout.tsx` - Partner sidebar navigation
  - `app/(admin)/layout.tsx` - Admin sidebar navigation

---

## 🎯 Design Priorities

### 1. **Real-time Feel**
- WebSocket connections for live updates
- Smooth animations for status changes
- Live location updates on maps
- Toast notifications for important events

### 2. **Mobile-First for Agents**
- Large touch targets (minimum 44x44px)
- Swipeable cards
- Bottom navigation for easy thumb access
- Simplified UI for small screens

### 3. **Data Visualization**
- Charts for analytics (use Recharts library)
- Maps for location tracking (Mapbox GL)
- Status badges with color coding
- Progress indicators for order status

### 4. **Performance**
- Lazy loading for heavy components (maps, charts)
- Skeleton loaders instead of spinners
- Optimistic UI updates
- Efficient data fetching

### 5. **Accessibility**
- Keyboard navigation
- Screen reader support
- High contrast mode
- Clear focus indicators

---

## 🗺️ Map Integration Requirements

### Mapbox Integration
- **Agent Interface**: 
  - Route display for active orders
  - Pickup and drop markers
  - Current location indicator
  
- **Partner Interface**:
  - Full order tracking with agent location
  - Route visualization
  - ETA calculations
  
- **Admin Interface**:
  - Live map with all agents
  - Clustering for many markers
  - Real-time location streaming
  - Agent detail popups on click

### Map Features Needed
- Custom markers (different icons for status)
- Route drawing between points
- Real-time location updates
- Zoom controls
- Search/Geocoding for addresses

---

## 📊 Analytics & Data Display

### Charts Needed
- **Line Charts**: Orders over time, Earnings trends
- **Bar Charts**: Delivery times, Agent performance
- **Pie Charts**: Status distribution, Vehicle type distribution
- **Heatmaps**: Geographic order distribution

### Metrics to Display
- **Agent**: Earnings, Orders completed, Rating, Acceptance rate
- **Partner**: Total orders, Completion rate, Average delivery time, Active orders
- **Admin**: System-wide metrics, Agent counts, Order volumes, Revenue

---

## 🔔 Real-time Features

### WebSocket Events to Handle
- New order offers (Agent)
- Order status updates (All roles)
- Agent location updates (Admin map)
- System notifications

### Visual Indicators
- Badge notifications for new items
- Toast messages for important events
- Status indicators (online/offline dots)
- Real-time counters

---

## 🎨 UI/UX Guidelines

### Navigation
- **Agent**: Bottom navigation (mobile-friendly)
- **Partner**: Left sidebar (desktop)
- **Admin**: Left sidebar with collapsible sections

### Status Indicators
- Use color-coded badges:
  - Green: Success, Online, Completed
  - Blue: Active, In Progress
  - Yellow/Amber: Pending, Warning
  - Red: Error, Cancelled, Offline
  - Gray: Inactive, Neutral

### Forms
- Clear labels
- Inline validation
- Error messages below fields
- Success feedback
- Loading states on submit

### Tables
- Sortable columns
- Filterable rows
- Pagination
- Search functionality
- Responsive (horizontal scroll on mobile)

### Cards
- Shadow for depth
- Hover effects
- Clear hierarchy
- Action buttons clearly visible

---

## 🚀 Technical Considerations for Design

### State Management
- Real-time updates via WebSocket
- Optimistic UI updates
- Cache management for API calls

### Loading States
- Skeleton loaders (preferred over spinners)
- Progressive loading for heavy data
- Lazy loading for maps and charts

### Error Handling
- Error boundaries
- User-friendly error messages
- Retry mechanisms
- Fallback UI

### Responsive Breakpoints
- Mobile: < 768px (Agent primary)
- Tablet: 768px - 1024px
- Desktop: > 1024px (Partner/Admin primary)

---

## 📝 Additional Design Notes

1. **Onboarding**: Simple, clear registration flows for each role
2. **Empty States**: Friendly messages when no data (no orders, no agents, etc.)
3. **Help/Support**: Accessible help documentation and support ticket creation
4. **Notifications**: Non-intrusive toast system, persistent notification center
5. **Search**: Global search where applicable (orders, agents, partners)
6. **Filters**: Advanced filtering options for data-heavy pages
7. **Export**: CSV/PDF export for reports and analytics
8. **Dark Mode**: Consider dark mode support (optional but nice-to-have)

---

## 🎯 Design Deliverables Expected

1. **Complete UI Design** for all three role interfaces
2. **Component Library** with reusable components
3. **Responsive Layouts** for mobile, tablet, desktop
4. **Interactive Prototypes** for key user flows
5. **Design System Documentation** (colors, typography, spacing, components)
6. **Icon Set** recommendations
7. **Animation Guidelines** for transitions and interactions

---

## 🔗 Integration Points

- **Next.js App Router**: Use server components where possible
- **NextAuth.js**: Authentication state management
- **Prisma**: Database queries and types
- **Redis**: Real-time location data
- **Socket.io**: WebSocket connections
- **Mapbox GL**: Map rendering
- **Recharts**: Data visualization
- **Tailwind CSS**: Styling (recommended)

---

This design should create a **professional, modern, and highly functional** platform that serves three distinct user types while maintaining consistency and excellent user experience across all interfaces.












