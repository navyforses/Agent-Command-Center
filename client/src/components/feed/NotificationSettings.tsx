import { useState } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Save,
  X
} from 'lucide-react';

interface NotificationSettingsData {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'urgent_only';
  notify_trials: boolean;
  notify_results: boolean;
  notify_discoveries: boolean;
  notify_news: boolean;
  urgent_threshold: number;
  email_digest_day: string;
  email_digest_hour: number;
}

interface NotificationSettingsProps {
  settings: NotificationSettingsData;
  onSave: (settings: NotificationSettingsData) => void;
  onClose?: () => void;
}

const frequencyOptions = [
  { value: 'realtime', label: 'დაუყოვნებლივ', desc: 'ყველა სიახლე მაშინვე' },
  { value: 'daily', label: 'ყოველდღე', desc: 'დღიური შეჯამება' },
  { value: 'weekly', label: 'კვირაში ერთხელ', desc: 'კვირეული შეჯამება (რეკომენდებული)' },
  { value: 'monthly', label: 'თვეში ერთხელ', desc: 'თვიური შეჯამება' },
  { value: 'urgent_only', label: 'მხოლოდ სასწრაფო', desc: '>90% შესაბამისობა' },
];

const dayOptions = [
  { value: 'monday', label: 'ორშაბათი' },
  { value: 'tuesday', label: 'სამშაბათი' },
  { value: 'wednesday', label: 'ოთხშაბათი' },
  { value: 'thursday', label: 'ხუთშაბათი' },
  { value: 'friday', label: 'პარასკევი' },
  { value: 'saturday', label: 'შაბათი' },
  { value: 'sunday', label: 'კვირა' },
];

export function NotificationSettings({ settings: initialSettings, onSave, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsData>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof NotificationSettingsData>(
    key: K,
    value: NotificationSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(settings);
    setHasChanges(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">შეტყობინებების პარამეტრები</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Channels */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            როგორ გაცნობოთ?
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">Email</div>
                  <div className="text-sm text-gray-500">მიიღეთ შეტყობინებები ელ-ფოსტაზე</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => updateSetting('email_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">Push შეტყობინებები</div>
                  <div className="text-sm text-gray-500">ბრაუზერის შეტყობინებები</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.push_enabled}
                onChange={(e) => updateSetting('push_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">SMS</div>
                  <div className="text-sm text-gray-500">მხოლოდ სასწრაფო შეტყობინებები</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sms_enabled}
                onChange={(e) => updateSetting('sms_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </section>

        {/* Frequency */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            რამდენად ხშირად?
          </h3>
          <div className="space-y-2">
            {frequencyOptions.map(option => (
              <label
                key={option.value}
                className={`flex items-center p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  settings.frequency === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={settings.frequency === option.value}
                  onChange={(e) => updateSetting('frequency', e.target.value as NotificationSettingsData['frequency'])}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.desc}</div>
                </div>
                {option.value === 'weekly' && (
                  <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    რეკომენდებული
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Content Types */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            რა ტიპის კონტენტი?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${
              settings.notify_trials ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={settings.notify_trials}
                onChange={(e) => updateSetting('notify_trials', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">🔬 კვლევები</span>
            </label>

            <label className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${
              settings.notify_results ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={settings.notify_results}
                onChange={(e) => updateSetting('notify_results', e.target.checked)}
                className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">📊 შედეგები</span>
            </label>

            <label className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${
              settings.notify_discoveries ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={settings.notify_discoveries}
                onChange={(e) => updateSetting('notify_discoveries', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">🧬 აღმოჩენები</span>
            </label>

            <label className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${
              settings.notify_news ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={settings.notify_news}
                onChange={(e) => updateSetting('notify_news', e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">📰 სიახლეები</span>
            </label>
          </div>
        </section>

        {/* Weekly Digest Options */}
        {settings.frequency === 'weekly' && settings.email_enabled && (
          <section className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-3">
              კვირეული შეჯამების დრო
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-blue-600 mb-1">დღე</label>
                <select
                  value={settings.email_digest_day}
                  onChange={(e) => updateSetting('email_digest_day', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {dayOptions.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-600 mb-1">საათი</label>
                <select
                  value={settings.email_digest_hour}
                  onChange={(e) => updateSetting('email_digest_hour', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* Urgent Threshold */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            სასწრაფო შეტყობინების ზღვარი
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            როცა შესაბამისობა ამ %-ს გადააჭარბებს, მიიღებთ დაუყოვნებლივ შეტყობინებას
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="70"
              max="100"
              value={settings.urgent_threshold}
              onChange={(e) => updateSetting('urgent_threshold', parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-16 text-center text-lg font-bold text-red-600">
              {settings.urgent_threshold}%
            </span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            გაუქმება
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          შენახვა
        </button>
      </div>
    </div>
  );
}

export default NotificationSettings;
