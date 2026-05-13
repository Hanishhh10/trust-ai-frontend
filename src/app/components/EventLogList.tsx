import { ScrollArea } from "./ui/scroll-area";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface InterviewEvent {
  id: string;
  type: string;
  details: string;
  timestamp: string;
  trustImpact: number;
}

interface EventLogListProps {
  events: InterviewEvent[];
}

export function EventLogList({ events }: EventLogListProps) {
  const getEventIcon = (type: string) => {
    if (type.includes("started")) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (type.includes("ended")) return <Info className="w-4 h-4 text-blue-400" />;
    if (type.includes("no_face") || type.includes("multiple_faces")) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  };

  const getEventBgColor = (type: string) => {
    if (type.includes("started")) return "bg-green-900/20 border-green-700";
    if (type.includes("ended")) return "bg-blue-900/20 border-blue-700";
    if (type.includes("no_face") || type.includes("multiple_faces")) {
      return "bg-red-900/20 border-red-700";
    }
    return "bg-yellow-900/20 border-yellow-700";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No events logged yet</p>
          <p className="text-xs text-gray-600 mt-1">Events will appear here during the interview</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-3 py-4">
        {events.map((event) => (
          <div
            key={event.id}
            className={`border rounded-lg p-3 ${getEventBgColor(event.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 font-medium">
                  {event.details}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-xs text-gray-400">
                    {formatTime(event.timestamp)}
                  </p>
                  {event.trustImpact !== 0 && (
                    <span
                      className={`text-xs font-medium ${
                        event.trustImpact > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {event.trustImpact > 0 ? "+" : ""}
                      {event.trustImpact} points
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
