import { useState, useRef, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ContentProvider, useContent } from './contexts/ContentContext';
import { LoginModal } from './components/LoginModal';
import { AdminPanel } from './components/AdminPanel';
import { EditableText } from './components/EditableText';
import { MediaUpload } from './components/MediaUpload';
import {
  validateMemoryForm,
  recordAttempt,
  getRemainingAttempts,
  initFrameBusting,
  initConsoleWarning,
} from './utils/security';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getGitHubConfig, manualSyncToGitHub } from './utils/storage';

interface MemoryEntry {
  id: number;
  name: string;
  message: string;
  date: string;
}

const initialMemories: MemoryEntry[] = [
  {
    id: 1,
    name: 'Потомки Софроновых',
    message: 'Дедушка, мы помним твой подвиг. Твоя отвага живёт в наших сердцах. Спасибо за мирное небо над головой.',
    date: '9 мая 2024',
  },
  {
    id: 2,
    name: 'Ученики школы №12, Якутск',
    message: 'Мы узнали о вас на уроке мужества. Вы — настоящий герой! Мы гордимся, что учимся в вашем городе.',
    date: '23 февраля 2024',
  },
  {
    id: 3,
    name: 'Ветеранский совет г. Якутска',
    message: 'Прокопий Афанасьевич был примером для всех нас. Его боевой путь от Якутии до Берлина — это история несломленного духа якутского народа.',
    date: '9 мая 2023',
  },
  {
    id: 4,
    name: 'Краевед Иван Петров',
    message: 'Исследуя архивы ЦАМО, я был поражён записями о боях, в которых участвовал Боороо. Его имя заслуживает того, чтобы его помнили вечно.',
    date: '22 июня 2023',
  },
];

