import React from 'react';
import { useStore } from '../store/useStore';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function AlertPanel() {
  const { alerts, markAlertRead, clearAlerts } = useStore();
  const unreadAlerts = alerts.filter(a => !a.read);

  if (unreadAlerts.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <Info className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-500/50 bg-red-500/10';
      case 'medium':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between bg-intel-700/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {unreadAlerts.length}
            </span>
          </div>
          <h2 className="font-semibold text-white">Active Alerts</h2>
        </div>

        <button
          onClick={clearAlerts}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Alerts list */}
      <div className="divide-y divide-intel-700 max-h-48 overflow-y-auto">
        {unreadAlerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 flex items-start gap-3 border-l-2 ${getSeverityStyle(alert.severity)}`}
          >
            {/* Icon */}
            {getSeverityIcon(alert.severity)}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white">{alert.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
              <span className="text-xs text-gray-500 mt-1 block">
                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
              </span>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => markAlertRead(alert.id)}
              className="p-1 hover:bg-intel-600 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertPanel;
