import { Shield, TrendingDown, TrendingUp } from "lucide-react";

interface TrustScoreCardProps {
  score: number;
}

export function TrustScoreCard({ score }: TrustScoreCardProps) {
  const getScoreColor = () => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBgColor = () => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = () => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getScoreIcon = () => {
    if (score >= 70) {
      return <TrendingUp className="w-5 h-5" />;
    }
    return <TrendingDown className="w-5 h-5" />;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-medium text-gray-300">Trust Score</h3>
      </div>
      
      <div className="flex items-end gap-3 mb-4">
        <div className={`text-5xl font-bold ${getScoreColor()}`}>
          {score}
        </div>
        <div className="mb-2">
          <div className={`flex items-center gap-1 ${getScoreColor()}`}>
            {getScoreIcon()}
            <span className="text-sm font-medium">{getScoreLabel()}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getScoreBgColor()}`}
            style={{ width: `${score}%` }}
          />
        </div>
        
        {/* Score Range Labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Score Indicators */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-400">90-100: Excellent</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-400">70-89: Good</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-gray-400">40-69: Fair</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">0-39: Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
