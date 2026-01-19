import { useState } from 'react';
import {
  Clock,
  MapPin,
  ExternalLink,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  Beaker,
  Newspaper,
  Pill,
  Users
} from 'lucide-react';

// Types
export type ContentType = 'clinical_trial' | 'news' | 'research_result' | 'discovery' | 'drug_approval' | 'community';
export type Priority = 'urgent' | 'important' | 'relevant' | 'general';

export interface FeedItemData {
  id: string;
  content_type: ContentType;
  priority: Priority;
  relevance_score: number;
  title: string;
  title_original?: string;
  summary: string;
  summary_original?: string;
  personal_relevance: string;
  why_relevant: string[];
  source: string;
  source_url?: string;
  published_at?: string;
  fetched_at: string;
  trial_id?: number;
  nct_id?: string;
  deadline_days?: number;
  location?: string;
  phase?: string;
  is_free?: boolean;
  journal?: string;
  is_saved?: boolean;
  is_read?: boolean;
}

interface SmartCardProps {
  item: FeedItemData;
  onSave?: (id: string) => void;
  onShare?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

// Helper functions
const getPriorityConfig = (priority: Priority) => {
  const configs = {
    urgent: {
      color: 'bg-red-50 border-red-200',
      badge: 'bg-red-500 text-white',
      label: 'URGENT',
      icon: AlertCircle
    },
    important: {
      color: 'bg-orange-50 border-orange-200',
      badge: 'bg-orange-500 text-white',
      label: 'IMPORTANT',
      icon: TrendingUp
    },
    relevant: {
      color: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-500 text-white',
      label: 'RELEVANT',
      icon: null
    },
    general: {
      color: 'bg-gray-50 border-gray-200',
      badge: 'bg-gray-400 text-white',
      label: '',
      icon: null
    }
  };
  return configs[priority];
};

const getContentTypeConfig = (type: ContentType) => {
  const configs = {
    clinical_trial: {
      icon: Beaker,
      label: 'კვლევა',
      color: 'text-blue-600 bg-blue-100'
    },
    news: {
      icon: Newspaper,
      label: 'სიახლე',
      color: 'text-purple-600 bg-purple-100'
    },
    research_result: {
      icon: TrendingUp,
      label: 'შედეგი',
      color: 'text-green-600 bg-green-100'
    },
    discovery: {
      icon: Beaker,
      label: 'აღმოჩენა',
      color: 'text-indigo-600 bg-indigo-100'
    },
    drug_approval: {
      icon: Pill,
      label: 'წამალი',
      color: 'text-teal-600 bg-teal-100'
    },
    community: {
      icon: Users,
      label: 'საზოგადოება',
      color: 'text-pink-600 bg-pink-100'
    }
  };
  return configs[type];
};

export function SmartCard({ item, onSave, onShare, onMarkRead }: SmartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(item.is_saved || false);

  const priorityConfig = getPriorityConfig(item.priority);
  const contentConfig = getContentTypeConfig(item.content_type);
  const ContentIcon = contentConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const handleSave = () => {
    setSaved(!saved);
    onSave?.(item.id);
  };

  const handleShare = () => {
    if (navigator.share && item.source_url) {
      navigator.share({
        title: item.title,
        url: item.source_url
      });
    }
    onShare?.(item.id);
  };

  return (
    <div className={`rounded-xl border-2 ${priorityConfig.color} overflow-hidden transition-all duration-200 hover:shadow-lg`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Left side - badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority badge */}
            {priorityConfig.label && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${priorityConfig.badge} flex items-center gap-1`}>
                {PriorityIcon && <PriorityIcon className="w-3 h-3" />}
                {priorityConfig.label}
              </span>
            )}

            {/* Content type badge */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${contentConfig.color} flex items-center gap-1`}>
              <ContentIcon className="w-3 h-3" />
              {contentConfig.label}
            </span>

            {/* Deadline badge for trials */}
            {item.deadline_days !== undefined && item.deadline_days <= 30 && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.deadline_days} დღე დარჩა
              </span>
            )}
          </div>

          {/* Right side - relevance score */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">{Math.round(item.relevance_score)}%</div>
              <div className="text-xs text-gray-500">შესაბამისობა</div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mt-3 leading-tight">
          {item.title}
        </h3>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            📍 {item.source}
          </span>
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {item.location}
            </span>
          )}
          {item.phase && (
            <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
              {item.phase}
            </span>
          )}
          {item.is_free && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
              💰 უფასო
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-2">
        <p className="text-gray-600 text-sm leading-relaxed">
          {item.summary}
        </p>
      </div>

      {/* Personal Relevance Section */}
      <div className="mx-4 my-2 p-3 bg-white/70 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">რატომ შეგეფერებათ:</div>
            <p className="text-sm text-gray-600">{item.personal_relevance}</p>
          </div>
        </div>
      </div>

      {/* Expandable Why Relevant */}
      {item.why_relevant && item.why_relevant.length > 0 && (
        <div className="px-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 py-2"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'ნაკლები' : 'მეტი დეტალები'}
          </button>

          {expanded && (
            <ul className="pb-3 space-y-1">
              {item.why_relevant.map((reason, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="mt-0.5">{reason.startsWith('✓') || reason.startsWith('⚠️') || reason.startsWith('📊') || reason.startsWith('📚') || reason.startsWith('⏳') || reason.startsWith('🔬') ? '' : '•'}</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/50 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              დეტალები
            </a>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className={`p-2 rounded-lg transition-colors ${
              saved
                ? 'bg-yellow-100 text-yellow-600'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={saved ? 'შენახული' : 'შენახვა'}
          >
            <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="გაზიარება"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmartCard;
