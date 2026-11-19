# 🎖️ Мемориальный сайт — Софронов Прокопий Афанасьевич (Боороо)

Мемориальный сайт, посвящённый герою Великой Отечественной войны, с полной CMS-системой для администратора.

## 🚀 Возможности

### Для посетителей:
- Просмотр биографии и боевого пути героя
- Стена памяти с возможностью оставить слова благодарности
- Адаптивный дизайн для мобильных устройств

### Для администратора:
- 🔐 Авторизация по логину/паролю
- ✏️ Редактирование **ВСЕХ** текстов на сайте (inline-редактирование)
- 📷 Загрузка фотографий в раздел «Досье» (архивные фото)
- 🎬 Загрузка видео и фото в раздел «Герой Боороо»
- 🔑 Смена пароля
- 🐙 Синхронизация с GitHub (push/pull данных)
- 💾 Экспорт/импорт всех данных в JSON

## 🔑 Вход для администратора

**По умолчанию:**
- Логин: `admin`
- Пароль: `admin123`

> ⚠️ **Обязательно смените пароль после первого входа!**

### Как войти:
1. Нажмите на иконку 🔒 в правом верхнем углу навигации
2. Введите логин и пароль
3. После входа откроется панель администратора

## 📝 Режим редактирования

1. Войдите как администратор
2. Нажмите кнопку **«⚙ Админ»** в правом верхнем углу
3. Во вкладке **«Контент»** нажмите **«Включить редактирование»**
4. Нажимайте на любой текст на сайте для редактирования
5. **Enter** — сохранить, **Esc** — отменить

## 🐙 Настройка GitHub

Для сохранения данных в GitHub:

1. Создайте новый репозиторий на GitHub
2. Создайте **Personal Access Token**:
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Выдайте права: `repo` (полный доступ)
3. В панели администратора → вкладка **«GitHub»**:
   - Введите токен
   - Укажите владельца репозитория (username/org)
   - Укажите имя репозитория
   - Укажите ветку (обычно `main`)
4. Нажмите **«Сохранить настройки»**
5. Используйте **«Отправить в GitHub»** для публикации данных
6. Используйте **«Загрузить из GitHub»** для получения данных

## 🌐 Деплой на GitHub Pages

### Автоматический деплой:

1. Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runsible: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runsible: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

2. В настройках репозитория:
   - Settings → Pages
   - Source: **GitHub Actions**

3. При каждом push в `main` сайт будет автоматически пересобираться

### Настройка base URL:

Если сайт будет доступен по адресу `https://username.github.io/repo-name/`, добавьте в `vite.config.js`:

```js
export default defineConfig({
  base: '/repo-name/',
  // ...
});
```

## 📁 Структура проекта

```
src/
├── App.tsx                  # Главный компонент
├── main.tsx                 # Точка входа
├── index.css                # Стили (Tailwind + кастомные)
├── contexts/
│   ├── AuthContext.tsx      # Авторизация (хешированные пароли)
│   └── ContentContext.tsx   # Управление контентом (CMS)
├── components/
│   ├── LoginModal.tsx       # Модальное окно входа
│   ├── AdminPanel.tsx       # Панель администратора
│   ├── EditableText.tsx     # Inline-редактирование текста
│   └── MediaUpload.tsx      # Загрузка фото/видео
└── utils/
    ├── security.ts          # XSS-защита, валидация, rate limiting
    ├── crypto.ts            # Хеширование паролей (SHA-256)
    └── storage.ts           # localStorage + GitHub API

public/
├── _headers                 # HTTP-заголовки (Netlify/CDN)
└── .well-known/
    └── security.txt         # Responsible disclosure

SECURITY.md                  # Руководство по безопасности
```

## 🔒 Безопасность

### Реализовано на клиенте:
- ✅ DOMPurify — санитизация пользовательского ввода
- ✅ Валидация и whitelist-фильтрация
- ✅ Rate limiting (5 попыток / минута, блокировка на 5 мин)
- ✅ Хеширование паролей (SHA-256 + salt)
- ✅ Content Security Policy
- ✅ Frame-busting (защита от Clickjacking)
- ✅ HTTP-заголовки безопасности
- ✅ Console warning (защита от social engineering)
- ✅ Все внешние ссылки с `rel="noopener noreferrer"`

### Необходимо настроить на сервере:
- SSL/TLS 1.3
- HSTS preload
- WAF (Cloudflare / AWS WAF)
- Server-side rate limiting
- Мониторинг и логирование

## 🛠️ Технологии

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- DOMPurify (XSS-защита)
- Web Crypto API (хеширование)
- GitHub REST API (синхронизация)

## 📄 Лицензия

Мемориальный проект. Свободное использование для увековечения памяти героев ВОВ.
