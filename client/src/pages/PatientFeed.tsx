import { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  User,
  Calendar,
  Filter
} from 'lucide-react';
import { SmartCard, type FeedItemData, type ContentType } from '../components/feed/SmartCard';
import { ContentFilters } from '../components/feed/ContentFilters';

// Mock data - would come from API
const mockFeedItems: FeedItemData[] = [
  {
    id: "trial_1",
    content_type: "clinical_trial",
    priority: "urgent",
    relevance_score: 94,
    title: "ღეროვანი უჯრედების თერაპია HIE-სთვის",
    title_original: "Umbilical Cord Blood Therapy for HIE",
    summary: "კვლევა ამოწმებს შეუძლია თუ არა ჭიპლის სისხლის უჯრედებს დაეხმაროს ბავშვებს ტვინის დაზიანების აღდგენაში. მონაწილეობა სრულიად უფასოა და მოიცავს მგზავრობის ხარჯებს.",
    personal_relevance: "ეს კვლევა ზუსტად ნიკას მდგომარეობას ეხება. ასაკი და დიაგნოზი შეესაბამება კრიტერიუმებს.",
    why_relevant: [
      "✓ ასაკი (2 წელი) შეესაბამება",
      "✓ დიაგნოზი (HIE) ზუსტად ემთხვევა",
      "✓ მონაწილეობა უფასოა",
      "⚠️ რეკრუტირება იხურება 14 დღეში"
    ],
    source: "ClinicalTrials.gov",
    source_url: "https://clinicaltrials.gov/study/NCT05123456",
    fetched_at: new Date().toISOString(),
    nct_id: "NCT05123456",
    deadline_days: 14,
    location: "Duke University, აშშ",
    phase: "Phase 2",
    is_free: true
  },
  {
    id: "news_1",
    content_type: "news",
    priority: "important",
    relevance_score: 87,
    title: "მეცნიერებმა აღმოაჩინეს რატომ ეხმარება გაგრილება ბავშვებს HIE-ს დროს",
    summary: "ახალმა კვლევამ გამოავლინა მოლეკულური მექანიზმი, რომელიც ხსნის თერაპიული ჰიპოთერმიის (გაგრილების) ეფექტურობას ახალშობილებში.",
    personal_relevance: "ეს აღმოჩენა დაეხმარება უკეთესი მკურნალობის შექმნას HIE-სთვის მომავალში.",
    why_relevant: [
      "✓ პირდაპირ ეხება HIE-ს",
      "✓ ახსნის არსებული მკურნალობის მოქმედებას",
      "📚 სამეცნიერო სტატია Nature Medicine-ში"
    ],
    source: "Nature Medicine",
    source_url: "https://nature.com/articles/example",
    published_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    journal: "Nature Medicine"
  },
  {
    id: "result_1",
    content_type: "research_result",
    priority: "important",
    relevance_score: 82,
    title: "EPO თერაპიის Phase 3 შედეგები: 67% გაუმჯობესება",
    summary: "340 ბავშვის კვლევამ აჩვენა რომ ერითროპოეტინი (EPO) უსაფრთხო და ეფექტურია HIE-ს მკურნალობაში. ეს არის ბოლო ეტაპი FDA დამტკიცებამდე.",
    personal_relevance: "ეს წამალი შესაძლოა მალე დამტკიცდეს. შეგიძლიათ ექიმს ჰკითხოთ ამის შესახებ.",
    why_relevant: [
      "✓ HIE-ს ეხება",
      "✓ Phase 3 = ბოლო ეტაპი დამტკიცებამდე",
      "📊 67% პაციენტს გაუმჯობესდა მოტორული ფუნქცია",
      "✓ უსაფრთხოების პრობლემა არ გამოვლენილა"
    ],
    source: "JAMA Pediatrics",
    source_url: "https://jamanetwork.com/example",
    fetched_at: new Date().toISOString(),
    journal: "JAMA Pediatrics"
  },
  {
    id: "discovery_1",
    content_type: "discovery",
    priority: "relevant",
    relevance_score: 71,
    title: "Stanford-ის მეცნიერებმა ახალი გენური თერაპია შექმნეს ტვინის უჯრედების აღსადგენად",
    summary: "ახალი მიდგომა იყენებს გენურ რედაქტირებას დაზიანებული ნეირონების აღსადგენად. კვლევა ჯერ ცხოველებზე ჩატარდა.",
    personal_relevance: "ეს ჯერ ადრეულ ეტაპზეა (ცხოველებზე ტესტირება), მაგრამ პერსპექტიული მიმართულებაა 5-10 წლის პერსპექტივაში.",
    why_relevant: [
      "✓ ტვინის დაზიანებას ეხება",
      "⏳ ჯერ ადრეული ეტაპია (5-10 წელი ადამიანებზე კვლევამდე)",
      "🔬 Preprint - ჯერ არ არის peer-reviewed"
    ],
    source: "bioRxiv",
    source_url: "https://biorxiv.org/example",
    fetched_at: new Date().toISOString(),
    journal: "bioRxiv (preprint)"
  },
  {
    id: "trial_2",
    content_type: "clinical_trial",
    priority: "relevant",
    relevance_score: 76,
    title: "რეაბილიტაციის ახალი მეთოდი ცერებრული დამბლისთვის",
    summary: "კვლევა ამოწმებს ინტენსიური ფიზიკური თერაპიის ახალ პროტოკოლს, რომელიც აერთიანებს ტრადიციულ მეთოდებს ვირტუალურ რეალობასთან.",
    personal_relevance: "თუ ნიკას აქვს მოძრაობის პრობლემები, ეს კვლევა შეიძლება საინტერესო იყოს.",
    why_relevant: [
      "✓ ასაკი შეესაბამება (1-5 წელი)",
      "⚠️ დიაგნოზი: ცერებრული დამბლა (HIE-სთან დაკავშირებული)",
      "📍 მიუნხენი, გერმანია"
    ],
    source: "EU Clinical Trials",
    source_url: "https://euclinicaltrials.eu/example",
    fetched_at: new Date().toISOString(),
    location: "მიუნხენი, გერმანია",
    phase: "Phase 3",
    is_free: true
  }
];

export default function PatientFeed() {
  const [feedItems, setFeedItems] = useState<FeedItemData[]>(mockFeedItems);
  const [activeFilters, setActiveFilters] = useState<ContentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  const handleSave = (id: string) => {
    setFeedItems(items =>
      items.map(item =>
        item.id === id ? { ...item, is_saved: !item.is_saved } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ნიკას Feed</h1>
              <p className="text-sm text-gray-500">
                HIE (ჰიპოქსიურ-იშემიური ენცეფალოპათია) • 2 წლის
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50"
                title="განახლება"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors relative"
                title="შეტყობინებები"
              >
                <Bell className="w-5 h-5" />
                {urgentCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {urgentCount}
                  </span>
                )}
              </button>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="პარამეტრები"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{feedItems.length}</div>
            <div className="text-sm text-gray-500">სულ</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <div className="text-sm text-red-600">სასწრაფო</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{stats['clinical_trial'] || 0}</div>
            <div className="text-sm text-blue-600">კვლევა</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{(stats['news'] || 0) + (stats['discovery'] || 0)}</div>
            <div className="text-sm text-purple-600">სიახლე</div>
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
