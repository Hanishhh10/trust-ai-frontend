import { Button } from "./ui/button";
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MoreVertical, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface ControlBarProps {
  status: "created" | "ongoing" | "completed";
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSimulateEvent: (type: string, details: string, impact: number) => void;
  isRecruiter: boolean;
}

export function ControlBar({
  status, isMicOn, isCameraOn,
  onToggleMic, onToggleCamera,
  onSimulateEvent, isRecruiter
}: ControlBarProps) {
  const active = status === "ongoing";

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <Button
        variant={isMicOn ? "secondary" : "destructive"}
        size="lg" onClick={onToggleMic} disabled={!active}
        className="rounded-full w-14 h-14" title={isMicOn ? "Mute" : "Unmute"}
      >
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </Button>

      <Button
        variant={isCameraOn ? "secondary" : "destructive"}
        size="lg" onClick={onToggleCamera} disabled={!active}
        className="rounded-full w-14 h-14" title={isCameraOn ? "Camera off" : "Camera on"}
      >
        {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </Button>

      <Button variant="secondary" size="lg" disabled className="rounded-full w-14 h-14 opacity-40">
        <MonitorOff className="w-5 h-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="lg" className="rounded-full w-14 h-14">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-4 flex items-center gap-2">
        {active    && <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-gray-300">● Monitoring</span></>}
        {status === "created"   && <span className="text-sm text-gray-500">Not started</span>}
        {status === "completed" && <span className="text-sm text-gray-500">Ended</span>}
      </div>
    </div>
  );
}