function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <AppContent />
      </ContentProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { content, isEditing, removeArrayItem, updateContent } = useContent();
  const [memories, setMemories] = useState<MemoryEntry[]>(() =>
    loadFromStorage<MemoryEntry[]>(STORAGE_KEYS.MEMORIES, initialMemories)
  );
  const [formData, setFormData] = useState({ name: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState('hero');
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initFrameBusting();
    initConsoleWarning();
  }, []);

  useEffect(() => {
    setRemainingAttempts(getRemainingAttempts());
  }, [formData]);

  useEffect(() => {
    if (isAuthenticated) {
      setShowAdmin(true);
    }
  }, [isAuthenticated]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveAll = async () => {
    const githubConfig = getGitHubConfig();
    if (githubConfig?.token) {
      const result = await manualSyncToGitHub(githubConfig);
      if (result.success) {
        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 3000);
      } else {
        alert(`Ошибка сохранения: ${result.error}`);
      }
    } else {
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);
    }
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const validation = validateMemoryForm(formData.name, formData.message);

    if (!validation.valid) {
      setFormErrors(validation.errors);
      recordAttempt();
      setRemainingAttempts(getRemainingAttempts());
      return;
    }

    recordAttempt();

    const newEntry: MemoryEntry = {
      id: Date.now(),
      name: validation.sanitizedName!,
      message: validation.sanitizedMessage!,
      date: new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    const newMemories = [newEntry, ...memories];
    setMemories(newMemories);
    saveToStorage(STORAGE_KEYS.MEMORIES, newMemories);
    setFormData({ name: '', message: '' });
    setIsSubmitted(true);
    setRemainingAttempts(getRemainingAttempts());
    setTimeout(() => setIsSubmitted(false), 3000);
  }, [formData, memories]);

  return (
    <div className="min-h-screen bg-dark-green text-paper">
      {isAuthenticated && (
        <div className="fixed top-16 right-4 z-40 flex flex-col gap-2 items-end">
          <button
            onClick={() => setShowAdmin(true)}
            className={`px-3 py-1.5 rounded text-xs font-condensed font-bold uppercase tracking-wider transition-all ${
              isEditing
                ? 'bg-gold text-dark-green shadow-lg shadow-gold/30'
                : 'bg-khaki border border-gold/40 text-gold'
            }`}
          >
            {isEditing ? '✎ Режим редактирования' : '⚙ Админ'}
          </button>
          {/* Кнопка явного сохранения */}
          <button
            onClick={handleSaveAll}
            className="px-3 py-1.5 rounded text-xs font-condensed font-bold uppercase tracking-wider transition-all bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30"
          >
            💾 Сохранить всё
          </button>
          {/* Индикатор автосохранения */}
          <div className="bg-dark-green/90 border border-gold/30 text-paper text-xs font-condensed px-2 py-1 rounded shadow-lg">
            <span className="text-green-400">●</span> Автосохранение активно
          </div>
          {/* Подсказка в режиме редактирования */}
          {isEditing && (
            <div className="bg-gold/90 text-dark-green text-xs font-condensed px-3 py-2 rounded shadow-lg max-w-xs">
              <p className="font-bold mb-1">✎ Режим редактирования активен</p>
              <p className="text-xs opacity-80">
                • Нажимайте на текст для редактирования<br/>
                • Красные кнопки × — для удаления<br/>
                • Enter — сохранить, Esc — отменить<br/>
                • Все изменения сохраняются автоматически
              </p>
            </div>
          )}
        </div>
      )}

      {/* Уведомление о сохранении */}
      {showSaveNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl font-condensed font-bold animate-fade-in">
          ✓ Все изменения сохранены
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-dark-green/95 backdrop-blur-md border-b border-gold/20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div
            ref={navRef}
            className="nav-scroll flex items-center gap-2 overflow-x-auto py-3"
          >
            <div className="flex-shrink-0 mr-3">
              <div className="red-star-sm"></div>
            </div>

            {Object.entries(content.nav).map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`flex-shrink-0 px-4 py-2 rounded text-sm font-condensed font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeSection === id
                    ? 'bg-army-red text-white shadow-lg shadow-army-red/30'
                    : 'text-gold/70 hover:text-gold hover:bg-khaki/50'
                }`}
              >
                {label}
              </button>
            ))}

            {!isAuthenticated && (
              <button
                onClick={() => setShowLogin(true)}
                className="flex-shrink-0 ml-auto px-3 py-2 rounded text-xs font-condensed font-bold uppercase tracking-wider text-paper/30 hover:text-gold hover:bg-khaki/50 transition-all"
                title="Вход для администратора"
              >
                🔒
              </button>
            )}
          </div>
        </div>
        <div className="george-ribbon"></div>
      </nav>

      {/* HERO SECTION */}
      <section
        id="hero"
        className="hero-bg min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12 relative"
      >
        <div className="absolute top-24 left-8 opacity-20">
          <div className="red-star-sm"></div>
        </div>
        <div className="absolute top-32 right-12 opacity-15">
          <div className="red-star-sm"></div>
        </div>
        <div className="absolute bottom-20 left-16 opacity-10">
          <div className="red-star"></div>
        </div>

        <div className="text-center relative z-10 animate-fade-in-up max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="red-star-lg pulse-glow"></div>
          </div>

          <EditableText
            path="hero.warYears"
            value={content.hero.warYears}
            className="font-condensed text-gold text-lg md:text-xl tracking-[0.3em] mb-4 uppercase block"
            as="p"
          />

          <EditableText
            path="hero.lastName"
            value={content.hero.lastName}
            className="font-display text-3xl md:text-5xl lg:text-7xl text-paper font-black leading-tight mb-3 block"
            as="h1"
          />
          <EditableText
            path="hero.firstName"
            value={content.hero.firstName}
            className="font-display text-3xl md:text-5xl lg:text-7xl text-paper font-black leading-tight mb-3 block"
            as="h1"
          />
          <EditableText
            path="hero.patronymic"
            value={content.hero.patronymic}
            className="font-display text-3xl md:text-5xl lg:text-7xl text-paper font-black leading-tight mb-6 block"
            as="h1"
          />

          <div className="inline-block bg-army-red/20 border border-army-red/50 rounded px-6 py-3 mb-8">
            <EditableText
              path="hero.callsign"
              value={`«${content.hero.callsign}»`}
              className="font-condensed text-gold text-2xl md:text-4xl font-bold tracking-widest"
            />
          </div>

          <blockquote className="max-w-2xl mx-auto mb-10">
            <EditableText
              path="hero.quote"
              value={content.hero.quote}
              className="font-slab text-paper/80 text-base md:text-lg italic leading-relaxed block"
              as="p"
              multiline
            />
          </blockquote>

          <div className="mb-8">
            <MediaUpload section="hero" type="both" label="Загрузить фото или видео героя" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => scrollToSection('dossier')}
              className="px-6 py-3 bg-khaki border border-gold/40 text-gold font-condensed font-bold uppercase tracking-wider rounded hover:bg-khaki/80 hover:border-gold transition-all duration-300 text-sm md:text-base"
            >
              📋 {content.nav.dossier}
            </button>
            <button
              onClick={() => scrollToSection('timeline')}
              className="px-6 py-3 bg-army-red/20 border border-army-red/50 text-paper font-condensed font-bold uppercase tracking-wider rounded hover:bg-army-red/30 transition-all duration-300 text-sm md:text-base"
            >
              ⚔️ {content.nav.timeline}
            </button>
            <button
              onClick={() => scrollToSection('memory')}
              className="px-6 py-3 bg-gold/10 border border-gold/40 text-gold font-condensed font-bold uppercase tracking-wider rounded hover:bg-gold/20 transition-all duration-300 text-sm md:text-base"
            >
              🕯️ {content.nav.memory}
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gold/40 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gold/60 rounded-full"></div>
          </div>
        </div>
      </section>

      <div className="george-ribbon"></div>

      {/* DOSSIER SECTION */}
      <section id="dossier" className="py-16 md:py-24 px-4 bg-dark-green">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-4xl text-gold font-bold mb-3">
              Досье из архива
            </h2>
            <p className="font-condensed text-paper/60 uppercase tracking-widest text-sm">
              Материалы Центрального архива МО РФ (ЦАМО)
            </p>
          </div>

          <div className="dossier-card rounded-lg p-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-stamp-red/30"></div>
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-stamp-red/30"></div>
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-stamp-red/30"></div>
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-stamp-red/30"></div>

            <div className="absolute top-6 right-6 md:top-10 md:right-10">
              <div className="stamp-secret text-xs md:text-sm">СЕКРЕТНО</div>
            </div>

            <div className="border-b-2 border-ink/20 pb-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="red-star-sm"></div>
                <h3 className="font-condensed text-ink text-lg md:text-xl font-bold uppercase tracking-wider">
                  Личное дело
                </h3>
              </div>
              <p className="font-slab text-ink/60 text-sm">
                № дела:{' '}
                <EditableText
                  path="dossier.caseNumber"
                  value={content.dossier.caseNumber}
                  className="font-slab text-ink/60 text-sm"
                />{' '}
                | Формат: Рассекречено
              </p>
            </div>

            {isAuthenticated && (
              <div className="mb-6">
                <MediaUpload section="dossier" type="image" label="Загрузить фото из архива" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="space-y-3">
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Фамилия, Имя, Отчество
                  </span>
                  <EditableText
                    path="dossier.fullName"
                    value={content.dossier.fullName}
                    className="font-slab text-ink font-bold text-lg block"
                  />
                </div>
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Боевой позывной
                  </span>
                  <p className="font-slab text-ink font-bold text-lg">
                    <EditableText
                      path="dossier.callsign"
                      value={content.dossier.callsign}
                      className="font-slab text-ink font-bold text-lg"
                    />{' '}
                    (<EditableText
                      path="dossier.callsignTranslation"
                      value={content.dossier.callsignTranslation}
                      className="font-slab text-ink font-bold text-lg"
                    />)
                  </p>
                </div>
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Место рождения
                  </span>
                  <EditableText
                    path="dossier.birthplace"
                    value={content.dossier.birthplace}
                    className="font-slab text-ink block"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Воинское звание
                  </span>
                  <EditableText
                    path="dossier.rank"
                    value={content.dossier.rank}
                    className="font-slab text-ink font-bold text-lg block"
                  />
                </div>
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Воинская часть
                  </span>
                  <EditableText
                    path="dossier.unit"
                    value={content.dossier.unit}
                    className="font-slab text-ink block"
                  />
                </div>
                <div>
                  <span className="font-condensed text-ink/50 text-xs uppercase tracking-wider block">
                    Годы службы
                  </span>
                  <EditableText
                    path="dossier.serviceYears"
                    value={content.dossier.serviceYears}
                    className="font-slab text-ink font-bold block"
                  />
                </div>
              </div>
            </div>

            <div className="border-t-2 border-ink/20 pt-4 mb-6">
              <h4 className="font-condensed text-ink text-sm uppercase tracking-wider mb-4 font-bold">
                🎖️ Награды
              </h4>
              <AwardsEditor />
            </div>

            <div className="border-t border-ink/10 pt-4">
              <EditableText
                path="dossier.footerNote"
                value={content.dossier.footerNote}
                className="font-slab text-ink/50 text-xs italic block"
                multiline
              />
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="https://pamyat-naroda.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-khaki border border-gold/30 text-gold font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-khaki/80 hover:border-gold transition-all duration-300"
            >
              🔍 Проверить на сайте «Память Народа»
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      </section>

      <div className="george-ribbon"></div>

      {/* TIMELINE SECTION */}
      <section id="timeline" className="py-16 md:py-24 px-4 bg-khaki/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <EditableText
              path="timeline.title"
              value={content.timeline.title}
              className="font-display text-2xl md:text-4xl text-gold font-bold mb-3 block"
              as="h2"
            />
            <EditableText
              path="timeline.subtitle"
              value={content.timeline.subtitle}
              className="font-condensed text-paper/60 uppercase tracking-widest text-sm block"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {content.timeline.stats.map((stat, i) => (
              <div
                key={i}
                className="text-center p-4 bg-dark-green/50 border border-gold/20 rounded-lg"
              >
                <EditableText
                  path={`timeline.stats[${i}].value`}
                  value={stat.value}
                  className="font-display text-2xl md:text-3xl text-gold font-bold block"
                />
                <EditableText
                  path={`timeline.stats[${i}].label`}
                  value={stat.label}
                  className="font-condensed text-paper/60 text-xs md:text-sm uppercase tracking-wider mt-1 block"
                />
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="timeline-line"></div>
            <div className="space-y-8 md:space-y-12">
              {content.timeline.events.map((item, index) => (
                <div
                  key={index}
                  className={`relative flex items-start gap-6 md:gap-0 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className="absolute left-[14px] md:left-1/2 md:-translate-x-1/2 z-10">
                    <div className="w-4 h-4 bg-army-red rounded-full border-2 border-gold shadow-lg shadow-army-red/30"></div>
                  </div>

                  <div
                    className={`ml-12 md:ml-0 md:w-[calc(50%-40px)] ${
                      index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'
                    }`}
                  >
                    <div className="bg-dark-green/80 border border-gold/20 rounded-lg p-5 pr-14 md:pr-5 hover:border-gold/40 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 relative overflow-visible">
                      {/* Кнопка удаления (всегда видна в режиме редактирования) */}
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`Удалить событие "${item.title}"?`)) {
                              removeArrayItem('timeline.events', index);
                            }
                          }}
                          className="absolute top-2 right-2 w-10 h-10 md:w-8 md:h-8 bg-army-red text-white rounded-full flex items-center justify-center text-xl md:text-lg font-bold hover:bg-army-red/80 active:bg-army-red z-30 cursor-pointer shadow-lg touch-manipulation"
                          title="Удалить событие"
                          type="button"
                          aria-label="Удалить событие"
                        >
                          ×
                        </button>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <EditableText
                          path={`timeline.events[${index}].icon`}
                          value={item.icon}
                          className="text-2xl"
                        />
                        <EditableText
                          path={`timeline.events[${index}].year`}
                          value={item.year}
                          className="font-condensed text-army-red font-bold text-sm bg-army-red/10 px-2 py-0.5 rounded"
                        />
                      </div>

                      <EditableText
                        path={`timeline.events[${index}].title`}
                        value={item.title}
                        className="font-display text-xl md:text-2xl text-gold font-bold mb-2 block"
                        as="h3"
                      />

                      <p className="font-condensed text-paper/50 text-xs uppercase tracking-wider mb-2">
                        📍{' '}
                        <EditableText
                          path={`timeline.events[${index}].location`}
                          value={item.location}
                          className="font-condensed text-paper/50 text-xs uppercase tracking-wider"
                        />
                      </p>

                      <EditableText
                        path={`timeline.events[${index}].description`}
                        value={item.description}
                        className="font-slab text-paper/80 text-sm md:text-base leading-relaxed block"
                        multiline
                      />
                    </div>
                  </div>

                  <div className="hidden md:block md:w-[calc(50%-40px)]"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12 space-y-4">
            {/* Кнопка добавления события (только для админа в режиме редактирования) */}
            {isEditing && (
              <button
                onClick={() => {
                  const newEvent = {
                    year: 'Год',
                    title: 'Новое событие',
                    description: 'Описание события',
                    icon: '⭐',
                    location: 'Место',
                  };
                  const newEvents = [...content.timeline.events, newEvent];
                  updateContent('timeline.events', newEvents);
                }}
                className="px-6 py-3 bg-gold/20 border border-gold/40 text-gold font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-gold/30 transition-all duration-300"
              >
                + Добавить событие
              </button>
            )}
            <div>
              <a
                href="https://pamyat-naroda.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-army-red/20 border border-army-red/50 text-paper font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-army-red/30 transition-all duration-300"
              >
                📜 Узнать больше на «Память Народа»
                <span className="text-xs">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="george-ribbon"></div>

      {/* MEMORY SECTION */}
      <section id="memory" className="py-16 md:py-24 px-4 bg-dark-green">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <EditableText
              path="memory.title"
              value={content.memory.title}
              className="font-display text-2xl md:text-4xl text-gold font-bold mb-3 block"
              as="h2"
            />
            <EditableText
              path="memory.subtitle"
              value={content.memory.subtitle}
              className="font-condensed text-paper/60 uppercase tracking-widest text-sm block"
            />
          </div>

          <div className="bg-khaki/50 border border-gold/20 rounded-lg p-6 md:p-8 mb-12">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {remainingAttempts <= 2 && remainingAttempts > 0 && (
                <div className="bg-army-red/10 border border-army-red/30 rounded px-4 py-2 text-sm text-paper">
                  ⚠️ Осталось попыток: {remainingAttempts} из 5
                </div>
              )}
              {remainingAttempts === 0 && (
                <div className="bg-army-red/20 border border-army-red/50 rounded px-4 py-3 text-sm text-paper font-bold">
                  🚫 Превышен лимит попыток. Подождите 5 минут.
                </div>
              )}

              {formErrors.length > 0 && (
                <div className="bg-army-red/10 border border-army-red/30 rounded px-4 py-3">
                  <p className="font-condensed text-army-red font-bold text-sm mb-1">⚠️ Ошибки:</p>
                  <ul className="list-disc list-inside text-paper/80 text-sm">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label htmlFor="memory-name" className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
                  {content.memory.nameLabel}
                </label>
                <input
                  id="memory-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={content.memory.namePlaceholder}
                  maxLength={100}
                  autoComplete="name"
                  disabled={remainingAttempts === 0}
                  className="w-full bg-dark-green/80 border border-gold/30 rounded px-4 py-3 text-paper font-slab placeholder:text-paper/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label htmlFor="memory-message" className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
                  {content.memory.messageLabel}
                </label>
                <textarea
                  id="memory-message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={content.memory.messagePlaceholder}
                  rows={4}
                  maxLength={1000}
                  disabled={remainingAttempts === 0}
                  className="w-full bg-dark-green/80 border border-gold/30 rounded px-4 py-3 text-paper font-slab placeholder:text-paper/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="submit"
                  disabled={remainingAttempts === 0}
                  className="px-6 py-3 bg-army-red border border-army-red text-white font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-army-red/80 transition-all duration-300 shadow-lg shadow-army-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🕯️ Оставить память
                </button>
                {isSubmitted && (
                  <span className="text-gold font-condensed text-sm animate-fade-in-up">
                    ✓ Спасибо! Ваша запись добавлена.
                  </span>
                )}
              </div>

              <p className="text-paper/20 text-xs font-condensed mt-4">
                🔒 Данные проходят валидацию и санитизацию.
              </p>
            </form>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-xl md:text-2xl text-gold font-bold mb-2 flex items-center gap-3">
              <div className="red-star-sm"></div>
              <EditableText
                path="memory.wallTitle"
                value={content.memory.wallTitle}
                className="font-display text-xl md:text-2xl text-gold font-bold"
              />
            </h3>
            <EditableText
              path="memory.wallSubtitle"
              value={content.memory.wallSubtitle}
              className="font-condensed text-paper/50 text-sm block"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map((entry) => (
              <div
                key={entry.id}
                className="memory-card rounded-lg p-5 pr-14 md:pr-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 relative overflow-visible"
              >
                {/* Кнопка удаления (всегда видна для админа) */}
                {isAuthenticated && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(`Удалить запись от "${entry.name}"?`)) {
                        const newMemories = memories.filter(m => m.id !== entry.id);
                        setMemories(newMemories);
                        saveToStorage(STORAGE_KEYS.MEMORIES, newMemories);
                      }
                    }}
                    className="absolute top-2 right-2 w-10 h-10 md:w-8 md:h-8 bg-army-red text-white rounded-full flex items-center justify-center text-xl md:text-lg font-bold hover:bg-army-red/80 active:bg-army-red z-30 cursor-pointer shadow-lg touch-manipulation"
                    title="Удалить запись"
                    type="button"
                    aria-label="Удалить запись"
                  >
                    ×
                  </button>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-army-red/20 border border-army-red/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🕯️</span>
                  </div>
                  <div>
                    <h4 className="font-condensed text-ink font-bold text-sm">{entry.name}</h4>
                    <p className="font-condensed text-ink/40 text-xs">{entry.date}</p>
                  </div>
                </div>
                <p className="font-slab text-ink/80 text-sm leading-relaxed">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink/50 border-t border-gold/10 py-8 px-4">
        <div className="george-ribbon mb-6"></div>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="red-star-sm"></div>
          </div>
          <EditableText
            path="footer.motto"
            value={content.footer.motto}
            className="font-display text-gold text-lg font-bold mb-2 block"
          />
          <EditableText
            path="footer.dedication"
            value={content.footer.dedication}
            className="font-slab text-paper/40 text-sm mb-4 block"
          />
          <EditableText
            path="footer.eternalMemory"
            value={content.footer.eternalMemory}
            className="font-condensed text-paper/30 text-xs uppercase tracking-wider block"
          />
          <div className="mt-6 pt-4 border-t border-gold/10">
            <p className="font-condensed text-paper/20 text-xs">
              Данные: ЦАМО РФ |{' '}
              <a
                href="https://pamyat-naroda.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold/40 hover:text-gold/70 transition-colors"
              >
                pamyat-naroda.ru
              </a>
            </p>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
    </div>
  );
}

function AwardsEditor() {
  const { isAuthenticated } = useAuth();
  const { content, isEditing, updateContent } = useContent();

  if (!isAuthenticated || !isEditing) {
    return (
      <div className="flex flex-wrap gap-3">
        {content.dossier.awards.map((award, i) => (
          <span
            key={i}
            className="inline-block bg-gold/20 border border-gold/40 text-ink text-xs md:text-sm px-3 py-1.5 rounded font-condensed font-bold"
          >
            {award}
          </span>
        ))}
      </div>
    );
  }

  const handleEdit = (index: number, value: string) => {
    const newAwards = [...content.dossier.awards];
    newAwards[index] = value;
    updateContent('dossier.awards', newAwards);
  };

  const handleAdd = () => {
    const newAwards = [...content.dossier.awards, 'Новая награда'];
    updateContent('dossier.awards', newAwards);
  };

  const handleRemove = (index: number) => {
    const newAwards = content.dossier.awards.filter((_, i) => i !== index);
    updateContent('dossier.awards', newAwards);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {content.dossier.awards.map((award, i) => (
        <div key={i} className="relative group">
          <input
            type="text"
            value={award}
            onChange={(e) => handleEdit(i, e.target.value)}
            className="bg-gold/20 border border-gold/40 text-ink text-xs md:text-sm px-3 py-1.5 rounded font-condensed font-bold focus:outline-none focus:ring-2 focus:ring-gold/30 min-w-[150px]"
          />
          <button
            onClick={() => handleRemove(i)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-army-red text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-ink text-xs rounded font-condensed font-bold hover:bg-gold/20 transition-all"
      >
        + Добавить награду
      </button>
    </div>
  );
}

export default App;
