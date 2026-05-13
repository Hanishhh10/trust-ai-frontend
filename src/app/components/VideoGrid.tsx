import { useEffect, useRef } from "react";
import { User, VideoOff } from "lucide-react";
import { Badge } from "./ui/badge";

interface VideoGridProps {
  localStream:  MediaStream | null;
  remoteStream: MediaStream | null;
  isRecruiter:  boolean;
  remoteJoined: boolean;
  isCameraOn:   boolean;
  isMicOn:      boolean;
  status:       "created" | "ongoing" | "completed";
}

function VideoBox({
  stream, label, isYou, cameraOn, muted
}: {
  stream:    MediaStream | null;
  label:     string;
  isYou:     boolean;
  cameraOn?: boolean;
  muted:     boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  const showVideo = stream && cameraOn !== false;

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center h-full">

      <video
  ref={videoRef}
  autoPlay
  playsInline
  muted={muted}
  style={isYou ? { transform: "scaleX(-1)" } : {}}
  className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"}`}
/>
      {/* Avatar — shown when no stream or camera off */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-white" />
          </div>
          <p className="text-white font-medium">{label}</p>
          {isYou && <p className="text-gray-400 text-sm mt-1">You</p>}
        </div>
      )}

      {/* Label overlay at bottom */}
      <div className="absolute bottom-3 left-3 flex gap-2 z-10">
        <Badge className="text-xs bg-black/70 text-white border-0 hover:bg-black/70">
          {label}
        </Badge>
        {isYou && (
          <Badge className="text-xs bg-black/70 text-white border-0 hover:bg-black/70">
            You
          </Badge>
        )}
        {cameraOn === false && isYou && (
          <Badge className="text-xs bg-red-600 border-0">
            <VideoOff className="w-3 h-3 mr-1" /> Off
          </Badge>
        )}
      </div>

      {/* Muted indicator */}
      {!muted === false && isYou && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="text-xs bg-red-600 border-0">🔇</Badge>
        </div>
      )}
    </div>
  );
}

export function VideoGrid({
  localStream, remoteStream, isRecruiter,
  remoteJoined, isCameraOn, isMicOn, status
}: VideoGridProps) {

  // Mic control
  useEffect(() => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = isMicOn; });
  }, [isMicOn, localStream]);

  // Camera control
  useEffect(() => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = isCameraOn; });
  }, [isCameraOn, localStream]);

  return (
    <div className="h-full p-4 grid grid-cols-2 gap-4 relative">

      {/* LEFT — your own camera */}
      <VideoBox
        stream={localStream}
        label={isRecruiter ? "Recruiter" : "Candidate"}
        isYou={true}
        cameraOn={isCameraOn}
        muted={true}
      />

      {/* RIGHT — remote person */}
      {remoteJoined && remoteStream ? (
        <VideoBox
          stream={remoteStream}
          label={isRecruiter ? "Candidate" : "Recruiter"}
          isYou={false}
          cameraOn={true}
          muted={false}
        />
      ) : (
        <div className="relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3">
              <VideoOff className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-400 font-medium">
              {isRecruiter ? "Waiting for candidate..." : "Waiting for recruiter..."}
            </p>
            <p className="text-gray-500 text-sm mt-1">They will join shortly</p>
          </div>
        </div>
      )}

      {/* Interview ended overlay */}
      {status === "completed" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm rounded-xl col-span-2 z-10">
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">Interview Ended</h3>
            <p className="text-gray-400">The session has been completed</p>
          </div>
        </div>
      )}
    </div>
  );
}