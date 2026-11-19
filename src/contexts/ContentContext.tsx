import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getGitHubConfig, autoSyncToGitHub } from '../utils/storage';

export interface SiteContent {
  hero: {
    warYears: string;
    lastName: string;
    firstName: string;
    patronymic: string;
    callsign: string;
    quote: string;
  };
  dossier: {
    fullName: string;
    callsign: string;
    callsignTranslation: string;
    birthplace: string;
    rank: string;
    unit: string;
    serviceYears: string;
    caseNumber: string;
    awards: string[];
    footerNote: string;
  };
  timeline: {
    title: string;
    subtitle: string;
    stats: { value: string; label: string }[];
    events: {
      year: string;
      title: string;
      description: string;
      icon: string;
      location: string;
    }[];
  };
  memory: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    wallTitle: string;
    wallSubtitle: string;
  };
  footer: {
    motto: string;
    dedication: string;
    eternalMemory: string;
  };
  nav: {
    hero: string;
    dossier: string;
    timeline: string;
    memory: string;
  };
}

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    warYears: '1941 — 1945',
    lastName: 'Софронов',
    firstName: 'Прокопий',
    patronymic: 'Афанасьевич',
    callsign: 'БОРОО',
    quote: '«Из якутских лесов до стен Берлина — путь воина, который не отступил ни шагу. Его позывной «Боороо» — что значит «волк» на якутском — стал символом стойкости и бесстрашия.»',
  },
  dossier: {
    fullName: 'Софронов Прокопий Афанасьевич',
    callsign: '«Боороо»',
    callsignTranslation: 'якут. — волк',
    birthplace: 'Якутская АССР',
    rank: 'Старший сержант',
    unit: '150-я стрелковая дивизия',
    serviceYears: '1941 — 1945',
    caseNumber: 'ЦАМО-78/1945-А',
    awards: [
      'Орден Отечественной войны II степени',
      'Медаль «За отвагу»',
      'Медаль «За боевые заслуги»',
      'Медаль «За взятие Берлина»',
      'Медаль «За победу над Германией»',
    ],
    footerNote: '* Документ рассекречен в соответствии с ФЗ «Об увековечении памяти погибших при защите Отечества». Оригиналы хранятся в фондах ЦАМО г. Подольск.',
  },
  timeline: {
    title: 'Путь воина',
    subtitle: 'Боевой маршрут от Якутии до Берлина',
    stats: [
      { value: '1 418', label: 'дней войны' },
      { value: '8 000+', label: 'км до Берлина' },
      { value: '6', label: 'фронтов' },
      { value: '5', label: 'наград' },
    ],
    events: [
      {
        year: '1941',
        title: 'Якутская АССР',
        description: 'Призыв в ряды Красной Армии. Начало боевого пути из далёкой Якутии.',
        icon: '🏔️',
        location: 'Якутск',
      },
      {
        year: '1942',
        title: 'Битва за Москву',
        description: 'Оборонительные бои под Москвой. Первое боевое крещение.',
        icon: '🛡️',
        location: 'Московская область',
      },
      {
        year: '1942–1943',
        title: 'Сталинград',
        description: 'Участие в Сталинградской битве — переломном сражении Великой Отечественной войны.',
        icon: '🔥',
        location: 'Сталинград',
      },
      {
        year: '1943',
        title: 'Курская дуга',
        description: 'Крупнейшее танковое сражение в истории. Оборона и последующее контрнаступление.',
        icon: '⚔️',
        location: 'Курск',
      },
      {
        year: '1944',
        title: 'Освобождение Беларуси',
        description: 'Операция «Багратион» — освобождение Белорусской ССР от немецко-фашистских захватчиков.',
        icon: '🌿',
        location: 'Беларусь',
      },
      {
        year: '1945',
        title: 'Берлин',
        description: 'Штурм столицы фашистской Германии. Победный май 1945 года.',
        icon: '🏴',
        location: 'Берлин',
      },
    ],
  },
  memory: {
    title: 'Твоя минута памяти',
    subtitle: 'Оставьте слова благодарности герою',
    nameLabel: 'Ваше имя',
    namePlaceholder: 'Иванов Иван Иванович',
    messageLabel: 'Слова памяти',
    messagePlaceholder: 'Напишите слова благодарности, воспоминания или просто — спасибо...',
    wallTitle: 'Стена памяти',
    wallSubtitle: 'Записи от потомков и благодарных граждан',
  },
  footer: {
    motto: 'Помним. Гордимся. Чтим.',
    dedication: 'Мемориальный сайт посвящён Софронову Прокопию Афанасьевичу (Боороо)',
    eternalMemory: 'Вечная слава героям Великой Отечественной войны 1941–1945',
  },
  nav: {
    hero: 'Герой',
    dossier: 'Досье',
    timeline: 'Путь воина',
    memory: 'Минута памяти',
  },
};

interface ContentContextType {
  content: SiteContent;
  updateContent: (path: string, value: unknown) => void;
  removeArrayItem: (path: string, index: number) => void;
  resetContent: () => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
}

const ContentContext = createContext<ContentContextType | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() =>
    loadFromStorage<SiteContent>(STORAGE_KEYS.CONTENT, DEFAULT_CONTENT)
  );
  const [isEditing, setIsEditing] = useState(false);

  const updateContent = useCallback((path: string, value: unknown) => {
    setContent(prev => {
      const newContent = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: Record<string, unknown> = newContent;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const arrKey = arrayMatch[1];
          const idx = parseInt(arrayMatch[2]);
          obj = (obj[arrKey] as Record<string, unknown>[])[idx] as Record<string, unknown>;
        } else {
          obj = obj[key] as Record<string, unknown>;
        }
      }
      const lastKey = keys[keys.length - 1];
      const lastKeyMatch = lastKey.match(/^(\w+)\[(\d+)\]$/);
      if (lastKeyMatch) {
        const arrKey = lastKeyMatch[1];
        const idx = parseInt(lastKeyMatch[2]);
        (obj[arrKey] as unknown[])[idx] = value;
      } else {
        obj[lastKey] = value;
      }
      saveToStorage(STORAGE_KEYS.CONTENT, newContent);
      
      // Автоматическая синхронизация с GitHub если настроен
      const githubConfig = getGitHubConfig();
      if (githubConfig?.token) {
        autoSyncToGitHub(githubConfig).catch(console.error);
      }
      
      return newContent;
    });
  }, []);

  const removeArrayItem = useCallback((path: string, index: number) => {
    setContent(prev => {
      const newContent = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: Record<string, unknown> = newContent;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      const lastKey = keys[keys.length - 1];
      const arr = obj[lastKey] as unknown[];
      arr.splice(index, 1);
      saveToStorage(STORAGE_KEYS.CONTENT, newContent);
      return newContent;
    });
  }, []);

  const resetContent = useCallback(() => {
    setContent(DEFAULT_CONTENT);
    saveToStorage(STORAGE_KEYS.CONTENT, DEFAULT_CONTENT);
  }, []);

  return (
    <ContentContext.Provider value={{ content, updateContent, removeArrayItem, resetContent, isEditing, setIsEditing }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextType {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within ContentProvider');
  }
  return context;
}
