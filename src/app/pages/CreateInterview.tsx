import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { ArrowLeft, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function CreateInterview() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [sessionCreated, setSessionCreated] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: look up candidate by email to get their _id
      const userdata = await apiFetch(
        `/auth/user-by-email?email=${encodeURIComponent(candidateEmail)}`,
        "GET",
        null,
        token || undefined
      );

      const candidateId = userdata?.user?._id || userdata?._id;

      if (!candidateId) {
        toast.error("Candidate not found. Check the email and try again.");
        setLoading(false);
        return;
      }

      // Step 2: create the interview session
      const data = await apiFetch(
        "/interview/create",
        "POST",
        { candidateId },
        token || undefined
      );

      const newSessionId = data.session.sessionId;
      const newJoinLink  = `${window.location.origin}/interview/${newSessionId}`;

      setSessionId(newSessionId);
      setJoinLink(newJoinLink);
      setSessionCreated(true);
      toast.success("Interview session created successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create interview");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  if (sessionCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <CardTitle>Interview Session Created!</CardTitle>
                <CardDescription>Share the Session ID with your candidate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Session ID</Label>
              <div className="flex gap-2">
                <Input value={sessionId} readOnly />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(sessionId, "Session ID")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Send this ID to your candidate so they can join</p>
            </div>

            <div className="space-y-2">
              <Label>Join Link</Label>
              <div className="flex gap-2">
                <Input value={joinLink} readOnly />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(joinLink, "Join link")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Candidate Email</Label>
              <Input value={candidateEmail} readOnly />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900"><strong>Initial Trust Score:</strong> 100</p>
              <p className="text-sm text-blue-900 mt-1"><strong>Status:</strong> Created</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate(`/interview/${sessionId}`)} className="flex-1">
                Open Interview Room
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="w-fit mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <CardTitle>Create New Interview</CardTitle>
          <CardDescription>Enter the candidate's email to create a session</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidateEmail">Candidate Email</Label>
              <Input
                id="candidateEmail"
                type="email"
                placeholder="candidate@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                The candidate must already have an account in the system
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">Session Details</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Initial trust score: 100</li>
                <li>• Real-time AI monitoring enabled</li>
                <li>• Face detection + tab switch active</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Interview Session"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}