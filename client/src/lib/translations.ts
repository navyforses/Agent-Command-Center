// Trial Navigator - Complete Translations
// Languages: Georgian (ka), English (en), Russian (ru)

export type Language = 'ka' | 'en' | 'ru';

export const translations = {
  // Navigation
  nav: {
    home: { ka: 'მთავარი', en: 'Home', ru: 'Главная' },
    search: { ka: 'ძიება', en: 'Search', ru: 'Поиск' },
    feed: { ka: 'სიახლეები', en: 'Feed', ru: 'Лента' },
    profile: { ka: 'პროფილი', en: 'Profile', ru: 'Профиль' },
    pricing: { ka: 'ფასები', en: 'Pricing', ru: 'Цены' },
    blog: { ka: 'ბლოგი', en: 'Blog', ru: 'Блог' },
    login: { ka: 'შესვლა', en: 'Sign In', ru: 'Войти' },
    register: { ka: 'რეგისტრაცია', en: 'Sign Up', ru: 'Регистрация' },
    logout: { ka: 'გასვლა', en: 'Sign Out', ru: 'Выйти' },
    dashboard: { ka: 'პანელი', en: 'Dashboard', ru: 'Панель' },
    settings: { ka: 'პარამეტრები', en: 'Settings', ru: 'Настройки' },
  },

  // Landing Page
  landing: {
    badge: { ka: 'AI-ით მართული კვლევა', en: 'AI-Powered Research', ru: 'ИИ-исследования' },
    title: {
      ka: 'იპოვეთ კლინიკური კვლევები მთელ მსოფლიოში',
      en: 'Find Clinical Trials Across the Globe',
      ru: 'Найдите клинические исследования по всему миру'
    },
    subtitle: {
      ka: 'მოძებნეთ 1 მილიონზე მეტი კლინიკური კვლევა 10+ საერთაშორისო რეესტრიდან. AI თარგმანი 40+ ენაზე, მათ შორის ქართულზე.',
      en: 'Search over 1 million clinical trials from 10+ international registries. AI translation in 40+ languages, including Georgian.',
      ru: 'Поиск более 1 миллиона клинических исследований из 10+ международных реестров. ИИ-перевод на 40+ языков.'
    },
    cta: { ka: 'უფასო რეგისტრაცია', en: 'Sign Up Free', ru: 'Бесплатная регистрация' },
    secondary_cta: { ka: 'ნახეთ ფასები', en: 'View Pricing', ru: 'Посмотреть цены' },
    searchPlaceholder: { ka: 'მოძებნეთ დიაგნოზი, მკურნალობა...', en: 'Search condition, treatment...', ru: 'Поиск диагноза, лечения...' },
    searchButton: { ka: 'ძიება', en: 'Search', ru: 'Поиск' },
    popular: { ka: 'პოპულარული:', en: 'Popular:', ru: 'Популярные:' },

    // Stats
    stats: {
      trials: { ka: 'კლინიკური კვლევა', en: 'Clinical Trials', ru: 'Клинических исследований' },
      countries: { ka: 'ქვეყანა', en: 'Countries', ru: 'Стран' },
      languages: { ka: 'ენა', en: 'Languages', ru: 'Языков' },
      registries: { ka: 'რეესტრი', en: 'Registries', ru: 'Реестров' },
    },

    // How it Works
    howItWorks: {
      title: { ka: 'როგორ მუშაობს', en: 'How It Works', ru: 'Как это работает' },
      subtitle: {
        ka: 'სამი მარტივი ნაბიჯი კლინიკური კვლევების მოსაძებნად',
        en: 'Three simple steps to find clinical trials',
        ru: 'Три простых шага для поиска клинических исследований'
      },
      step1: {
        title: { ka: 'შექმენით პროფილი', en: 'Create Profile', ru: 'Создайте профиль' },
        description: {
          ka: 'შეავსეთ თქვენი სამედიცინო ინფორმაცია ან ატვირთეთ ფორმა 100',
          en: 'Fill in your medical information or upload Form 100',
          ru: 'Заполните медицинскую информацию или загрузите Форму 100'
        },
      },
      step2: {
        title: { ka: 'AI ანალიზი', en: 'AI Analysis', ru: 'ИИ-анализ' },
        description: {
          ka: 'ჩვენი AI აანალიზებს თქვენს პროფილს და პოულობს შესაფერის კვლევებს',
          en: 'Our AI analyzes your profile and finds matching trials',
          ru: 'Наш ИИ анализирует ваш профиль и находит подходящие исследования'
        },
      },
      step3: {
        title: { ka: 'მიიღეთ შეტყობინებები', en: 'Get Notified', ru: 'Получайте уведомления' },
        description: {
          ka: 'მიიღეთ პერსონალიზებული სიახლეები ახალი კვლევების შესახებ',
          en: 'Receive personalized updates about new trials',
          ru: 'Получайте персонализированные уведомления о новых исследованиях'
        },
      },
    },

    // Features
    features: {
      title: { ka: 'რატომ Trial Navigator?', en: 'Why Trial Navigator?', ru: 'Почему Trial Navigator?' },
      subtitle: {
        ka: 'ერთიანი პლატფორმა კლინიკური კვლევების მოსაძებნად',
        en: 'One unified platform to search clinical trials',
        ru: 'Единая платформа для поиска клинических исследований'
      },
      global: {
        title: { ka: 'გლობალური რეესტრები', en: 'Global Registries', ru: 'Глобальные реестры' },
        description: {
          ka: 'მოძებნეთ 10+ საერთაშორისო რეესტრში ერთდროულად',
          en: 'Search 10+ international registries simultaneously',
          ru: 'Поиск в 10+ международных реестрах одновременно'
        },
      },
      ai: {
        title: { ka: 'AI თარგმანი', en: 'AI Translation', ru: 'ИИ-перевод' },
        description: {
          ka: 'კვლევების თარგმანი 40+ ენაზე, მათ შორის ქართულზე',
          en: 'Trial translation in 40+ languages including Georgian',
          ru: 'Перевод исследований на 40+ языков, включая грузинский'
        },
      },
      secure: {
        title: { ka: 'უსაფრთხო მონაცემები', en: 'Secure Data', ru: 'Безопасные данные' },
        description: {
          ka: 'თქვენი სამედიცინო მონაცემები დაცულია და კონფიდენციალურია',
          en: 'Your medical data is protected and confidential',
          ru: 'Ваши медицинские данные защищены и конфиденциальны'
        },
      },
      form100: {
        title: { ka: 'ფორმა 100', en: 'Form 100', ru: 'Форма 100' },
        description: {
          ka: 'ატვირთეთ ფორმა 100 და AI ავტომატურად ამოიცნობს დიაგნოზს',
          en: 'Upload Form 100 and AI automatically extracts diagnosis',
          ru: 'Загрузите Форму 100 и ИИ автоматически извлечёт диагноз'
        },
      },
      notifications: {
        title: { ka: 'შეტყობინებები', en: 'Notifications', ru: 'Уведомления' },
        description: {
          ka: 'მიიღეთ ახალი კვლევების შესახებ ყოველკვირეული დაიჯესტი',
          en: 'Get weekly digest about new matching trials',
          ru: 'Получайте еженедельный дайджест о новых исследованиях'
        },
      },
      deepSearch: {
        title: { ka: 'Deep Search', en: 'Deep Search', ru: 'Глубокий поиск' },
        description: {
          ka: 'ექსპერტები პოულობენ კვლევებს რომლებსაც AI ვერ ხედავს',
          en: 'Experts find trials that AI might miss',
          ru: 'Эксперты найдут исследования, которые ИИ может пропустить'
        },
      },
    },

    // CTA Section
    cta_section: {
      title: { ka: 'მზად ხართ დასაწყებად?', en: 'Ready to Get Started?', ru: 'Готовы начать?' },
      subtitle: {
        ka: 'შექმენით უფასო ანგარიში და დაიწყეთ კვლევების ძიება დღესვე',
        en: 'Create a free account and start searching trials today',
        ru: 'Создайте бесплатный аккаунт и начните поиск исследований сегодня'
      },
      button: { ka: 'უფასო რეგისტრაცია', en: 'Sign Up Free', ru: 'Бесплатная регистрация' },
    },
  },

  // Auth Pages
  auth: {
    loginTitle: { ka: 'შესვლა', en: 'Sign In', ru: 'Вход' },
    loginSubtitle: {
      ka: 'გამარჯობა! შედით თქვენს ანგარიშში',
      en: 'Welcome back! Sign in to your account',
      ru: 'Добро пожаловать! Войдите в свой аккаунт'
    },
    registerTitle: { ka: 'რეგისტრაცია', en: 'Create Account', ru: 'Регистрация' },
    registerSubtitle: {
      ka: 'შექმენით ანგარიში უფასოდ',
      en: 'Create your free account',
      ru: 'Создайте бесплатный аккаунт'
    },
    email: { ka: 'ელფოსტა', en: 'Email', ru: 'Email' },
    emailPlaceholder: { ka: 'your@email.com', en: 'your@email.com', ru: 'your@email.com' },
    password: { ka: 'პაროლი', en: 'Password', ru: 'Пароль' },
    passwordPlaceholder: { ka: 'შეიყვანეთ პაროლი', en: 'Enter password', ru: 'Введите пароль' },
    confirmPassword: { ka: 'გაიმეორეთ პაროლი', en: 'Confirm Password', ru: 'Подтвердите пароль' },
    confirmPasswordPlaceholder: { ka: 'გაიმეორეთ პაროლი', en: 'Confirm your password', ru: 'Подтвердите пароль' },
    name: { ka: 'სახელი', en: 'Full Name', ru: 'Полное имя' },
    namePlaceholder: { ka: 'თქვენი სახელი', en: 'Your full name', ru: 'Ваше полное имя' },
    forgotPassword: { ka: 'დაგავიწყდათ პაროლი?', en: 'Forgot password?', ru: 'Забыли пароль?' },
    noAccount: { ka: 'არ გაქვთ ანგარიში?', en: "Don't have an account?", ru: 'Нет аккаунта?' },
    hasAccount: { ka: 'უკვე გაქვთ ანგარიში?', en: 'Already have an account?', ru: 'Уже есть аккаунт?' },
    orContinueWith: { ka: 'ან გააგრძელეთ', en: 'Or continue with', ru: 'Или продолжите с' },
    google: { ka: 'Google', en: 'Google', ru: 'Google' },
    termsAgree: {
      ka: 'რეგისტრაციით ეთანხმებით',
      en: 'By registering you agree to our',
      ru: 'Регистрируясь, вы соглашаетесь с'
    },
    termsLink: { ka: 'წესებს და პირობებს', en: 'Terms and Conditions', ru: 'Условиями использования' },
    loginButton: { ka: 'შესვლა', en: 'Sign In', ru: 'Войти' },
    registerButton: { ka: 'რეგისტრაცია', en: 'Create Account', ru: 'Создать аккаунт' },
    passwordRequirements: {
      ka: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო',
      en: 'Password must be at least 8 characters',
      ru: 'Пароль должен содержать минимум 8 символов'
    },
  },

  // Profile/Dashboard
  profile: {
    title: { ka: 'ჩემი პროფილი', en: 'My Profile', ru: 'Мой профиль' },
    dashboard: { ka: 'მართვის პანელი', en: 'Dashboard', ru: 'Панель управления' },
    welcome: { ka: 'გამარჯობა', en: 'Welcome', ru: 'Добро пожаловать' },
    personalInfo: { ka: 'პირადი ინფორმაცია', en: 'Personal Information', ru: 'Личная информация' },
    medicalInfo: { ka: 'სამედიცინო ინფორმაცია', en: 'Medical Information', ru: 'Медицинская информация' },
    diagnosis: { ka: 'დიაგნოზი', en: 'Diagnosis', ru: 'Диагноз' },
    dateOfBirth: { ka: 'დაბადების თარიღი', en: 'Date of Birth', ru: 'Дата рождения' },
    country: { ka: 'ქვეყანა', en: 'Country', ru: 'Страна' },
    preferredLanguage: { ka: 'სასურველი ენა', en: 'Preferred Language', ru: 'Предпочитаемый язык' },
    uploadForm100: { ka: 'ატვირთეთ ფორმა 100', en: 'Upload Form 100', ru: 'Загрузить Форму 100' },
    savedTrials: { ka: 'შენახული კვლევები', en: 'Saved Trials', ru: 'Сохранённые исследования' },
    notifications: { ka: 'შეტყობინებები', en: 'Notifications', ru: 'Уведомления' },
    settings: { ka: 'პარამეტრები', en: 'Settings', ru: 'Настройки' },
    recentActivity: { ka: 'ბოლო აქტივობა', en: 'Recent Activity', ru: 'Недавняя активность' },
    matchingTrials: { ka: 'შესაფერისი კვლევები', en: 'Matching Trials', ru: 'Подходящие исследования' },
    editProfile: { ka: 'პროფილის რედაქტირება', en: 'Edit Profile', ru: 'Редактировать профиль' },
  },

  // Feed
  feed: {
    title: { ka: 'თქვენი სიახლეები', en: 'Your Feed', ru: 'Ваша лента' },
    newTrials: { ka: 'ახალი კვლევები', en: 'New Trials', ru: 'Новые исследования' },
    news: { ka: 'სიახლეები', en: 'News', ru: 'Новости' },
    results: { ka: 'შედეგები', en: 'Results', ru: 'Результаты' },
    discoveries: { ka: 'აღმოჩენები', en: 'Discoveries', ru: 'Открытия' },
    urgent: { ka: 'სასწრაფო', en: 'Urgent', ru: 'Срочно' },
    important: { ka: 'მნიშვნელოვანი', en: 'Important', ru: 'Важно' },
    relevant: { ka: 'შესაბამისი', en: 'Relevant', ru: 'Релевантно' },
    matchScore: { ka: 'შესაბამისობა', en: 'Match', ru: 'Совпадение' },
    whyRelevant: { ka: 'რატომ არის შესაბამისი?', en: 'Why is this relevant?', ru: 'Почему это актуально?' },
    viewDetails: { ka: 'დეტალების ნახვა', en: 'View Details', ru: 'Подробнее' },
    save: { ka: 'შენახვა', en: 'Save', ru: 'Сохранить' },
    share: { ka: 'გაზიარება', en: 'Share', ru: 'Поделиться' },
    noResults: { ka: 'შედეგები არ მოიძებნა', en: 'No results found', ru: 'Результаты не найдены' },
    createProfilePrompt: {
      ka: 'შექმენით პროფილი პერსონალიზებული სიახლეებისთვის',
      en: 'Create a profile for personalized updates',
      ru: 'Создайте профиль для персонализированных обновлений'
    },
  },

  // Search
  search: {
    title: { ka: 'კვლევების ძიება', en: 'Search Trials', ru: 'Поиск исследований' },
    filters: { ka: 'ფილტრები', en: 'Filters', ru: 'Фильтры' },
    condition: { ka: 'დიაგნოზი', en: 'Condition', ru: 'Диагноз' },
    location: { ka: 'მდებარეობა', en: 'Location', ru: 'Местоположение' },
    phase: { ka: 'ფაზა', en: 'Phase', ru: 'Фаза' },
    status: { ka: 'სტატუსი', en: 'Status', ru: 'Статус' },
    recruiting: { ka: 'მიმდინარეობს რეკრუტირება', en: 'Recruiting', ru: 'Набор участников' },
    results: { ka: 'შედეგი', en: 'results', ru: 'результатов' },
    sortBy: { ka: 'სორტირება', en: 'Sort by', ru: 'Сортировать' },
    relevance: { ka: 'შესაბამისობა', en: 'Relevance', ru: 'Релевантность' },
    newest: { ka: 'უახლესი', en: 'Newest', ru: 'Новые' },
    distance: { ka: 'მანძილი', en: 'Distance', ru: 'Расстояние' },
  },

  // Trial Details
  trial: {
    overview: { ka: 'მიმოხილვა', en: 'Overview', ru: 'Обзор' },
    eligibility: { ka: 'კრიტერიუმები', en: 'Eligibility', ru: 'Критерии' },
    locations: { ka: 'მდებარეობები', en: 'Locations', ru: 'Местоположения' },
    contacts: { ka: 'კონტაქტები', en: 'Contacts', ru: 'Контакты' },
    sponsor: { ka: 'სპონსორი', en: 'Sponsor', ru: 'Спонсор' },
    phase: { ka: 'ფაზა', en: 'Phase', ru: 'Фаза' },
    status: { ka: 'სტატუსი', en: 'Status', ru: 'Статус' },
    enrollment: { ka: 'მონაწილეები', en: 'Enrollment', ru: 'Участники' },
    startDate: { ka: 'დაწყების თარიღი', en: 'Start Date', ru: 'Дата начала' },
    completionDate: { ka: 'დასრულების თარიღი', en: 'Completion Date', ru: 'Дата завершения' },
    applyNow: { ka: 'მონაწილეობა', en: 'Apply Now', ru: 'Подать заявку' },
    translateTo: { ka: 'თარგმნა:', en: 'Translate to:', ru: 'Перевести на:' },
  },

  // Pricing
  pricing: {
    title: { ka: 'აირჩიეთ გეგმა', en: 'Choose Your Plan', ru: 'Выберите план' },
    subtitle: {
      ka: 'იპოვეთ კლინიკური კვლევები თქვენთვის შესაფერისი გეგმით',
      en: 'Find clinical trials with the plan that fits you',
      ru: 'Найдите клинические исследования с подходящим планом'
    },
    free: { ka: 'უფასო', en: 'Free', ru: 'Бесплатно' },
    premium: { ka: 'პრემიუმი', en: 'Premium', ru: 'Премиум' },
    premiumPlus: { ka: 'პრემიუმი+', en: 'Premium+', ru: 'Премиум+' },
    monthly: { ka: 'თვიური', en: 'Monthly', ru: 'Ежемесячно' },
    yearly: { ka: 'წლიური', en: 'Yearly', ru: 'Ежегодно' },
    perMonth: { ka: '/თვე', en: '/month', ru: '/месяц' },
    perYear: { ka: '/წელი', en: '/year', ru: '/год' },
    currentPlan: { ka: 'მიმდინარე', en: 'Current', ru: 'Текущий' },
    upgrade: { ka: 'განახლება', en: 'Upgrade', ru: 'Улучшить' },
    selectPlan: { ka: 'არჩევა', en: 'Select', ru: 'Выбрать' },
    features: {
      searches: { ka: 'ძიება/დღე', en: 'searches/day', ru: 'поисков/день' },
      languages: { ka: 'ენა', en: 'languages', ru: 'языков' },
      digest: { ka: 'დაიჯესტი', en: 'digest', ru: 'дайджест' },
      saved: { ka: 'შენახული', en: 'saved', ru: 'сохранённых' },
      weekly: { ka: 'კვირეული', en: 'weekly', ru: 'еженедельный' },
      daily: { ka: 'ყოველდღიური', en: 'daily', ru: 'ежедневный' },
      realtime: { ka: 'რეალურ დროში', en: 'real-time', ru: 'в реальном времени' },
      unlimited: { ka: 'შეუზღუდავი', en: 'unlimited', ru: 'неограниченно' },
    },
    deepSearch: {
      title: { ka: 'Deep Search', en: 'Deep Search', ru: 'Глубокий поиск' },
      desc: {
        ka: 'ექსპერტები იპოვიან თქვენთვის შესაფერის კვლევებს',
        en: 'Experts find trials matching your profile',
        ru: 'Эксперты найдут подходящие исследования'
      },
    },
  },

  // Blog
  blog: {
    title: { ka: 'ბლოგი', en: 'Blog', ru: 'Блог' },
    subtitle: {
      ka: 'სიახლეები კლინიკური კვლევების და სამედიცინო ინოვაციების შესახებ',
      en: 'News about clinical trials and medical innovations',
      ru: 'Новости о клинических исследованиях и медицинских инновациях'
    },
    readMore: { ka: 'წაიკითხეთ მეტი', en: 'Read More', ru: 'Читать далее' },
    publishedOn: { ka: 'გამოქვეყნდა:', en: 'Published:', ru: 'Опубликовано:' },
    categories: {
      all: { ka: 'ყველა', en: 'All', ru: 'Все' },
      research: { ka: 'კვლევები', en: 'Research', ru: 'Исследования' },
      news: { ka: 'სიახლეები', en: 'News', ru: 'Новости' },
      health: { ka: 'ჯანმრთელობა', en: 'Health', ru: 'Здоровье' },
      technology: { ka: 'ტექნოლოგია', en: 'Technology', ru: 'Технологии' },
    },
  },

  // Common
  common: {
    loading: { ka: 'იტვირთება...', en: 'Loading...', ru: 'Загрузка...' },
    error: { ka: 'შეცდომა', en: 'Error', ru: 'Ошибка' },
    success: { ka: 'წარმატება', en: 'Success', ru: 'Успех' },
    save: { ka: 'შენახვა', en: 'Save', ru: 'Сохранить' },
    cancel: { ka: 'გაუქმება', en: 'Cancel', ru: 'Отмена' },
    edit: { ka: 'რედაქტირება', en: 'Edit', ru: 'Редактировать' },
    delete: { ka: 'წაშლა', en: 'Delete', ru: 'Удалить' },
    back: { ka: 'უკან', en: 'Back', ru: 'Назад' },
    next: { ka: 'შემდეგი', en: 'Next', ru: 'Далее' },
    submit: { ka: 'გაგზავნა', en: 'Submit', ru: 'Отправить' },
    close: { ka: 'დახურვა', en: 'Close', ru: 'Закрыть' },
    learnMore: { ka: 'გაიგეთ მეტი', en: 'Learn More', ru: 'Узнать больше' },
    getStarted: { ka: 'დაწყება', en: 'Get Started', ru: 'Начать' },
    contactUs: { ka: 'დაგვიკავშირდით', en: 'Contact Us', ru: 'Связаться' },
    or: { ka: 'ან', en: 'or', ru: 'или' },
  },

  // Footer
  footer: {
    about: { ka: 'ჩვენს შესახებ', en: 'About Us', ru: 'О нас' },
    privacy: { ka: 'კონფიდენციალურობა', en: 'Privacy Policy', ru: 'Политика конфиденциальности' },
    terms: { ka: 'წესები და პირობები', en: 'Terms of Service', ru: 'Условия использования' },
    contact: { ka: 'კონტაქტი', en: 'Contact', ru: 'Контакты' },
    rights: { ka: 'ყველა უფლება დაცულია', en: 'All rights reserved', ru: 'Все права защищены' },
    copyright: { ka: '© 2024 Trial Navigator. ყველა უფლება დაცულია.', en: '© 2024 Trial Navigator. All rights reserved.', ru: '© 2024 Trial Navigator. Все права защищены.' },
  },

  // Languages
  languageNames: {
    ka: { ka: 'ქართული', en: 'Georgian', ru: 'Грузинский' },
    en: { ka: 'ინგლისური', en: 'English', ru: 'Английский' },
    ru: { ka: 'რუსული', en: 'Russian', ru: 'Русский' },
  },
};

// Helper function to get translation
export function t(key: string, language: Language): string {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (value && typeof value === 'object' && language in value) {
    return value[language];
  }

  return key;
}

export default translations;
