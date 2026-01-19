import { useState } from 'react';
import {
  Beaker,
  Newspaper,
  TrendingUp,
  Pill,
  Filter,
  X
} from 'lucide-react';
import type { ContentType } from './SmartCard';

interface ContentFiltersProps {
  activeFilters: ContentType[];
  onFilterChange: (filters: ContentType[]) => void;
  stats?: Record<string, number>;
}

const filterOptions: { type: ContentType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'clinical_trial', label: 'კვლევები', icon: Beaker, color: 'blue' },
  { type: 'news', label: 'სიახლეები', icon: Newspaper, color: 'purple' },
  { type: 'research_result', label: 'შედეგები', icon: TrendingUp, color: 'green' },
  { type: 'discovery', label: 'აღმოჩენები', icon: Beaker, color: 'indigo' },
  { type: 'drug_approval', label: 'წამლები', icon: Pill, color: 'teal' },
];

export function ContentFilters({ activeFilters, onFilterChange, stats }: ContentFiltersProps) {
  const [showAll, setShowAll] = useState(activeFilters.length === 0);

  const toggleFilter = (type: ContentType) => {
    if (activeFilters.includes(type)) {
      const newFilters = activeFilters.filter(f => f !== type);
      onFilterChange(newFilters);
      if (newFilters.length === 0) setShowAll(true);
    } else {
      setShowAll(false);
      onFilterChange([...activeFilters, type]);
    }
  };

  const selectAll = () => {
    setShowAll(true);
    onFilterChange([]);
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 text-gray-600 hover:bg-gray-200';

    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 ring-2 ring-blue-300',
      purple: 'bg-purple-100 text-purple-700 ring-2 ring-purple-300',
      green: 'bg-green-100 text-green-700 ring-2 ring-green-300',
      indigo: 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300',
      teal: 'bg-teal-100 text-teal-700 ring-2 ring-teal-300',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">ფილტრი:</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={selectAll}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            showAll
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ყველა
          {stats && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              showAll ? 'bg-gray-600' : 'bg-gray-200'
            }`}>
              {Object.values(stats).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {/* Individual filters */}
        {filterOptions.map(({ type, label, icon: Icon, color }) => {
          const isActive = !showAll && activeFilters.includes(type);
          const count = stats?.[type] || 0;

          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                getColorClasses(color, isActive)
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/30' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active filters summary */}
      {!showAll && activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">არჩეული:</span>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map(type => {
              const option = filterOptions.find(o => o.type === type);
              if (!option) return null;

              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                >
                  {option.label}
                  <button
                    onClick={() => toggleFilter(type)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-800 ml-auto"
          >
            გასუფთავება
          </button>
        </div>
      )}
    </div>
  );
}

export default ContentFilters;
