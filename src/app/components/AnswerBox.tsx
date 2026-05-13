import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Send, AlertTriangle, CheckCircle, Loader } from "lucide-react";

interface AnswerBoxProps {
  isCandidate:      boolean;
  isActive:         boolean;
  currentQuestion:  string;
  onEvent:          (type: string, details: string, impact: number) => void;
  onSubmitAnswer?:  (answer: string) => void;
  externalAnswer?:  string;
}

interface AnalysisResult {
  isAI: boolean; confidence: number;
  typingSpeed: number; wasPasted: boolean;
  verdict: string; reasons: string[];
}

export function AnswerBox({
  isCandidate, isActive, currentQuestion,
  onEvent, onSubmitAnswer, externalAnswer,
}: AnswerBoxProps) {
  const [answer,         setAnswer]         = useState("");
  const [analysis,       setAnalysis]       = useState<AnalysisResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [receivedAnswer, setReceivedAnswer] = useState("");
  const [receivedWPM,    setReceivedWPM]    = useState(0);
  const [receivedPasted, setReceivedPasted] = useState(false);

  const typingStart   = useRef<number | null>(null);
  const pasteDetected = useRef(false);

  useEffect(() => {
    if (!isCandidate && externalAnswer) {
      // Parse metadata if embedded
      if (externalAnswer.startsWith("__META__")) {
        try {
          const metaEnd = externalAnswer.indexOf("__END__");
          const meta    = JSON.parse(externalAnswer.slice(8, metaEnd));
          const text    = externalAnswer.slice(metaEnd + 7);
          setReceivedAnswer(text);
          setReceivedWPM(meta.wpm || 0);
          setReceivedPasted(meta.pasted || false);
        } catch {
          setReceivedAnswer(externalAnswer);
        }
      } else {
        setReceivedAnswer(externalAnswer);
      }
    }
  }, [externalAnswer, isCandidate]);

  const handleKeyDown = () => {
    if (!typingStart.current) typingStart.current = Date.now();
  };

  const handlePaste = () => {
    pasteDetected.current = true;
    // Silent on candidate side — recruiter sees it
    onEvent("paste_in_answer", "Candidate pasted text into answer box — possible AI use", -15);
  };

  const calcWPM = (): number => {
    if (!typingStart.current || answer.length < 10) return 0;
    const minutes = (Date.now() - typingStart.current) / 60000;
    return Math.round(answer.trim().split(/\s+/).length / minutes);
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const wpm = calcWPM();
    // Embed metadata invisibly for recruiter
    const payload = `__META__${JSON.stringify({ wpm, pasted: pasteDetected.current })}__END__${answer}`;
    onSubmitAnswer?.(payload);
    onEvent("answer_submitted", `Answer submitted — ${answer.length} chars, ${wpm} WPM, pasted: ${pasteDetected.current}`, 0);
    toast.success("Answer submitted!");
    setAnswer("");
    typingStart.current = null;
    pasteDetected.current = false;
  };

  const analyseAnswer = useCallback(async (
    text: string, wpm: number, wasPasted: boolean
  ) => {
    if (!text.trim() || text.length < 30) {
      toast.warning("Answer too short to analyse"); return;
    }
    setLoading(true);
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

Question: "${currentQuestion || 'General interview question'}"
Answer: "${text}"

Behavioural signals:
- Typing speed: ${wpm} WPM (normal human = 40-80 WPM)
- Was pasted: ${wasPasted}
- Length: ${text.length} chars

Is this AI-generated or human-written?
Reply ONLY with valid JSON:
{
  "isAI": true/false,
  "confidence": 0-100,
  "verdict": "one sentence",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}`
          }]
        })
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text || "";
      let parsed: any;
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        parsed = { isAI: wasPasted, confidence: wasPasted ? 80 : 25, verdict: "Analysis inconclusive", reasons: ["Parse error"] };
      }
      const result: AnalysisResult = { ...parsed, typingSpeed: wpm, wasPasted };
      setAnalysis(result);

      if (result.isAI && result.confidence > 70) {
        toast.error(`🚨 AI answer detected! (${result.confidence}% confidence)`, { duration: 8000 });
        onEvent("ai_answer_detected", `AI text — ${result.confidence}% confidence. ${result.verdict}`, -20);
      } else if (result.isAI) {
        toast.warning(`⚠ Possibly AI (${result.confidence}% confidence)`, { duration: 6000 });
        onEvent("suspicious_answer", `Possibly AI — ${result.confidence}% confidence`, -10);
      } else {
        onEvent("answer_clean", "Answer appears human-written", 0);
      }
    } catch {
      const fallback: AnalysisResult = {
        isAI: wasPasted || wpm > 150, confidence: wasPasted ? 75 : wpm > 150 ? 60 : 20,
        typingSpeed: wpm, wasPasted,
        verdict: wasPasted ? "Pasted — likely AI" : wpm > 150 ? "Suspiciously fast" : "Appears human",
        reasons: [wasPasted ? "Text was pasted" : "Typed normally", `Speed: ${wpm} WPM`]
      };
      setAnalysis(fallback);
    } finally {
      setLoading(false);
    }
  }, [currentQuestion, onEvent]);

/* ── CANDIDATE VIEW ── */
if (isCandidate) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 h-full">

      {/* Question display — always visible, prominent */}
      <div className={`rounded-lg p-3 border-2 transition-all ${
        currentQuestion
          ? "bg-indigo-900/50 border-indigo-500"
          : "bg-gray-700/50 border-gray-600"
      }`}>
        <p className="text-indigo-300 text-xs uppercase tracking-wide font-semibold mb-1">
          {currentQuestion ? "📩 Question from Recruiter:" : "⏳ Waiting for question..."}
        </p>
        {currentQuestion ? (
          <p className="text-white text-sm font-medium leading-relaxed">{currentQuestion}</p>
        ) : (
          <p className="text-gray-500 text-sm italic">
            The recruiter will send you a question shortly
          </p>
        )}
      </div>

      {/* Answer textarea */}
      <div className="flex flex-col gap-2 flex-1">
        <label className="text-gray-400 text-xs uppercase tracking-wide">Your Answer</label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={!isActive}
          placeholder={
            !isActive
              ? "Interview not started yet..."
              : currentQuestion
              ? "Type your answer here..."
              : "Wait for the recruiter to send a question..."
          }
          className="flex-1 min-h-[120px] bg-gray-700 text-white rounded-lg p-3 text-sm resize-none border border-gray-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={!isActive || !answer.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 h-11"
      >
        <Send className="w-4 h-4 mr-2" />
        Submit Answer
      </Button>

      {/* Status hint */}
      {isActive && (
        <p className="text-center text-gray-600 text-xs">
          Your answer will be reviewed by the recruiter
        </p>
      )}
    </div>
  );
}

  /* ── RECRUITER VIEW ── */
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 border-t border-gray-700 shrink-0">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs uppercase tracking-wide">Candidate Answer Monitor</p>
        {receivedAnswer && (
          <Button size="sm" onClick={() => analyseAnswer(receivedAnswer, receivedWPM, receivedPasted)}
            disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-xs h-7 px-3">
            {loading ? <Loader className="w-3 h-3 animate-spin mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            Analyse with AI
          </Button>
        )}
      </div>

      <div className="w-full min-h-[50px] bg-gray-700/50 rounded-lg p-3 text-sm text-gray-300 border border-gray-600">
        {receivedAnswer || <span className="text-gray-500 italic">Waiting for candidate to submit answer...</span>}
      </div>

      {receivedAnswer && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-700 rounded p-2 text-center">
            <p className="text-xs text-gray-400">WPM</p>
            <p className={`text-lg font-bold ${receivedWPM > 100 ? "text-red-400" : "text-green-400"}`}>
              {receivedWPM || "—"}
            </p>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Pasted</p>
            <p className={`text-lg font-bold ${receivedPasted ? "text-red-400" : "text-green-400"}`}>
              {receivedPasted ? "YES" : "No"}
            </p>
          </div>
          <div className="bg-gray-700 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Chars</p>
            <p className="text-lg font-bold text-gray-200">{receivedAnswer.length}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-indigo-400 text-sm">
          <Loader className="w-4 h-4 animate-spin" /> Analysing with AI...
        </div>
      )}

      {analysis && (
        <div className={`rounded-lg p-3 border ${analysis.isAI ? "bg-red-900/30 border-red-700" : "bg-green-900/30 border-green-700"}`}>
          <div className="flex items-center gap-2 mb-2">
            {analysis.isAI ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
            <span className={`text-sm font-semibold ${analysis.isAI ? "text-red-400" : "text-green-400"}`}>
              {analysis.isAI ? `AI-Generated (${analysis.confidence}%)` : `Human-Written (${analysis.confidence}%)`}
            </span>
          </div>
          <p className="text-xs text-gray-300 mb-2">{analysis.verdict}</p>
          <ul className="space-y-1">
            {analysis.reasons.map((r, i) => (
              <li key={i} className="text-xs text-gray-400">• {r}</li>
            ))}
          </ul>
          <div className="mt-2 pt-2 border-t border-gray-600 flex gap-3 text-xs text-gray-400">
            <span>Speed: <b className="text-white">{analysis.typingSpeed} WPM</b></span>
            <span>Pasted: <b className={analysis.wasPasted ? "text-red-400" : "text-green-400"}>{analysis.wasPasted ? "Yes" : "No"}</b></span>
          </div>
        </div>
      )}
    </div>
  );
}