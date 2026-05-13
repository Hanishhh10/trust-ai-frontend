# TRUST AI Frontend - Integration Guide

## 🎯 Overview

This is a complete Google Meet-style frontend interface for the TRUST AI interview monitoring system. The UI is fully functional with mock data and ready to be connected to your backend API.

## 📁 File Structure

```
src/
├── app/
│   ├── App.tsx                          # Main app with router setup
│   ├── routes.tsx                       # Route configuration
│   ├── context/
│   │   └── AuthContext.tsx              # Authentication context & state
│   ├── pages/
│   │   ├── Login.tsx                    # Login page (Recruiter/Candidate)
│   │   ├── Dashboard.tsx                # Recruiter dashboard
│   │   ├── CreateInterview.tsx          # Create new interview session
│   │   ├── JoinInterview.tsx            # Candidate join page
│   │   └── InterviewRoom.tsx            # Main video call interface
│   └── components/
│       ├── TrustScoreCard.tsx           # Live trust score display
���       ├── EventLogList.tsx             # Event logging display
│       ├── VideoGrid.tsx                # Video call grid layout
│       └── ControlBar.tsx               # Meeting controls (mic, camera, etc)
```

## 🔌 Backend Integration Points

### 1. Authentication (AuthContext.tsx)

**Current Status:** Mock login  
**Location:** `/src/app/context/AuthContext.tsx` (lines 35-48)

Replace the mock login with:

```javascript
const login = async (email: string, password: string, role: "recruiter" | "candidate") => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  
  const data = await response.json();
  
  setToken(data.token);
  setUser(data.user);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
};
```

### 2. Create Interview Session (CreateInterview.tsx)

**Current Status:** Mock session creation  
**Location:** `/src/app/pages/CreateInterview.tsx` (line 18-28)

Replace with:

```javascript
const handleCreateSession = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const response = await fetch('http://localhost:5000/api/interview/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ candidateEmail })
  });
  
  const data = await response.json();
  setSessionId(data.session.sessionId);
  // ... rest of the logic
};
```

### 3. Start Interview (InterviewRoom.tsx)

**Current Status:** Mock start  
**Location:** `/src/app/pages/InterviewRoom.tsx` (line 42-54)

Replace with:

