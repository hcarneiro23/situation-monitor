import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Calendar, Clock, AlertTriangle, ChevronRight,
  Landmark, BarChart2, Vote, Globe, Fuel
} from 'lucide-react';
import { format, differenceInDays, isThisWeek, isThisMonth } from 'date-fns';

function CatalystTimeline() {
  const { events } = useStore();
  const [filter, setFilter] = useState('all');
  const [expandedEvent, setExpandedEvent] = useState(null);

  const getEventIcon = (type) => {
    switch (type) {
      case 'central_bank':
        return <Landmark className="w-4 h-4" />;
      case 'economic_data':
        return <BarChart2 className="w-4 h-4" />;
      case 'election':
      case 'political':
        return <Vote className="w-4 h-4" />;
      case 'commodity':
        return <Fuel className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'imminent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'this_week':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'next_two_weeks':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSensitivityBadge = (sensitivity) => {
    switch (sensitivity) {
      case 'very_high':
        return <span className="badge badge-high">Very High</span>;
      case 'high':
        return <span className="badge badge-medium">High</span>;
      default:
        return <span className="badge badge-neutral">Medium</span>;
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'imminent') return event.daysUntil <= 7;
    if (filter === 'high') return event.sensitivity === 'high' || event.sensitivity === 'very_high';
    return event.type === filter;
  });

  // Group events by time period
  const groupedEvents = {
    imminent: filteredEvents.filter(e => e.daysUntil <= 2),
    thisWeek: filteredEvents.filter(e => e.daysUntil > 2 && e.daysUntil <= 7),
    thisMonth: filteredEvents.filter(e => e.daysUntil > 7 && e.daysUntil <= 30),
    later: filteredEvents.filter(e => e.daysUntil > 30)
  };

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-rose-400" />
            <h2 className="font-semibold text-white">Catalyst Timeline</h2>
          </div>
          <span className="text-xs text-gray-500">{events.length} upcoming events</span>
        </div>

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'imminent', label: 'This Week' },
            { value: 'high', label: 'High Impact' },
            { value: 'central_bank', label: 'Central Banks' },
            { value: 'economic_data', label: 'Data' },
            { value: 'political', label: 'Political' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-rose-500 text-white'
                  : 'bg-intel-700 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[600px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events match your filter</p>
          </div>
        ) : (
          <>
            {/* Imminent events */}
            {groupedEvents.imminent.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-500/10 text-xs font-medium text-red-400 uppercase tracking-wide sticky top-0 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  Imminent (Next 48 Hours)
                </div>
                {groupedEvents.imminent.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    expanded={expandedEvent === event.id}
                    onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    getEventIcon={getEventIcon}
                    getUrgencyStyle={getUrgencyStyle}
                    getSensitivityBadge={getSensitivityBadge}
                  />
                ))}
              </div>
            )}

            {/* This week */}
            {groupedEvents.thisWeek.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-amber-500/10 text-xs font-medium text-amber-400 uppercase tracking-wide sticky top-0">
                  This Week
                </div>
                {groupedEvents.thisWeek.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    expanded={expandedEvent === event.id}
                    onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    getEventIcon={getEventIcon}
                    getUrgencyStyle={getUrgencyStyle}
                    getSensitivityBadge={getSensitivityBadge}
                  />
                ))}
              </div>
            )}

            {/* This month */}
            {groupedEvents.thisMonth.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-500/10 text-xs font-medium text-blue-400 uppercase tracking-wide sticky top-0">
                  This Month
                </div>
                {groupedEvents.thisMonth.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    expanded={expandedEvent === event.id}
                    onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    getEventIcon={getEventIcon}
                    getUrgencyStyle={getUrgencyStyle}
                    getSensitivityBadge={getSensitivityBadge}
                  />
                ))}
              </div>
            )}

            {/* Later */}
            {groupedEvents.later.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-intel-700/50 text-xs font-medium text-gray-400 uppercase tracking-wide sticky top-0">
                  Upcoming
                </div>
                {groupedEvents.later.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    expanded={expandedEvent === event.id}
                    onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    getEventIcon={getEventIcon}
                    getUrgencyStyle={getUrgencyStyle}
                    getSensitivityBadge={getSensitivityBadge}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-intel-700 bg-intel-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              High Impact
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Medium Impact
            </span>
          </div>
          <span>Click event for details</span>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, expanded, onToggle, getEventIcon, getUrgencyStyle, getSensitivityBadge }) {
  return (
    <div
      className={`p-4 border-b border-intel-700 hover:bg-intel-700/30 transition-colors cursor-pointer ${
        event.daysUntil <= 2 ? 'bg-red-500/5' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Date badge */}
        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${getUrgencyStyle(event.urgency)}`}>
          <span className="text-lg font-bold">{format(new Date(event.date), 'd')}</span>
          <span className="text-xs uppercase">{format(new Date(event.date), 'MMM')}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400">{getEventIcon(event.type)}</span>
            <h3 className="text-sm font-medium text-white truncate">{event.name}</h3>
          </div>
          <p className="text-xs text-gray-400 line-clamp-1">{event.description}</p>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-2">
            {getSensitivityBadge(event.sensitivity)}
            <span className="text-xs text-gray-500">
              {event.daysUntil === 0 ? 'Today' :
               event.daysUntil === 1 ? 'Tomorrow' :
               `${event.daysUntil} days`}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <ChevronRight
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-intel-600 animate-slide-in">
          {/* What to watch */}
          {event.whatToWatch && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">What to Watch</div>
              <p className="text-sm text-gray-300">{event.whatToWatch}</p>
            </div>
          )}

          {/* Potential impact */}
          {event.potentialImpact && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Potential Impact</div>
              <p className="text-sm text-gray-300">{event.potentialImpact}</p>
            </div>
          )}

          {/* Affected markets */}
          {event.markets && event.markets.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Affected Markets</div>
              <div className="flex flex-wrap gap-1">
                {event.markets.map((market, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-intel-600 rounded text-gray-300"
                  >
                    {market}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CatalystTimeline;
