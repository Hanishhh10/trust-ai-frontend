import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Video, ArrowLeft } from "lucide-react";

export function JoinInterview() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionId.trim()) {
      navigate(`/interview/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login")}
            className="w-fit mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-full">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Join Interview</CardTitle>
              <CardDescription>Enter your session ID to join the interview</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                type="text"
                placeholder="INT-123456"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Enter the session ID provided by your recruiter
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Before you join:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Make sure your camera and microphone are working</li>
                <li>• Find a quiet, well-lit location</li>
                <li>• Close unnecessary tabs and applications</li>
                <li>• Stay focused during the interview</li>
              </ul>
            </div>

            <Button type="submit" className="w-full">
              Join Interview
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
