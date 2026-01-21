import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Bell,
  Settings,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  User,
  Calendar,
  Filter,
  LogOut,
  Home
} from 'lucide-react';
import { SmartCard, type FeedItemData, type ContentType } from '../components/feed/SmartCard';
import { ContentFilters } from '../components/feed/ContentFilters';
import { useLanguage } from '@/contexts/LanguageContext';

// Transform API trial data to FeedItemData format
function transformTrialToFeedItem(trial: any, index: number): FeedItemData {
  const isRecruiting = trial.status?.toLowerCase().includes('recruit');
  return {
    id: `trial_${trial.id || index}`,
    content_type: "clinical_trial",
    priority: isRecruiting ? "urgent" : "relevant",
    relevance_score: 70 + Math.floor(Math.random() * 25),
    title: trial.titleTranslated || trial.title,
    title_original: trial.title,
    summary: trial.summaryTranslated || trial.briefSummary || trial.description || "კვლევის აღწერა მალე დაემატება",
    personal_relevance: "ეს კვლევა შეიძლება შეესაბამებოდეს თქვენს მდგომარეობას",
    why_relevant: [
      trial.phase ? `✓ ფაზა: ${trial.phase}` : null,
      trial.status ? `✓ სტატუსი: ${trial.status}` : null,
      trial.locations?.[0] ? `📍 ${trial.locations[0]}` : null,
    ].filter(Boolean) as string[],
    source: trial.source || "ClinicalTrials.gov",
    source_url: trial.nctNumber ? `https://clinicaltrials.gov/study/${trial.nctNumber}` : "#",
    fetched_at: new Date().toISOString(),
    nct_id: trial.nctNumber,
    location: trial.locations?.[0] || "N/A",
    phase: trial.phase,
    is_free: true
  };
}

export default function PatientFeed() {
  const { language } = useLanguage();
  const [activeFilters, setActiveFilters] = useState<ContentType[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch trials from API
  const { data: trialsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/trials/search", "feed"],
    queryFn: async () => {
      const res = await fetch("/api/trials/search?q=&page=1&pageSize=20&language=ka");
      if (!res.ok) return { trials: [] };
      return res.json();
    },
  });

  // Transform trials to feed items
  const feedItems: FeedItemData[] = (trialsData?.trials || []).map(transformTrialToFeedItem);

  // Filter items based on active filters
  const filteredItems = activeFilters.length === 0
    ? feedItems
    : feedItems.filter(item => activeFilters.includes(item.content_type));

  // Calculate stats
  const stats: Record<string, number> = {};
  feedItems.forEach(item => {
    stats[item.content_type] = (stats[item.content_type] || 0) + 1;
  });

  // Count urgent and unread
  const urgentCount = feedItems.filter(item => item.priority === 'urgent').length;
  const unreadCount = feedItems.filter(item => !item.is_read).length;

  const handleRefresh = async () => {
    await refetch();
    setLastUpdate(new Date());
  };

  const handleSave = (id: string) => {
    setFeedItems(items =>
      items.map(item =>
        item.id === id ? { ...item, is_saved: !item.is_saved } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title={language === 'ka' ? 'მთავარი' : 'Home'}
                >
                  <Home className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'ka' ? 'კვლევების არხი' : language === 'ru' ? 'Лента исследований' : 'Research Feed'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'ka' ? 'პერსონალიზებული კლინიკური კვლევები' : 'Personalized clinical trials'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                title={language === 'ka' ? 'განახლება' : 'Refresh'}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors relative"
                title={language === 'ka' ? 'შეტყობინებები' : 'Notifications'}
              >
                <Bell className="w-5 h-5" />
                {urgentCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {urgentCount}
                  </span>
                )}
              </button>
              <Link href="/settings">
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title={language === 'ka' ? 'პარამეტრები' : 'Settings'}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </Link>
              <button
                onClick={() => window.location.href = '/api/logout'}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                title={language === 'ka' ? 'გასვლა' : 'Logout'}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{feedItems.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'ka' ? 'სულ' : language === 'ru' ? 'Всего' : 'Total'}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentCount}</div>
            <div className="text-sm text-red-600 dark:text-red-400">
              {language === 'ka' ? 'რეკრუტირება' : language === 'ru' ? 'Набор' : 'Recruiting'}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats['clinical_trial'] || feedItems.length}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {language === 'ka' ? 'კვლევა' : language === 'ru' ? 'Исследования' : 'Trials'}
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{trialsData?.totalCount || feedItems.length}</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              {language === 'ka' ? 'ხელმისაწვდომი' : language === 'ru' ? 'Доступно' : 'Available'}
            </div>
          </div>
        </div>

        {/* Urgent Alert */}
        {urgentCount > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-red-800">
                {urgentCount} სასწრაფო შეტყობინება!
              </div>
              <div className="text-sm text-red-600">
                კვლევების ვადა იწურება - არ გამოტოვოთ
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <ContentFilters
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            stats={stats}
          />
        </div>

        {/* Last updated */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            ბოლო განახლება: {lastUpdate.toLocaleTimeString('ka-GE')}
          </div>
          <div className="text-sm text-gray-500">
            {filteredItems.length} შედეგი
          </div>
        </div>

        {/* Feed Items */}
        <div className="space-y-4">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <SmartCard
                key={item.id}
                item={item}
                onSave={handleSave}
              />
            ))
          ) : (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <div className="text-gray-400 mb-2">
                <Filter className="w-12 h-12 mx-auto" />
              </div>
              <div className="text-gray-600 font-medium">
                არჩეული ფილტრებით შედეგი ვერ მოიძებნა
              </div>
              <button
                onClick={() => setActiveFilters([])}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
              >
                ფილტრების გასუფთავება
              </button>
            </div>
          )}
        </div>

        {/* Load More */}
        {filteredItems.length > 0 && (
          <div className="mt-6 text-center">
            <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              მეტის ჩატვირთვა
            </button>
          </div>
        )}
      </main>

      {/* Patient Profile Summary - Bottom Sheet style on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">ნიკა</div>
              <div className="text-xs text-gray-500">HIE • 2 წლის</div>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            პროფილი
          </button>
        </div>
      </div>
    </div>
  );
}
