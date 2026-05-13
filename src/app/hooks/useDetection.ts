import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface DetectionOptions {
  isActive: boolean;
  isCandidate: boolean;
  onEvent: (type: string, details: string, impact: number) => void;
  onMalpractice: () => void;
  socket?: React.MutableRefObject<any>;
  sessionId?: string;
}

// ── Load face-api ONCE at module level ──
let faceApiPromise: Promise<void> | null = null;

function loadFaceApi(): Promise<void> {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).faceapi) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload  = () => { console.log("✅ face-api.js loaded"); resolve(); };
    script.onerror = () => reject(new Error("face-api load failed"));
    document.head.appendChild(script);
  });
  return faceApiPromise;
}

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  const faceapi = (window as any).faceapi;
  // ✅ Fixed CDN URL — jsdelivr weights path was returning 404
  const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
  console.log("✅ Face detection models loaded");
}

export function useDetection({
  isActive, isCandidate, onEvent, onMalpractice, socket, sessionId
}: DetectionOptions) {

  const tabSwitchCount    = useRef(0);
  const tabAwayAt         = useRef<number | null>(null);
  const faceWarnCount     = useRef(0);
  const gazeWarnCount     = useRef(0);
  const faceAbsentSince   = useRef<number | null>(null);
  const faceInterval      = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef          = useRef<HTMLVideoElement | null>(null);
  const malpracticeFired  = useRef(false);
  const devToolsCooldown  = useRef(false);
  const rightClickCooldown = useRef(false);

  // ── Pre-load face-api as soon as candidate page loads ──
  useEffect(() => {
    if (!isCandidate) return;
    loadFaceApi()
      .then(() => loadModels())
      .then(() => console.log("✅ Models ready — face detection can start"))
      .catch(err => console.warn("face-api preload failed:", err));
  }, [isCandidate]);

  // ── Send event to backend + notify recruiter via socket ──
  const fireEvent = useCallback((
    eventType: string, details: string, impact: number
  ) => {
    onEvent(eventType, details, impact);
    socket?.current?.emit("detection-event", { sessionId, eventType, details, impact });
  }, [onEvent, socket, sessionId]);

  /* ─────────────────────────────────────────
     1. TAB SWITCH — 2 warnings then terminate
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!isActive || !isCandidate) return;

    const onHide = () => {
      if (!document.hidden) return;
      tabAwayAt.current = Date.now();
    };

    const onBack = () => {
      if (document.hidden || !tabAwayAt.current) return;
      tabSwitchCount.current++;
      const n        = tabSwitchCount.current;
      const duration = Math.round((Date.now() - tabAwayAt.current) / 1000);
      tabAwayAt.current = null;
      const details  = `Tab switch #${n} — away for ${duration}s`;

      if (n === 1) {
        toast.warning("⚠️ Warning 1/2: Please stay on this tab!", { duration: 8000 });
        fireEvent("tab_switch", details + " — Warning 1/2", -10);
      } else if (n === 2) {
        toast.error("🚨 Final Warning! Next tab switch ends the interview!", { duration: 10000 });
        fireEvent("tab_switch_final", details + " — FINAL WARNING 2/2", -20);
      } else {
        toast.error("🚨 Interview terminated: Too many tab switches!", { duration: 10000 });
        fireEvent("malpractice", details + " — MALPRACTICE: Interview terminated", -30);
        if (!malpracticeFired.current) {
          malpracticeFired.current = true;
          setTimeout(onMalpractice, 3000);
        }
      }
    };

    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onBack);
    };
  }, [isActive, isCandidate, fireEvent, onMalpractice]);

  /* ─────────────────────────────────────────
     2. COPY / PASTE detection
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!isActive || !isCandidate) return;
    const onPaste = () => {
      toast.warning("⚠️ Paste detected", { duration: 5000 });
      fireEvent("paste_detected", "Candidate pasted text — possible AI use", -10);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isActive, isCandidate, fireEvent]);

  /* ─────────────────────────────────────────
     3. DEVTOOLS detection — with cooldown
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!isActive || !isCandidate) return;

    const handleKey = (e: KeyboardEvent) => {
      const isDevTools =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U");

      if (isDevTools) {
        e.preventDefault();
        if (!devToolsCooldown.current) {
          devToolsCooldown.current = true;
          fireEvent("devtools_attempt", "Candidate attempted to open DevTools", -10);
          setTimeout(() => { devToolsCooldown.current = false; }, 10000);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (!rightClickCooldown.current) {
        rightClickCooldown.current = true;
        fireEvent("right_click", "Candidate right-clicked during interview", -3);
        setTimeout(() => { rightClickCooldown.current = false; }, 5000);
      }
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isActive, isCandidate, fireEvent]);

  /* ─────────────────────────────────────────
     4. MULTIPLE MONITOR detection
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!isActive || !isCandidate) return;

    const checkMonitor = () => {
      const onSecondMonitor =
        window.screenX > window.screen.width ||
        window.screenX < -100 ||
        window.screenY < -100;

      if (onSecondMonitor) {
        fireEvent(
          "multiple_monitors",
          `Browser on secondary monitor (screenX: ${window.screenX})`,
          -15
        );
      }
    };

    checkMonitor();
    const interval = setInterval(checkMonitor, 10000);
    return () => clearInterval(interval);
  }, [isActive, isCandidate, fireEvent]);

  /* ─────────────────────────────────────────
     5. FACE DETECTION
        - Multiple faces → immediate warning
        - No face 25s → Warning 1/3
        - No face again → Warning 2/3
        - No face third time → MALPRACTICE
        - Gaze away → soft flag
  ───────────────────────────────────────── */
  const startFaceDetection = useCallback(async (video: HTMLVideoElement) => {
    if (!isCandidate) return;

    console.log("🔍 Starting face detection...");
    videoRef.current = video;

    try {
      await loadFaceApi();
      await loadModels();

      const faceapi = (window as any).faceapi;
      console.log("✅ Face detection starting interval");

      if (faceInterval.current) {
        clearInterval(faceInterval.current);
        faceInterval.current = null;
      }

      // ✅ Find the actual playing local video from DOM
      const getActiveVideo = (): HTMLVideoElement | null => {
        // First try the passed video element
        if (videoRef.current && videoRef.current.readyState >= 2) {
          return videoRef.current;
        }
        // Fallback: find muted playing video = local camera
        const videos = Array.from(document.querySelectorAll("video"));
        for (const v of videos) {
          if (!v.paused && v.readyState >= 2 && v.muted) {
            return v;
          }
        }
        return null;
      };

      faceInterval.current = setInterval(async () => {
        if (malpracticeFired.current) return;

        const activeVideo = getActiveVideo();
        if (!activeVideo) {
          console.log("⏳ Waiting for video...");
          return;
        }

        try {
          const detections = await (faceapi as any)
            .detectAllFaces(
              activeVideo,
              new (faceapi as any).TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
              })
            )
            .withFaceLandmarks(true);

          console.log(`👁 ${detections.length} face(s) detected`);

          // ── Multiple faces ──
          if (detections.length > 1) {
            toast.error(`🚨 Multiple people detected (${detections.length} faces)!`, { duration: 6000 });
            fireEvent(
              "multiple_faces",
              `${detections.length} faces in frame — possible impersonation`,
              -15
            );
            return;
          }

          // ── No face ──
          if (detections.length === 0) {
            if (!faceAbsentSince.current) {
              faceAbsentSince.current = Date.now();
              console.log("⏱ Face absent — 25s timer started");
            }

            const absentSecs = Math.round((Date.now() - faceAbsentSince.current) / 1000);
            console.log(`⏱ Face absent for ${absentSecs}s`);

            if (absentSecs >= 25) {
              faceWarnCount.current++;
              faceAbsentSince.current = null; // reset for next warning

              if (faceWarnCount.current === 1) {
                toast.warning("⚠️ Alert 1/3: Your face is not visible! Please stay in frame.", { duration: 8000 });
                fireEvent("face_not_detected", "Alert 1/3 — Face absent 25+ seconds", -10);
              } else if (faceWarnCount.current === 2) {
                toast.error("🚨 Warning 2/3: Face still not visible — one more = interview ends!", { duration: 9000 });
                fireEvent("face_not_detected_2", "Warning 2/3 — Face absent again. Final warning.", -15);
              } else if (faceWarnCount.current >= 3) {
                toast.error("🚨 Interview terminated: Face not detected repeatedly!", { duration: 10000 });
                fireEvent("malpractice", "Warning 3/3 — MALPRACTICE: Face absent repeatedly. Terminated.", -30);
                if (!malpracticeFired.current) {
                  malpracticeFired.current = true;
                  setTimeout(onMalpractice, 3000);
                }
              }
            }
            return;
          }

          // ── Face present — reset absent timer ──
          if (faceAbsentSince.current) {
            console.log("✅ Face back in frame — timer reset");
            faceAbsentSince.current = null;
          }

          // ── Gaze detection using landmarks ──
          if (detections[0]?.landmarks) {
            const landmarks  = detections[0].landmarks;
            const nose       = landmarks.getNose();
            const leftEye    = landmarks.getLeftEye();
            const rightEye   = landmarks.getRightEye();

            if (nose && leftEye && rightEye) {
              const noseTip    = nose[3];
              const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
              const eyeWidth   = Math.abs(rightEye[3].x - leftEye[0].x);
              const deviation  = eyeWidth > 0
                ? Math.abs(noseTip.x - eyeCenterX) / eyeWidth
                : 0;

              if (deviation > 0.4) {
                gazeWarnCount.current++;
                if (gazeWarnCount.current % 4 === 1) {
                  fireEvent(
                    "gaze_away",
                    `Candidate looking away from screen (deviation: ${deviation.toFixed(2)})`,
                    -3
                  );
                }
              } else {
                gazeWarnCount.current = 0;
              }
            }
          }

        } catch (err) {
          console.warn("Detection frame error:", err);
        }
      }, 3000); // ✅ Check every 3 seconds

    } catch (err) {
      console.warn("❌ Face detection setup failed:", err);
    }
  }, [isCandidate, fireEvent, onMalpractice]);

  const stopFaceDetection = useCallback(() => {
    if (faceInterval.current) {
      clearInterval(faceInterval.current);
      faceInterval.current = null;
    }
    videoRef.current = null;
    console.log("🛑 Face detection stopped");
  }, []);

  useEffect(() => {
    if (!isActive) stopFaceDetection();
  }, [isActive, stopFaceDetection]);

  return { startFaceDetection, stopFaceDetection };
}