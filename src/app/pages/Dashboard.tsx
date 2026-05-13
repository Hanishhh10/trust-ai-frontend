import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Plus, Video, LogOut, Shield, Copy, CheckCheck } from "lucide-react";

interface Session {
  sessionId: string;
  status: "created" | "ongoing" | "completed";
  trustScore: number;
  createdAt: string;
  candidateEmail?: string;
}

export function Dashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isRecruiter = user?.role === "interviewer";

  const fetchSessions = async () => {
    try {
      const data = await apiFetch("/interview", "GET", null, token || undefined);
      if (data?.sessions) setSessions(data.sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  useEffect(() => {
    if (token && isRecruiter) fetchSessions();
  }, [token, location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCopySessionId = (sessionId: string) => {
    navigator.clipboard.writeText(sessionId);
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      created: "outline",
      ongoing: "default",
      completed: "secondary",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  // ✅ CANDIDATE POV — completely separate UI
  if (!isRecruiter) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">TRUST AI</h1>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md text-center border border-gray-700">
          <Video className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Welcome, Candidate</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Ask your recruiter for the Session ID to join the interview.
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-base"
            onClick={() => navigate("/join")}
          >
            Join Interview
          </Button>
          <p className="text-gray-500 text-xs mt-4">Logged in as: {user?.email}</p>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-gray-400 hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    );
  }

  // ✅ RECRUITER POV
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">TRUST AI</h1>
                <p className="text-sm text-gray-600">Recruiter Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Interview Sessions</h2>
            <p className="text-gray-600">Manage and monitor your interviews</p>
          </div>
          <Button onClick={() => navigate("/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Interview
          </Button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.sessionId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-mono text-gray-700 truncate max-w-[160px]">
                    {session.sessionId}
                  </CardTitle>
                  {getStatusBadge(session.status)}
                </div>

                {/* ✅ COPY SESSION ID BUTTON — recruiter shares this with candidate */}
                <button
                  onClick={() => handleCopySessionId(session.sessionId)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                >
                  {copiedId === session.sessionId ? (
                    <>
                      <CheckCheck className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Session ID for candidate
                    </>
                  )}
                </button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Candidate</p>
                  <p className="text-sm font-medium">
                    {session.candidateEmail || "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Trust Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getTrustScoreColor(session.trustScore)}`}
                        style={{ width: `${session.trustScore}%` }}
                      />
                    </div>
                    <span className="text-xl font-semibold">{session.trustScore}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm">{new Date(session.createdAt).toLocaleString()}</p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/interview/${session.sessionId}`)}
                >
                  <Video className="w-4 h-4 mr-2" />
                  {session.status === "ongoing" ? "Join Interview" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl text-gray-600 mb-2">No interviews yet</h3>
            <p className="text-gray-500 mb-4">Create your first interview to get started</p>
            <Button onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}