import { useState } from 'react';
import {
  Upload,
  FileText,
  User,
  MapPin,
  Calendar,
  Stethoscope,
  Languages,
  Bell,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';

// Types
interface PatientProfileData {
  // Step 1: Basic Info
  patientName: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  willingToTravel: boolean;
  travelDistanceKm: number;

  // Step 2: Medical Info
  primaryDiagnosis: string;
  diagnosisDate: string;
  secondaryDiagnoses: string[];
  medicalHistory: string;
  currentTreatments: string[];
  pastTreatments: string[];
  allergies: string[];

  // Step 3: Documents
  form100Text: string;
  uploadedFiles: File[];

  // Step 4: Preferences
  preferredLanguage: string;
  notificationFrequency: string;
  contentTypes: string[];
}

const initialData: PatientProfileData = {
  patientName: '',
  dateOfBirth: '',
  gender: '',
  country: 'საქართველო',
  city: '',
  willingToTravel: true,
  travelDistanceKm: 5000,

  primaryDiagnosis: '',
  diagnosisDate: '',
  secondaryDiagnoses: [],
  medicalHistory: '',
  currentTreatments: [],
  pastTreatments: [],
  allergies: [],

  form100Text: '',
  uploadedFiles: [],

  preferredLanguage: 'ka',
  notificationFrequency: 'weekly',
  contentTypes: ['clinical_trial', 'research_result', 'discovery']
};

const languages = [
  { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'hy', name: 'Հայdelays', flag: '🇦🇲' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
];

const contentTypeOptions = [
  { value: 'clinical_trial', label: '🔬 კლინიკური კვლევები', desc: 'ახალი კვლევები თქვენი დაავადებისთვის' },
  { value: 'research_result', label: '📊 კვლევის შედეგები', desc: 'დასრულებული კვლევების შედეგები' },
  { value: 'discovery', label: '🧬 სამეცნიერო აღმოჩენები', desc: 'ახალი სამეცნიერო აღმოჩენები' },
  { value: 'news', label: '📰 სამედიცინო სიახლეები', desc: 'ზოგადი სამედიცინო სიახლეები' },
  { value: 'drug_approval', label: '💊 წამლების დამტკიცება', desc: 'FDA/EMA დამტკიცებები' },
];

export default function CreateProfile() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PatientProfileData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const totalSteps = 4;

  const updateData = (updates: Partial<PatientProfileData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);

    const file = files[0];
    const newFiles = [...data.uploadedFiles, file];
    updateData({ uploadedFiles: newFiles });

    try {
      // Read file content for text extraction
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        if (file.type.includes('text') || file.type.includes('json')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });

      // Call API to analyze document
      const response = await fetch('/api/assistant/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          fileType: file.type,
          fileSize: file.size,
          content: fileContent.length < 50000 ? fileContent : null, // Limit content size
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Extract text from API response
        const extractedText = result.document?.extractedText || result.document?.aiSummary || `
დოკუმენტი: ${file.name}
ტიპი: ${file.type}
ზომა: ${(file.size / 1024).toFixed(1)} KB
პაციენტი: ${data.patientName || 'უცნობი'}
დაბადების თარიღი: ${data.dateOfBirth || 'უცნობი'}
        `;

        updateData({ form100Text: extractedText });

        // Set AI summary from API or fallback
        const summary = result.document?.aiSummary || result.document?.aiSummaryKa;
        setAiSummary(summary || `
AI-მ წარმატებით გააანალიზა დოკუმენტი "${file.name}".

${result.document?.aiKeyFindings?.length ?
  'აღმოჩენილი ინფორმაცია:\n' + result.document.aiKeyFindings.map((f: string) => `• ${f}`).join('\n')
  : 'დოკუმენტი დამუშავდა. კლინიკური კვლევების ძიებისთვის გადადით შემდეგ ეტაპზე.'}
        `);
      } else {
        // Fallback to basic info if API fails
        const fallbackText = `
დოკუმენტი: ${file.name}
ტიპი: ${file.type}
პაციენტი: ${data.patientName || 'უცნობი'}
დაბადების თარიღი: ${data.dateOfBirth || 'უცნობი'}
მიმდინარე მდგომარეობა: მიუთითეთ პროფილში
        `;
        updateData({ form100Text: fallbackText });
        setAiSummary('დოკუმენტი ატვირთულია. გთხოვთ შეავსოთ დამატებითი ინფორმაცია პროფილში.');
      }
    } catch (error) {
      console.error('Document analysis error:', error);
      // Fallback on error
      updateData({ form100Text: `დოკუმენტი: ${file.name}\nტიპი: ${file.type}` });
      setAiSummary('დოკუმენტი ატვირთულია. ავტომატური ანალიზი დროებით მიუწვდომელია.');
    }

    setIsAnalyzing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Save profile data to API
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.patientName?.split(' ')[0] || '',
          lastName: data.patientName?.split(' ').slice(1).join(' ') || '',
        }),
      });

      // Save preferences
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: data.preferredLanguage || 'ka',
          emailNotifications: data.notifyNewTrials,
          clinicalTrialAlerts: data.notifyNewTrials,
        }),
      });

      // Redirect to feed on success
      window.location.href = '/feed';
    } catch (error) {
      console.error('Profile save error:', error);
      // Still redirect on error for now
      window.location.href = '/feed';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.patientName && data.dateOfBirth && data.country;
      case 2:
        return data.primaryDiagnosis;
      case 3:
        return true; // Documents are optional
      case 4:
        return data.preferredLanguage && data.contentTypes.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            პაციენტის პროფილის შექმნა
          </h1>
          <p className="text-gray-600">
            შექმენით პერსონალიზებული პროფილი შესაბამისი კვლევებისა და სიახლეების მისაღებად
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium transition-colors ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>ძირითადი</span>
            <span>სამედიცინო</span>
            <span>დოკუმენტები</span>
            <span>პარამეტრები</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">ძირითადი ინფორმაცია</h2>
                  <p className="text-sm text-gray-500">პაციენტის საბაზისო მონაცემები</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  პაციენტის სახელი *
                </label>
                <input
                  type="text"
                  value={data.patientName}
                  onChange={e => updateData({ patientName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="მაგ: ნიკა"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    დაბადების თარიღი *
                  </label>
                  <input
                    type="date"
                    value={data.dateOfBirth}
                    onChange={e => updateData({ dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    სქესი
                  </label>
                  <select
                    value={data.gender}
                    onChange={e => updateData({ gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">აირჩიეთ</option>
                    <option value="male">მამრობითი</option>
                    <option value="female">მდედრობითი</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ქვეყანა *
                  </label>
                  <input
                    type="text"
                    value={data.country}
                    onChange={e => updateData({ country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="საქართველო"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ქალაქი
                  </label>
                  <input
                    type="text"
                    value={data.city}
                    onChange={e => updateData({ city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="თბილისი"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.willingToTravel}
                    onChange={e => updateData({ willingToTravel: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">მზად ვართ მოგზაურობისთვის</div>
                    <div className="text-sm text-gray-500">კვლევებში მონაწილეობისთვის სხვა ქვეყანაში</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Medical Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">სამედიცინო ინფორმაცია</h2>
                  <p className="text-sm text-gray-500">დიაგნოზი და მკურნალობის ისტორია</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ძირითადი დიაგნოზი *
                </label>
                <input
                  type="text"
                  value={data.primaryDiagnosis}
                  onChange={e => updateData({ primaryDiagnosis: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="მაგ: ჰიპოქსიურ-იშემიური ენცეფალოპათია (HIE)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  დიაგნოზის თარიღი
                </label>
                <input
                  type="date"
                  value={data.diagnosisDate}
                  onChange={e => updateData({ diagnosisDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  სამედიცინო ისტორია
                </label>
                <textarea
                  value={data.medicalHistory}
                  onChange={e => updateData({ medicalHistory: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="აღწერეთ სამედიცინო ისტორია, ჩატარებული მკურნალობები, ოპერაციები..."
                />
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>შენიშვნა:</strong> რაც უფრო დეტალურ ინფორმაციას მოგვაწვდით, მით უფრო ზუსტად შევარჩევთ შესაბამის კვლევებს და სიახლეებს.
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">დოკუმენტების ატვირთვა</h2>
                  <p className="text-sm text-gray-500">ფორმა 100 ან სხვა სამედიცინო დოკუმენტი</p>
                </div>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <div className="text-gray-600">AI აანალიზებს დოკუმენტს...</div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-600 mb-2">
                      ჩააგდეთ ფაილი აქ ან
                    </div>
                    <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      აირჩიეთ ფაილი
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => handleFileUpload(e.target.files)}
                      />
                    </label>
                    <div className="text-sm text-gray-500 mt-2">
                      PDF, JPEG, PNG, DOC (მაქს. 10MB)
                    </div>
                  </>
                )}
              </div>

              {/* Uploaded Files */}
              {data.uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {data.uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newFiles = data.uploadedFiles.filter((_, i) => i !== idx);
                          updateData({ uploadedFiles: newFiles });
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Summary */}
              {aiSummary && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">AI ანალიზი დასრულდა</span>
                  </div>
                  <pre className="text-sm text-green-700 whitespace-pre-wrap font-sans">
                    {aiSummary}
                  </pre>
                </div>
              )}

              <div className="text-sm text-gray-500 text-center">
                ეს ნაბიჯი არასავალდებულოა, მაგრამ დოკუმენტის ატვირთვა დაგვეხმარება უფრო ზუსტი შედეგების მიწოდებაში
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">პარამეტრები</h2>
                  <p className="text-sm text-gray-500">ენა და შეტყობინებები</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Languages className="w-4 h-4 inline mr-1" />
                  ენა
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => updateData({ preferredLanguage: lang.code })}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        data.preferredLanguage === lang.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl mr-2">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  შეტყობინებების სიხშირე
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'daily', label: 'ყოველდღე', desc: 'ყოველდღიური შეჯამება' },
                    { value: 'weekly', label: 'კვირაში ერთხელ', desc: 'კვირეული შეჯამება (რეკომენდებული)' },
                    { value: 'monthly', label: 'თვეში ერთხელ', desc: 'თვიური შეჯამება' },
                    { value: 'urgent_only', label: 'მხოლოდ სასწრაფო', desc: 'მხოლოდ მაღალი შესაბამისობის შეტყობინებები' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        data.notificationFrequency === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={opt.value}
                        checked={data.notificationFrequency === opt.value}
                        onChange={e => updateData({ notificationFrequency: e.target.value })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{opt.label}</div>
                        <div className="text-sm text-gray-500">{opt.desc}</div>
                      </div>
                      {opt.value === 'weekly' && (
                        <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          რეკომენდებული
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  კონტენტის ტიპი
                </label>
                <div className="space-y-2">
                  {contentTypeOptions.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        data.contentTypes.includes(opt.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={data.contentTypes.includes(opt.value)}
                        onChange={e => {
                          const newTypes = e.target.checked
                            ? [...data.contentTypes, opt.value]
                            : data.contentTypes.filter(t => t !== opt.value);
                          updateData({ contentTypes: newTypes });
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{opt.label}</div>
                        <div className="text-sm text-gray-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              უკან
            </button>

            {step < totalSteps ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                შემდეგი
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  canProceed() && !isSubmitting
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    იქმნება...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    პროფილის შექმნა
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
