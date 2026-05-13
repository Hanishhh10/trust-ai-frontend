Project overview for frontend

Required pages

User roles

API integration details

UI components

State management

Event handling

Trust score display logic

Folder structure

Development stack

Current backend compatibility

What must be built now vs later


This is a clear technical instruction document.


---

🚀 TRUST AI – FRONTEND DEVELOPMENT DOCUMENT


---

1️⃣ PROJECT OVERVIEW (For Frontend Developer)

TrustAI is a backend-driven interview lifecycle and trust evaluation system.

The frontend must:

Provide UI for recruiter and candidate

Connect to backend APIs

Display live trust score

Trigger event logging

Show interview session details

Handle authentication securely


Backend is already 90% complete.

Frontend must now integrate and visualize the system.


---

2️⃣ FRONTEND TECH STACK (Required)

Recommended:

React.js (Vite or Create React App)

Axios (API calls)

React Router DOM

Context API (Auth state)

Tailwind CSS or simple CSS

JWT stored in localStorage


Optional (later):

WebSocket integration

Chart library for analytics



---

3️⃣ USER ROLES

Two main roles:

👤 Recruiter

Login/Register

Create Interview Session

Start Interview

Monitor trust score

End Interview

View final report


👤 Candidate

Join Interview

Attend interview

System logs behavior automatically



---

4️⃣ REQUIRED PAGES

1️⃣ Login Page

Route: /login
Fields:

Email

Password
On success:

Store JWT token

Redirect to dashboard



---

2️⃣ Dashboard (Recruiter)

Route: /dashboard

Display:

Create Interview Button

List of created sessions

Session status

Trust score

View details button



---

3️⃣ Create Interview Page

Route: /create

Call: POST /api/interview/create

Display:

Generated sessionId

Initial trustScore (100)

Status (created)



---

4️⃣ Interview Monitor Page

Route: /interview/:sessionId

This is most important.

Display:

Session ID

Status

Start Button

Trust Score (LIVE)

Event logs list

End Button



---

5️⃣ API INTEGRATION DETAILS

Backend Base URL: http://localhost:5000/api

All requests require: Authorization: Bearer <token>


---

🔹 Create Session

POST /interview/create
Returns: { session: { sessionId, status, trustScore } }


---

🔹 Start Interview

POST /interview/start/:sessionId

Returns: { message, session }


---

🔹 Log Event

POST /interview/:sessionId/events

Body: { type: "tab_switch", details: "User switched tab" }

Returns: { trustScore }


---

🔹 End Interview

POST /interview/end/:sessionId

Returns: { finalTrustScore }


---

🔹 Fetch Interview Details

GET /interview/:sessionId

Returns: Full session object with:

events

trustScore

status

timestamps



---

6️⃣ TRUST SCORE DISPLAY LOGIC

The trust score must:

Start at 100

Update after every event

Show color indicator:


90–100 → Green
70–89 → Yellow
40–69 → Orange
0–39 → Red

This visual indicator is important for demo.


---

7️⃣ EVENT SIMULATION (FOR NOW)

Since no AI or webcam yet:

Frontend must simulate:

Tab switch

No face

Multiple faces


Buttons:

Simulate Tab Switch
Simulate No Face
Simulate Multiple Faces

Each triggers logEvent API.

Later: Replace with real browser events.


---

8️⃣ COMPONENT STRUCTURE

Suggested folder structure:

src/ ├── pages/ │     ├── Login.jsx │     ├── Dashboard.jsx │     ├── Interview.jsx │ ├── components/ │     ├── TrustScoreCard.jsx │     ├── EventLogList.jsx │     ├── Navbar.jsx │ ├── context/ │     ├── AuthContext.jsx │ ├── services/ │     ├── api.js │ ├── App.jsx ├── main.jsx


---

9️⃣ STATE MANAGEMENT

Global Auth State:

token

user info

role


Interview State:

sessionId

trustScore

status

events[]


Update trustScore dynamically after API response.


---

🔟 CURRENT PROGRESS (Backend Status)

Backend completed by Member 1:

✅ Authentication
✅ JWT
✅ Role middleware
✅ Create session
✅ Start interview
✅ Log events
✅ Trust score logic
✅ End interview
✅ Fetch session details

Frontend must now integrate with these APIs.


---

1️⃣1️⃣ WHAT MUST BE BUILT IMMEDIATELY (For Demo)

Minimum Demo Requirements:

Login page

Dashboard

Create session

Start interview

Simulate events

Live trust score display

End interview

Show final score


That’s enough for presentation.


---

1️⃣2️⃣ WHAT CAN BE BUILT LATER

Real tab switching detection

Face detection integration

WebSocket real-time updates

Analytics dashboard

Charts and reports

Admin panel



---

1️⃣3️⃣ FINAL USER FLOW (Complete System)

1. Recruiter logs in


2. Creates interview session


3. Starts interview


4. Candidate attends


5. System logs events


6. Trust score updates live


7. Recruiter ends interview


8. Final trust score displayed


9. Recruiter makes decision




---

1️⃣4️⃣ DESIGN GOAL

UI must feel:

Professional

Clean

Minimal

Real-time monitoring style

Secure


No overdesign needed.


---

📌 SUMMARY FOR FRONTEND MEMBER

You are building a React-based dashboard that connects to an already completed Node.js backend. Your task is to implement authentication, interview session visualization, trust score monitoring, and event simulation UI. The backend trust engine is complete. You only need to visualize and interact with it using API calls.