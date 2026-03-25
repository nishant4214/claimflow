import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Briefcase, Globe, MapPin } from 'lucide-react';

const HEAD_ICONS = {
  'Travel Expenses': '✈️',
  'Food Expenses': '🍽️',
  'Hotel Accommodation': '🏨',
  'Office Expenses': '🖥️',
  'Torch Bearer': '🔥',
  'Sales Promotion': '📢',
  'default': '📁'
};

export default function ClaimCategorySidebar({ headGroups, selectedHead, selectedSubHead, onSelect, travelType, onTravelTypeChange }) {
  const [expandedHeads, setExpandedHeads] = useState({});

  // Auto-expand selected head
  React.useEffect(() => {
    if (selectedHead) setExpandedHeads(prev => ({ ...prev, [selectedHead]: true }));
  }, [selectedHead]);

  const toggleHead = (head) => {
    setExpandedHeads(prev => ({ ...prev, [head]: !prev[head] }));
  };

  const heads = Object.keys(headGroups);

  return (
    <aside className="w-56 bg-white border-r flex-shrink-0 overflow-y-auto flex flex-col">
      <div className="px-4 py-3 border-b bg-blue-600">
        <p className="text-white font-semibold text-sm flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Expense Categories
        </p>
      </div>

      {/* Travel Type Selector */}
      {heads.some(h => h.toLowerCase().includes('travel')) && (
        <div className="px-3 py-2 border-b bg-gray-50">
          <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1.5">Travel Type</p>
          <div className="flex gap-1">
            {['Domestic', 'International'].map(t => (
              <button
                key={t}
                onClick={() => onTravelTypeChange(t)}
                className={`flex-1 text-xs py-1 px-2 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
                  travelType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border text-gray-600 hover:bg-blue-50'
                }`}
              >
                {t === 'Domestic' ? <MapPin className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 py-2">
        {heads.map(head => {
          const isExpanded = expandedHeads[head] !== false;
          const isActive = selectedHead === head;
          const icon = HEAD_ICONS[head] || HEAD_ICONS['default'];
          const subHeads = headGroups[head];

          return (
            <div key={head}>
              <button
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  toggleHead(head);
                  if (subHeads.length === 1) {
                    onSelect(head, subHeads[0]);
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span className="leading-tight">{head}</span>
                </span>
                {subHeads.length > 1 && (
                  isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {isExpanded && subHeads.length > 1 && (
                <div className="bg-gray-50 overflow-hidden">
                  {subHeads.map(sub => (
                    <button
                      key={sub.id}
                      className={`w-full text-left px-8 py-2 text-xs transition-colors border-l-2 ml-0 ${
                        selectedSubHead?.id === sub.id
                          ? 'border-l-blue-500 bg-blue-50 text-blue-800 font-semibold'
                          : 'border-l-transparent text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-l-blue-300'
                      }`}
                      onClick={() => onSelect(head, sub)}
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}