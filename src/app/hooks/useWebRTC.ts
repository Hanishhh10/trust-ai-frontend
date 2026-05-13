import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

interface UseWebRTCOptions {
  sessionId: string;
  role: "interviewer" | "candidate";
  isActive: boolean;
}

export function useWebRTC({ sessionId, role, isActive }: UseWebRTCOptions) {
  const socketRef       = useRef<Socket | null>(null);
  const peerRef         = useRef<RTCPeerConnection | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]); // ✅ queue ICE until remote set

  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [candidateAnswer, setCandidateAnswer]  = useState("");

  const sendQuestion = useCallback((q: string) => {
    socketRef.current?.emit("send-question", { sessionId, question: q });
  }, [sessionId]);

  const sendAnswer = useCallback((a: string) => {
    socketRef.current?.emit("send-answer", { sessionId, answer: a });
  }, [sessionId]);

  const emitInterviewStarted = useCallback(() => {
    socketRef.current?.emit("interview-started", { sessionId });
  }, [sessionId]);

  const emitInterviewEnded = useCallback(() => {
    socketRef.current?.emit("interview-ended", { sessionId });
  }, [sessionId]);

  const toggleCamera = useCallback((enabled: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }, []);

  const toggleMic = useCallback((enabled: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }, []);

  const stopTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive || !sessionId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    // ✅ createPeer defined INSIDE useEffect — no stale closure issues
    const createPeer = (stream: MediaStream): RTCPeerConnection => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      });

      // ✅ Add all local tracks
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      // ✅ When remote track arrives — set remoteStream
      peer.ontrack = (event) => {
        console.log("✅ Remote track received:", event.streams[0]);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setRemoteJoined(true);
        }
      };

      // ✅ Send ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { sessionId, candidate: event.candidate });
        }
      };

      peer.onconnectionstatechange = () => {
        console.log("🔗 Peer state:", peer.connectionState);
        if (peer.connectionState === "connected") setRemoteJoined(true);
        if (peer.connectionState === "disconnected" || peer.connectionState === "failed") {
          setRemoteJoined(false);
        }
      };

      peerRef.current = peer;
      return peer;
    };

    // ✅ Flush queued ICE candidates after remoteDescription is set
    const flushICEQueue = async () => {
      while (iceCandidateQueue.current.length > 0) {
        const candidate = iceCandidateQueue.current.shift();
        if (candidate && peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("ICE flush error:", e);
          }
        }
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);

        socket.emit("join-room", { sessionId, role });

        // ── Interviewer: server signals to create offer ──
        socket.on("initiate-offer", async () => {
          console.log("📤 Creating offer...");
          const peer = createPeer(stream);
          const offer = await peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peer.setLocalDescription(offer);
          socket.emit("offer", { sessionId, offer });
        });

        // ── Candidate: receives offer, sends answer ──
        socket.on("offer", async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
          console.log("📥 Received offer, creating answer...");
          const peer = createPeer(stream);
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          await flushICEQueue(); // flush any early ICE
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("answer", { sessionId, answer });
          setRemoteJoined(true);
        });

        // ── Interviewer: receives answer ──
        socket.on("answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          console.log("📥 Received answer...");
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            await flushICEQueue(); // flush any early ICE
          }
        });

        // ── Both: receive ICE candidates ──
        socket.on("ice-candidate", async ({ candidate }) => {
          if (!candidate) return;
          if (peerRef.current?.remoteDescription) {
            try {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("ICE error:", e);
            }
          } else {
            // ✅ Queue it until remoteDescription is ready
            console.log("⏳ Queuing ICE candidate");
            iceCandidateQueue.current.push(candidate);
          }
        });

        // ── Question/Answer via socket ──
        socket.on("receive-question", ({ question }) => {
          setCurrentQuestion(question);
        });

        socket.on("receive-answer", ({ answer }) => {
          setCandidateAnswer(answer);
        });
      })
      .catch((err) => {
        console.error("❌ Camera/mic error:", err);
      });

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerRef.current?.close();
      peerRef.current = null;
      iceCandidateQueue.current = [];
      socket.disconnect();
    };
  }, [isActive, sessionId, role]); // ✅ removed createPeer from deps

  return {
    localStream, remoteStream, remoteJoined,
    currentQuestion, candidateAnswer,
    sendQuestion, sendAnswer,
    emitInterviewStarted, emitInterviewEnded,
    stopTracks, toggleCamera, toggleMic,
    socket: socketRef,
  };
}