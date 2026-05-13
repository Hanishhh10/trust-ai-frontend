import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { TrustScoreCard } from "../components/TrustScoreCard";
import { EventLogList } from "../components/EventLogList";
import { VideoGrid } from "../components/VideoGrid";
import { ControlBar } from "../components/ControlBar";
import { useDetection } from "../hooks/useDetection";
import { useWebRTC } from "../hooks/useWebRTC";
import { Phone, Shield, Play, Square, Send } from "lucide-react";
import { toast } from "sonner";

interface InterviewEvent {
  id: string; type: string; details: string;
  timestamp: string; trustImpact: number;
}

interface AnalysisResult {
  isAI: boolean; confidence: number;
  typingSpeed: number; wasPasted: boolean;
  verdict: string; reasons: string[];
}

export function InterviewRoom() {
  const { sessionId }   = useParams();
  const navigate        = useNavigate();
  const { user, token } = useAuth();

  const [status,        setStatus]       = useState<"created"|"ongoing"|"completed">("created");
  const [trustScore,    setTrustScore]   = useState(100);
  const [events,        setEvents]       = useState<InterviewEvent[]>([]);
  const [isMicOn,       setIsMicOn]      = useState(true);
  const [isCameraOn,    setIsCameraOn]   = useState(true);
  const [questionDraft, setQuestionDraft] = useState("");

  const [answerText,   setAnswerText]   = useState("");
  const [analysis,     setAnalysis]     = useState<AnalysisResult | null>(null);
  const [analysing,    setAnalysing]    = useState(false);
  const typingStart    = useRef<number | null>(null);
  const pasteDetected  = useRef(false);

  const [receivedAnswer,  setReceivedAnswer]  = useState("");
  const [receivedWPM,     setReceivedWPM]     = useState(0);
  const [receivedPasted,  setReceivedPasted]  = useState(false);

  const isRecruiter = user?.role === "interviewer" || user?.role === "recruiter";
  const isCandidate = !isRecruiter;

  const {
    localStream, remoteStream, remoteJoined,
    currentQuestion, candidateAnswer,
    sendQuestion, sendAnswer,
    emitInterviewStarted, emitInterviewEnded,
    stopTracks, toggleCamera, toggleMic, socket,
  } = useWebRTC({
    sessionId: sessionId!,
    role: isRecruiter ? "interviewer" : "candidate",
    isActive: true,
  });

  /* ── Fetch real trust score + status from backend on load ── */
  useEffect(() => {
    if (!sessionId || !token) return;
    apiFetch(`/interview/${sessionId}`, "GET", null, token)
      .then(data => {
        const session = data?.session || data;
        if (session?.trustScore !== undefined) setTrustScore(session.trustScore);
        if (session?.status)                   setStatus(session.status);
        if (session?.events?.length > 0) {
          setEvents(session.events.map((e: any, i: number) => ({
            id: i.toString(),
            type: e.type,
            details: e.details || "",
            timestamp: e.timestamp || new Date().toISOString(),
            trustImpact: 0
          })));
        }
      })
      .catch(() => {});
  }, [sessionId, token]);

  /* ── Parse incoming answer from candidate ── */
  useEffect(() => {
    if (!isRecruiter || !candidateAnswer) return;
    if (candidateAnswer.startsWith("__META__")) {
      try {
        const metaEnd = candidateAnswer.indexOf("__END__");
        const meta    = JSON.parse(candidateAnswer.slice(8, metaEnd));
        const text    = candidateAnswer.slice(metaEnd + 7);
        setReceivedAnswer(text);
        setReceivedWPM(meta.wpm || 0);
        setReceivedPasted(meta.pasted || false);
      } catch {
        setReceivedAnswer(candidateAnswer);
      }
    } else {
      setReceivedAnswer(candidateAnswer);
    }
  }, [candidateAnswer, isRecruiter]);

  /* ── Socket listeners ── */
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    s.on("interview-started", () => setStatus("ongoing"));
    s.on("interview-ended",   () => setStatus("completed"));

    s.on("detection-event", ({
      eventType, details, impact
    }: { eventType: string; details: string; impact: number }) => {
      if (!isRecruiter) return;
      setTrustScore(prev => Math.max(0, prev + impact));
      setEvents(prev => [{
        id: Date.now().toString(),
        type: eventType, details,
        timestamp: new Date().toISOString(),
        trustImpact: impact
      }, ...prev]);
    });

    return () => {
      s.off("interview-started");
      s.off("interview-ended");
      s.off("detection-event");
    };
  }, [socket.current, isRecruiter]);

  /* ── LOG EVENT → backend ── */
  const logEvent = useCallback(async (type: string, details: string, trustImpact: number) => {
    try {
      const data = await apiFetch(
        `/interview/${sessionId}/events`, "POST",
        { type, details }, token || undefined
      );
      setTrustScore(data.trustScore);
    } catch (err) { console.error(err); }
    setEvents(prev => [{
      id: Date.now().toString(), type, details,
      timestamp: new Date().toISOString(), trustImpact
    }, ...prev]);
  }, [sessionId, token]);

  /* ── MALPRACTICE ── */
  const handleMalpractice = useCallback(async () => {
    toast.error("🚨 Interview auto-ended: MALPRACTICE", { duration: 10000 });
    try {
      const data = await apiFetch(`/interview/end/${sessionId}`, "POST", null, token || undefined);
      setStatus("completed");
      setTrustScore(data.finalTrustScore ?? trustScore);
      emitInterviewEnded();
    } catch { setStatus("completed"); }
  }, [sessionId, token, trustScore, emitInterviewEnded]);

  /* ── DETECTION — candidate only ── */
  const { startFaceDetection, stopFaceDetection } = useDetection({
    isActive:      status === "ongoing" && isCandidate,
    isCandidate,
    onEvent:       logEvent,
    onMalpractice: handleMalpractice,
    socket,
    sessionId,
  });

  /* ── Start face detection when interview starts ── */
  useEffect(() => {
    if (status !== "ongoing" || !isCandidate || !localStream) return;
    const video = document.createElement("video");
    video.srcObject = localStream;
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
      setTimeout(() => startFaceDetection(video), 1500);
    };
    if (video.readyState >= 1) {
      video.play().catch(() => {});
      setTimeout(() => startFaceDetection(video), 1500);
    }
    return () => { video.srcObject = null; };
  }, [status, isCandidate, localStream]);

  /* ── CONTROLS ── */
  const handleToggleCamera = () => {
    const turningOff = isCameraOn;
    const newState   = !isCameraOn;
    setIsCameraOn(newState);
    toggleCamera(newState);
    if (turningOff && status === "ongoing" && isCandidate) {
      logEvent("camera_off", "Candidate turned camera off", -5);
      socket.current?.emit("detection-event", {
        sessionId, eventType: "camera_off",
        details: "Candidate turned camera off", impact: -5
      });
    }
  };

  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    toggleMic(newState);
  };

  /* ── START ── */
  const handleStart = async () => {
    try {
      await apiFetch(`/interview/start/${sessionId}`, "POST", null, token || undefined);
      setStatus("ongoing");
      emitInterviewStarted();
      toast.success("Interview started! All AI detection active 🔍");
      logEvent("interview_started", "Interview session started", 0);
    } catch { toast.error("Failed to start interview"); }
  };

  /* ── END ── */
  const handleEnd = async () => {
    try {
      stopFaceDetection();
      stopTracks();
      const data = await apiFetch(`/interview/end/${sessionId}`, "POST", null, token || undefined);
      setStatus("completed");
      setTrustScore(data.finalTrustScore);
      emitInterviewEnded();
      toast.success(`Interview ended! Final Score: ${data.finalTrustScore}`);
      logEvent("interview_ended", `Final score: ${data.finalTrustScore}`, 0);
    } catch { toast.error("Failed to end interview"); }
  };

  const handleLeave = () => {
    if (status === "ongoing" && isRecruiter) {
      toast.error("End the interview before leaving"); return;
    }
    stopTracks();
    navigate("/dashboard");
  };

  const handleSendQuestion = () => {
    if (!questionDraft.trim()) return;
    sendQuestion(questionDraft.trim());
    setQuestionDraft("");
    toast.success("Question sent to candidate");
  };

  /* ── CANDIDATE: submit answer ── */
  const handleSubmitAnswer = () => {
    if (!answerText.trim()) return;
    const wpm = typingStart.current
      ? Math.round(answerText.trim().split(/\s+/).length / ((Date.now() - typingStart.current) / 60000))
      : 0;
    const payload = `__META__${JSON.stringify({ wpm, pasted: pasteDetected.current })}__END__${answerText}`;
    sendAnswer(payload);
    logEvent("answer_submitted", `Answer submitted — ${answerText.length} chars, ${wpm} WPM, pasted: ${pasteDetected.current}`, 0);
    socket.current?.emit("detection-event", {
      sessionId, eventType: "answer_submitted",
      details: `Answer submitted — ${answerText.length} chars, ${wpm} WPM`,
      impact: 0
    });
    toast.success("Answer submitted!");
    setAnswerText("");
    typingStart.current = null;
    pasteDetected.current = false;
  };

  /* ── RECRUITER: analyse answer with AI ── */
  const handleAnalyseAnswer = async () => {
    if (!receivedAnswer || receivedAnswer.length < 30) {
      toast.warning("Answer too short to analyse"); return;
    }
    setAnalysing(true);
    setAnalysis(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `You are an AI text detection expert for an interview proctoring system.

Answer: "${receivedAnswer}"
Typing speed: ${receivedWPM} WPM (normal = 40-80 WPM)
Was pasted: ${receivedPasted}
Length: ${receivedAnswer.length} chars

Is this AI-generated or human-written?
Reply ONLY with valid JSON, no extra text:
{
  "isAI": true,
  "confidence": 85,
  "verdict": "one sentence verdict",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}`
          }]
        })
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text || "";
      let parsed: any;
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { parsed = { isAI: receivedPasted, confidence: receivedPasted ? 80 : 25, verdict: "Inconclusive", reasons: ["Parse error"] }; }
      const result: AnalysisResult = { ...parsed, typingSpeed: receivedWPM, wasPasted: receivedPasted };
      setAnalysis(result);
      if (result.isAI && result.confidence > 70) {
        logEvent("ai_answer_detected", `AI text — ${result.confidence}% confidence. ${result.verdict}`, -20);
        toast.error(`🚨 AI answer detected! (${result.confidence}% confidence)`);
      } else if (result.isAI) {
        logEvent("suspicious_answer", `Possibly AI — ${result.confidence}% confidence`, -10);
        toast.warning(`⚠ Possibly AI (${result.confidence}% confidence)`);
      } else {
        toast.success("✅ Answer appears human-written");
      }
    } catch {
      setAnalysis({
        isAI: receivedPasted || receivedWPM > 150,
        confidence: receivedPasted ? 75 : 20,
        typingSpeed: receivedWPM, wasPasted: receivedPasted,
        verdict: receivedPasted ? "Pasted — likely AI" : "Appears human-written",
        reasons: [receivedPasted ? "Text was pasted" : "Typed normally", `Speed: ${receivedWPM} WPM`]
      });
    } finally { setAnalysing(false); }
  };

  const statusColor = status === "ongoing" ? "bg-green-600"
    : status === "completed" ? "bg-gray-600" : "bg-yellow-600";

  /* ══════════════════════════════════
     CANDIDATE VIEW
  ══════════════════════════════════ */
  if (isCandidate) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">

        <div className="bg-gray-800 px-4 py-3 flex justify-between items-center shrink-0">
          <div className="flex gap-3 items-center">
            <Shield className="text-indigo-400 w-5 h-5" />
            <span className="text-white font-semibold">TRUST AI Interview</span>
            <Badge className={statusColor}>{status}</Badge>
            {remoteJoined && (
              <span className="text-green-400 text-xs animate-pulse">● Recruiter connected</span>
            )}
          </div>
          <Button variant="destructive" size="sm" onClick={handleLeave}>
            <Phone className="w-4 h-4 mr-2" /> Leave
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — video + controls + answer box */}
          <div className="flex-1 flex flex-col overflow-hidden">

            <div className="h-[320px] shrink-0">
              <VideoGrid
                localStream={localStream}
                remoteStream={remoteStream}
                isRecruiter={false}
                remoteJoined={remoteJoined}
                isCameraOn={isCameraOn}
                isMicOn={isMicOn}
                status={status}
              />
            </div>

            <div className="shrink-0 bg-gray-800 border-t border-gray-700 py-3 flex items-center justify-center">
              <ControlBar
                status={status}
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onSimulateEvent={logEvent}
                isRecruiter={false}
              />
            </div>

            <div className="flex-1 bg-gray-800 border-t border-gray-700 flex flex-col overflow-hidden p-4 gap-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold shrink-0">
                ✏️ Your Answer
              </p>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                onKeyDown={() => {
                  if (!typingStart.current) typingStart.current = Date.now();
                }}
                onPaste={() => {
                  pasteDetected.current = true;
                  logEvent("paste_in_answer", "Candidate pasted text — possible AI use", -15);
                  socket.current?.emit("detection-event", {
                    sessionId, eventType: "paste_in_answer",
                    details: "Candidate pasted into answer box", impact: -15
                  });
                }}
                disabled={status !== "ongoing"}
                placeholder={
                  status !== "ongoing"
                    ? "Interview not started yet..."
                    : "Type your answer here..."
                }
                className="flex-1 bg-gray-700 text-white rounded-lg p-3 text-sm resize-none border border-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40 min-h-[80px]"
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!answerText.trim() || status !== "ongoing"}
                className="w-full bg-indigo-600 hover:bg-indigo-500 shrink-0"
              >
                <Send className="w-4 h-4 mr-2" /> Submit Answer
              </Button>
            </div>
          </div>

          {/* RIGHT — question panel */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">

              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Interview Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status === "ongoing"   ? "bg-green-400 animate-pulse" :
                    status === "completed" ? "bg-gray-400" : "bg-yellow-400"
                  }`} />
                  <span className="text-white text-sm font-medium capitalize">{status}</span>
                </div>
                {status === "ongoing" && (
                  <p className="text-gray-400 text-xs mt-2">🔴 Session is being monitored</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                  📩 Question from Recruiter
                </p>
                <div className={`rounded-lg p-4 border-2 transition-all min-h-[100px] ${
                  currentQuestion
                    ? "bg-indigo-900/40 border-indigo-500"
                    : "bg-gray-700/30 border-gray-600"
                }`}>
                  {currentQuestion ? (
                    <>
                      <p className="text-white text-sm leading-relaxed">{currentQuestion}</p>
                      <p className="text-indigo-400 text-xs mt-2">↓ Type your answer in the box on the left</p>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm italic text-center">
                      Waiting for recruiter to send a question...
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-semibold">
                  📋 Instructions
                </p>
                <ul className="space-y-2">
                  {[
                    "Stay in camera frame at all times",
                    "Do not switch browser tabs",
                    "Type your answers — do not paste",
                    "Keep microphone on during interview",
                    "Do not open DevTools or other apps",
                  ].map((item, i) => (
                    <li key={i} className="text-gray-400 text-xs flex items-start gap-2">
                      <span className="text-green-400 shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {status === "completed" && (
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-white font-semibold mb-1">Interview Complete</p>
                  <p className="text-gray-400 text-sm mb-3">
                    Thank you for attending. Results will be shared shortly.
                  </p>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="w-full bg-indigo-600 hover:bg-indigo-500"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════
     RECRUITER VIEW
  ══════════════════════════════════ */
  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex gap-3 items-center">
          <Shield className="text-indigo-400 w-5 h-5" />
          <span className="text-white font-semibold">TRUST AI</span>
          <Badge variant="outline" className="text-gray-300 font-mono text-xs">
            {sessionId?.slice(0,8)}...
          </Badge>
          <Badge className={statusColor}>{status}</Badge>
          {remoteJoined && (
            <span className="text-green-400 text-xs animate-pulse">● Candidate connected</span>
          )}
          {status === "ongoing" && (
            <span className="text-blue-400 text-xs animate-pulse ml-2">● Detection active</span>
          )}
        </div>
        <Button variant="destructive" onClick={handleLeave}>
          <Phone className="w-4 h-4 mr-2" /> Leave
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — video + controls + answer monitor */}
        <div className="flex-1 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-hidden">
            <VideoGrid
              localStream={localStream}
              remoteStream={remoteStream}
              isRecruiter={true}
              remoteJoined={remoteJoined}
              isCameraOn={isCameraOn}
              isMicOn={isMicOn}
              status={status}
            />
          </div>

          <div className="shrink-0">
            <ControlBar
              status={status}
              isMicOn={isMicOn}
              isCameraOn={isCameraOn}
              onToggleMic={handleToggleMic}
              onToggleCamera={handleToggleCamera}
              onSimulateEvent={logEvent}
              isRecruiter={true}
            />
          </div>

          {/* Answer monitor */}
          <div className="shrink-0 bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">
                📋 Candidate Answer Monitor
              </p>
              {receivedAnswer && (
                <Button
                  size="sm"
                  onClick={handleAnalyseAnswer}
                  disabled={analysing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs h-7 px-3"
                >
                  {analysing ? "Analysing..." : "🤖 Analyse with AI"}
                </Button>
              )}
            </div>

            <div className="min-h-[50px] max-h-[100px] overflow-y-auto bg-gray-700/50 rounded-lg p-3 text-sm text-gray-300 border border-gray-600 mb-3">
              {receivedAnswer
                ? receivedAnswer
                : <span className="text-gray-500 italic">Waiting for candidate to submit answer...</span>}
            </div>

            {receivedAnswer && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-700 rounded p-2 text-center">
                  <p className="text-xs text-gray-400">WPM</p>
                  <p className={`text-base font-bold ${receivedWPM > 100 ? "text-red-400" : "text-green-400"}`}>
                    {receivedWPM || "—"}
                  </p>
                </div>
                <div className="bg-gray-700 rounded p-2 text-center">
                  <p className="text-xs text-gray-400">Pasted</p>
                  <p className={`text-base font-bold ${receivedPasted ? "text-red-400" : "text-green-400"}`}>
                    {receivedPasted ? "YES" : "No"}
                  </p>
                </div>
                <div className="bg-gray-700 rounded p-2 text-center">
                  <p className="text-xs text-gray-400">Chars</p>
                  <p className="text-base font-bold text-gray-200">{receivedAnswer.length}</p>
                </div>
              </div>
            )}

            {analysis && (
              <div className={`rounded-lg p-3 border text-xs ${
                analysis.isAI
                  ? "bg-red-900/30 border-red-700"
                  : "bg-green-900/30 border-green-700"
              }`}>
                <p className={`font-semibold mb-1 ${analysis.isAI ? "text-red-400" : "text-green-400"}`}>
                  {analysis.isAI
                    ? `🚨 AI-Generated (${analysis.confidence}% confidence)`
                    : `✅ Human-Written (${analysis.confidence}% confidence)`}
                </p>
                <p className="text-gray-300 mb-1">{analysis.verdict}</p>
                {analysis.reasons.map((r, i) => (
                  <p key={i} className="text-gray-400">• {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — monitoring panel */}
        <div className="w-80 bg-gray-800 flex flex-col overflow-hidden border-l border-gray-700">
          <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
            <TrustScoreCard score={trustScore} />

            {status === "created" && (
              <Button onClick={handleStart} className="w-full bg-indigo-600 hover:bg-indigo-500">
                <Play className="mr-2 w-4 h-4" /> Start Interview
              </Button>
            )}
            {status === "ongoing" && (
              <Button onClick={handleEnd} variant="destructive" className="w-full">
                <Square className="mr-2 w-4 h-4" /> End Interview
              </Button>
            )}

            {status === "ongoing" && (
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Ask Question</p>
                <textarea
                  value={questionDraft}
                  onChange={e => setQuestionDraft(e.target.value)}
                  placeholder="Type a question for the candidate..."
                  className="w-full h-20 bg-gray-600 text-white rounded p-2 text-sm resize-none border border-gray-500 focus:border-indigo-500 focus:outline-none"
                />
                <Button
                  onClick={handleSendQuestion}
                  size="sm"
                  className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500"
                >
                  <Send className="w-3 h-3 mr-2" /> Send Question
                </Button>
              </div>
            )}

            {status === "completed" && (
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Final Trust Score</p>
                <p className="text-4xl font-bold text-green-400">{trustScore}</p>
                <p className={`text-sm mt-2 font-medium ${
                  trustScore >= 90 ? "text-green-400" :
                  trustScore >= 70 ? "text-yellow-400" :
                  trustScore >= 40 ? "text-orange-400" : "text-red-400"
                }`}>
                  {trustScore >= 90 ? "✅ Excellent" :
                   trustScore >= 70 ? "🟡 Good" :
                   trustScore >= 40 ? "🟠 Suspicious" : "🔴 Malpractice Detected"}
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full mt-3 bg-gray-600 hover:bg-gray-500"
                >
                  Back to Dashboard
                </Button>
              </div>
            )}

            <EventLogList events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}