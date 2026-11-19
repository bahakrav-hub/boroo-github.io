import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import {
  saveGitHubConfig,
  getGitHubConfig,
  pullFromGitHub,
  exportAllData,
  importAllData,
  manualSyncToGitHub,
  GitHubConfig,
} from '../utils/storage';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { logout, changePassword } = useAuth();
  const { resetContent, isEditing, setIsEditing } = useContent();
  const [activeTab, setActiveTab] = useState<'content' | 'password' | 'github' | 'data'>('content');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-green border border-gold/30 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gold/20">
          <div className="flex items-center gap-3">
            <div className="red-star-sm"></div>
            <h2 className="font-display text-xl md:text-2xl text-gold font-bold">
              Панель администратора
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-paper/50 hover:text-paper text-2xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-gold/20 overflow-x-auto">
          {[
            { id: 'content' as const, label: '📝 Контент' },
            { id: 'password' as const, label: '🔑 Пароль' },
            { id: 'github' as const, label: '🐙 GitHub' },
            { id: 'data' as const, label: '💾 Данные' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 font-condensed text-sm uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'text-gold border-b-2 border-gold bg-gold/5'
                  : 'text-paper/50 hover:text-paper/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mx-4 mt-4 px-4 py-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500/30 text-green-300'
              : 'bg-army-red/10 border border-army-red/30 text-paper'
          }`}>
            {message.type === 'success' ? '✓' : '⚠️'} {message.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'content' && (
            <ContentTab
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              resetContent={resetContent}
              showMessage={showMessage}
            />
          )}
          {activeTab === 'password' && (
            <PasswordTab changePassword={changePassword} showMessage={showMessage} />
          )}
          {activeTab === 'github' && <GitHubTab showMessage={showMessage} />}
          {activeTab === 'data' && <DataTab showMessage={showMessage} />}
        </div>

        <div className="p-4 border-t border-gold/20 flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-khaki/50 border border-gold/20 text-paper/70 font-condensed text-sm rounded hover:bg-khaki/70 transition-all"
          >
            Закрыть
          </button>
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="px-4 py-2 bg-army-red/20 border border-army-red/40 text-paper font-condensed text-sm rounded hover:bg-army-red/30 transition-all"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentTab({
  isEditing,
  setIsEditing,
  resetContent,
  showMessage,
}: {
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  resetContent: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const githubConfig = getGitHubConfig();
      if (githubConfig?.token) {
        const result = await manualSyncToGitHub(githubConfig);
        if (result.success) {
          showMessage('success', 'Все изменения сохранены в GitHub');
        } else {
          showMessage('error', `Ошибка сохранения: ${result.error}`);
        }
      } else {
        showMessage('success', 'Все изменения сохранены локально');
      }
    } catch (error) {
      showMessage('error', 'Ошибка сохранения');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-condensed text-gold text-lg font-bold mb-3">
          Режим редактирования
        </h3>
        <p className="text-paper/60 text-sm mb-4">
          Включите режим редактирования, чтобы изменять любой текст на сайте.
          Нажмите на текст для редактирования, Enter для сохранения, Esc для отмены.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              showMessage('success', isEditing ? 'Режим редактирования выключен' : 'Режим редактирования включён');
            }}
            className={`px-4 py-2 font-condensed text-sm rounded border transition-all ${
              isEditing
                ? 'bg-gold/20 border-gold/50 text-gold'
                : 'bg-khaki/50 border-gold/20 text-paper/70 hover:bg-khaki/70'
            }`}
          >
            {isEditing ? '✎ Редактирование ВКЛ' : '✎ Включить редактирование'}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-gold/20 border border-gold/40 text-gold font-condensed text-sm rounded hover:bg-gold/30 transition-all disabled:opacity-50"
          >
            {isSaving ? '💾 Сохранение...' : '💾 Сохранить все изменения'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Сбросить весь контент к значениям по умолчанию?')) {
                resetContent();
                showMessage('success', 'Контент сброшен');
              }
            }}
            className="px-4 py-2 bg-army-red/10 border border-army-red/30 text-paper/70 font-condensed text-sm rounded hover:bg-army-red/20 transition-all"
          >
            ↺ Сбросить контент
          </button>
        </div>
      </div>

      <div className="border-t border-gold/10 pt-4">
        <h4 className="font-condensed text-gold text-sm uppercase tracking-wider mb-2">
          Подсказки
        </h4>
        <ul className="text-paper/50 text-sm space-y-1">
          <li>• Нажимайте на любой текст для редактирования</li>
          <li>• Enter — сохранить, Esc — отменить</li>
          <li>• Изменения сохраняются автоматически в localStorage</li>
          <li>• Нажмите «💾 Сохранить все изменения» для явного сохранения</li>
          <li>• Используйте вкладку «Данные» для экспорта/импорта</li>
          <li>• Используйте вкладку «GitHub» для синхронизации</li>
        </ul>
      </div>
    </div>
  );
}

function PasswordTab({
  changePassword,
  showMessage,
}: {
  changePassword: (old: string, newP: string) => Promise<{ success: boolean; error?: string }>;
  showMessage: (type: 'success' | 'error', text: string) => void;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage('error', 'Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    setIsLoading(false);

    if (result.success) {
      showMessage('success', 'Пароль успешно изменён');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showMessage('error', result.error || 'Ошибка смены пароля');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
          Текущий пароль
        </label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full bg-khaki/30 border border-gold/30 rounded px-4 py-3 text-paper font-slab focus:outline-none focus:border-gold transition-all"
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
          Новый пароль
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          className="w-full bg-khaki/30 border border-gold/30 rounded px-4 py-3 text-paper font-slab focus:outline-none focus:border-gold transition-all"
          required
          autoComplete="new-password"
        />
        <p className="text-paper/30 text-xs mt-1">Минимум 6 символов</p>
      </div>
      <div>
        <label className="block font-condensed text-gold text-sm uppercase tracking-wider mb-2">
          Подтвердите новый пароль
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-khaki/30 border border-gold/30 rounded px-4 py-3 text-paper font-slab focus:outline-none focus:border-gold transition-all"
          required
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-army-red border border-army-red text-white font-condensed font-bold uppercase tracking-wider text-sm rounded hover:bg-army-red/80 transition-all disabled:opacity-50"
      >
        {isLoading ? 'Сохранение...' : 'Сменить пароль'}
      </button>
    </form>
  );
}

function GitHubTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [config, setConfig] = useState<GitHubConfig>(() =>
    getGitHubConfig() || { token: '', owner: '', repo: '', branch: 'main' }
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveConfig = () => {
    if (!config.token || !config.owner || !config.repo) {
      showMessage('error', 'Заполните все поля');
      return;
    }
    saveGitHubConfig(config);
    showMessage('success', 'Настройки GitHub сохранены');
  };

  const handlePush = async () => {
    setIsSyncing(true);
    const result = await manualSyncToGitHub(config);
    setIsSyncing(false);
    if (result.success) {
      showMessage('success', 'Данные отправлены в GitHub');
    } else {
      showMessage('error', `Ошибка: ${result.error}`);
    }
  };

  const handlePull = async () => {
    setIsSyncing(true);
    const result = await pullFromGitHub(config, 'data/site-content.json');
    setIsSyncing(false);
    if (result.success && result.content) {
      const importResult = importAllData(result.content);
      if (importResult.success) {
        showMessage('success', 'Данные загружены из GitHub');
        window.location.reload();
      } else {
        showMessage('error', `Ошибка импорта: ${importResult.error}`);
      }
    } else {
      showMessage('error', `Ошибка: ${result.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-condensed text-gold text-lg font-bold mb-3">
          Настройки GitHub
        </h3>
        <p className="text-paper/60 text-sm mb-4">
          Подключите GitHub для хранения и синхронизации данных сайта.
          Создайте Personal Access Token с правами <code className="text-gold/70">repo</code>.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block font-condensed text-gold text-xs uppercase tracking-wider mb-1">
            GitHub Token
          </label>
          <input
            type="password"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full bg-khaki/30 border border-gold/30 rounded px-3 py-2 text-paper font-mono text-sm focus:outline-none focus:border-gold transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-condensed text-gold text-xs uppercase tracking-wider mb-1">
              Владелец (owner)
            </label>
            <input
              type="text"
              value={config.owner}
              onChange={(e) => setConfig({ ...config, owner: e.target.value })}
              placeholder="username"
              className="w-full bg-khaki/30 border border-gold/30 rounded px-3 py-2 text-paper font-mono text-sm focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="block font-condensed text-gold text-xs uppercase tracking-wider mb-1">
              Репозиторий
            </label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => setConfig({ ...config, repo: e.target.value })}
              placeholder="repo-name"
              className="w-full bg-khaki/30 border border-gold/30 rounded px-3 py-2 text-paper font-mono text-sm focus:outline-none focus:border-gold transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block font-condensed text-gold text-xs uppercase tracking-wider mb-1">
            Ветка
          </label>
          <input
            type="text"
            value={config.branch}
            onChange={(e) => setConfig({ ...config, branch: e.target.value })}
            placeholder="main"
            className="w-full bg-khaki/30 border border-gold/30 rounded px-3 py-2 text-paper font-mono text-sm focus:outline-none focus:border-gold transition-all"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleSaveConfig}
          className="px-4 py-2 bg-khaki/50 border border-gold/20 text-paper font-condensed text-sm rounded hover:bg-khaki/70 transition-all"
        >
          💾 Сохранить настройки
        </button>
        <button
          onClick={handlePush}
          disabled={isSyncing || !config.token}
          className="px-4 py-2 bg-army-red/20 border border-army-red/40 text-paper font-condensed text-sm rounded hover:bg-army-red/30 transition-all disabled:opacity-50"
        >
          ↑ Отправить в GitHub
        </button>
        <button
          onClick={handlePull}
          disabled={isSyncing || !config.token}
          className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-condensed text-sm rounded hover:bg-gold/20 transition-all disabled:opacity-50"
        >
          ↓ Загрузить из GitHub
        </button>
      </div>

      {isSyncing && (
        <div className="text-gold text-sm animate-pulse">Синхронизация...</div>
      )}
    </div>
  );
}

function DataTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memorial-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('success', 'Данные экспортированы');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = importAllData(reader.result as string);
      if (result.success) {
        showMessage('success', 'Данные импортированы. Перезагрузка...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showMessage('error', `Ошибка: ${result.error}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-condensed text-gold text-lg font-bold mb-3">
          Экспорт / Импорт данных
        </h3>
        <p className="text-paper/60 text-sm mb-4">
          Экспортируйте все данные сайта (контент, медиа, записи памяти) в JSON-файл
          для резервного копирования или переноса.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold font-condensed text-sm rounded hover:bg-gold/20 transition-all"
        >
          📥 Экспорт данных (JSON)
        </button>
        <label className="px-4 py-2 bg-khaki/50 border border-gold/20 text-paper font-condensed text-sm rounded hover:bg-khaki/70 transition-all cursor-pointer">
          📤 Импорт данных (JSON)
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      <div className="border-t border-gold/10 pt-4">
        <h4 className="font-condensed text-gold text-sm uppercase tracking-wider mb-2">
          О хранилище
        </h4>
        <p className="text-paper/50 text-sm">
          Все данные хранятся в localStorage браузера. При очистке кэша данные будут удалены.
          Регулярно экспортируйте данные или используйте интеграцию с GitHub для сохранности.
        </p>
      </div>
    </div>
  );
}