```javascript
const handleStartInterview = async () => {
  const response = await fetch(`http://localhost:5000/api/interview/start/${sessionId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  setStatus("ongoing");
  // ... rest of the logic
};
```

### 4. Log Events (InterviewRoom.tsx)

**Current Status:** Mock event logging  
**Location:** `/src/app/pages/InterviewRoom.tsx` (line 74-93)

Replace with:

```javascript
const logEvent = async (type: string, details: string, trustImpact: number) => {
  const response = await fetch(`http://localhost:5000/api/interview/${sessionId}/events`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, details })
  });
  
  const data = await response.json();
  setTrustScore(data.trustScore);
  // ... rest of the logic
};
```

### 5. End Interview (InterviewRoom.tsx)

**Current Status:** Mock end  
**Location:** `/src/app/pages/InterviewRoom.tsx` (line 56-72)

Replace with:

```javascript
const handleEndInterview = async () => {
  const response = await fetch(`http://localhost:5000/api/interview/end/${sessionId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  setStatus("completed");
  setTrustScore(data.finalTrustScore);
  // ... rest of the logic
};
```

### 6. Fetch Interview Details (Dashboard.tsx)

**Current Status:** Mock data  
**Location:** `/src/app/pages/Dashboard.tsx` (line 20-32)

Replace with:

```javascript
useEffect(() => {
  const fetchSessions = async () => {
    const response = await fetch('http://localhost:5000/api/interview/sessions', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    setSessions(data.sessions);
  };
  
  fetchSessions();
}, [token]);
```

## 🎨 Key Features Implemented

### ✅ Authentication System
- Dual role login (Recruiter/Candidate)
- JWT token storage in localStorage
- Protected routes based on user role

### ✅ Recruiter Dashboard
- View all interview sessions
- Color-coded trust score indicators
- Session status badges (created/ongoing/completed)
- Quick access to interview rooms

### ✅ Interview Room (Google Meet Style)
- **Video Grid**: 2-participant layout with visual indicators
- **Control Bar**: Mic, Camera, Screen Share controls
- **Live Trust Score**: Real-time monitoring with color indicators
  - 90-100: Green (Excellent)
  - 70-89: Yellow (Good)
  - 40-69: Orange (Fair)
  - 0-39: Red (Poor)
- **Event Log**: Real-time event tracking with timestamps
- **Event Simulation**: Demo buttons for testing (Tab Switch, No Face, Multiple Faces)

### ✅ Interview Controls
- Start/End interview (Recruiter only)
- Leave call functionality
- Session ID display
- Participant counter

## 🔄 User Flow

### Recruiter Flow:
1. Login → Dashboard
2. Create Interview → Get Session ID
3. Start Interview → Monitor Trust Score
4. View Event Logs → End Interview
5. View Final Score

### Candidate Flow:
1. Login → Join Interview Page
2. Enter Session ID → Join Interview Room
3. Participate → System logs events automatically

## 🎯 Trust Score System

The trust score is displayed prominently with:
- Large number display
- Color-coded indicator (Green/Yellow/Orange/Red)
- Progress bar
- Score range legend
- Real-time updates after each event

### Event Impacts (For Demo):
- **Tab Switch**: -5 points
- **No Face Detected**: -10 points
- **Multiple Faces**: -8 points
- **Camera Off**: -3 points

## 📝 API Endpoints Used

Based on your backend documentation:

```
POST   /api/auth/login              # User authentication
POST   /api/interview/create        # Create session
POST   /api/interview/start/:id     # Start interview
POST   /api/interview/end/:id       # End interview
POST   /api/interview/:id/events    # Log event
GET    /api/interview/:id           # Get session details
GET    /api/interview/sessions      # Get all sessions (for dashboard)
```

## 🚀 Next Steps for Production

### Phase 1 (Connect Backend):
1. Replace all mock API calls with real backend calls
2. Add proper error handling and loading states
3. Implement WebSocket for real-time updates

### Phase 2 (Add Real Features):
1. **Tab Detection**: Use Page Visibility API
   ```javascript
   document.addEventListener('visibilitychange', () => {
     if (document.hidden) {
       logEvent('tab_switch', 'Tab switched', -5);
     }
   });
   ```

2. **Camera Access**: Use WebRTC
   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({ 
     video: true, 
     audio: true 
   });
   ```

3. **Face Detection**: Integrate with your AI model
   - Use backend API for face detection results
   - Display video stream in grid
   - Send frames for analysis

### Phase 3 (Enhanced Features):
- Recording functionality
- Chat system
- Screen sharing (WebRTC)
- Analytics dashboard
- Export interview reports
- Email notifications

## 🔧 Configuration

### Environment Variables (Create .env file):
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

Then use in code:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

## 📊 Current Mock Data

The application includes realistic mock data for demonstration:
- Sample interview sessions
- Timestamp formatting
- Event types and impacts
- Trust score calculations

All mock data can be easily replaced with real API data by following the integration points above.

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and tablet
- **Dark Theme**: Professional interview monitoring aesthetic
- **Smooth Animations**: Progress bars, transitions
- **Toast Notifications**: User feedback for actions
- **Loading States**: Ready for async operations
- **Error Handling**: Placeholder for error messages

## 📞 Support

For questions about integrating with your backend, refer to:
- `/src/imports/frontend-tech-doc.md` - Original requirements
- This guide for integration points
- Component files for detailed implementation

---

**Status**: Frontend Complete ✅  
**Ready for**: Backend Integration  
**Demo Ready**: Yes (with mock data)
