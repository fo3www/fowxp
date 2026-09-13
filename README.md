# fowww.xp

Музыкальный сайт в эстетике Windows XP на Next.js, Drizzle ORM и PostgreSQL. Каталог синхронизируется с публичным профилем SoundCloud, а оформление и треки управляются через встроенную админ-панель.

## Важно о Neon

Neon размещает PostgreSQL и Data API, но не запускает Next.js-сервер. Поэтому рабочая схема деплоя выглядит так:

- **сайт:** Vercel, Render, Railway или другой Node.js-хостинг;
- **база данных:** Neon PostgreSQL;
- **доступ приложения к БД:** защищенная server-side переменная `DATABASE_URL`.

Адрес вида

```text
https://ep-gentle-thunder-azrkrsx9.apirest.c-3.ap-southeast-1.aws.neon.tech/neondb/rest/v1
```

— это публичный endpoint Neon Data API, а не ключ и не PostgreSQL connection string. Сам по себе он не дает приложению доступ к данным. Этот проект использует Drizzle на сервере, поэтому ему нужен pooled PostgreSQL URL из Neon Dashboard.

## 1. Получить строку подключения Neon

1. Откройте проект в [Neon Console](https://console.neon.tech/).
2. Нажмите **Connect**.
3. Выберите базу `neondb` и режим **Pooled connection**.
4. Скопируйте строку формата:

```text
postgresql://USER:PASSWORD@ep-gentle-thunder-azrkrsx9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Не публикуйте эту строку в GitHub и не добавляйте ее в клиентский JavaScript.

## 2. Переменные окружения

Скопируйте `.env.example` в `.env` для локальной разработки или добавьте значения в настройках хостинга:

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | да | Pooled PostgreSQL connection string из Neon |
| `ADMIN_PASSWORD` | да в production | Пароль встроенной админ-панели |
| `ADMIN_SECRET` | да в production | Случайный секрет длиной не менее 32 символов для подписи cookie |
| `DATABASE_POOL_MAX` | нет | Размер пула; по умолчанию для Neon используется `3` |
| `NEON_DATA_API_URL` | нет | Информационный Data API endpoint; серверные запросы Drizzle его не используют |

Сгенерировать секрет можно командой:

```bash
openssl rand -base64 48
```

## 3. Создать таблицы

После установки `DATABASE_URL` выполните один раз:

```bash
npm install
npx drizzle-kit push --config=drizzle.config.ts --force
```

Команда создаст таблицы `settings` и `tracks` в Neon. При первом открытии сайт создаст строку настроек и попробует импортировать каталог из SoundCloud.

## 4. Локальный запуск

```bash
npm run dev
```

Откройте `http://localhost:3000`. Проверка БД доступна на `http://localhost:3000/api/health`.

## 5. Деплой сайта

### Vercel

1. Импортируйте GitHub-репозиторий в Vercel.
2. Добавьте `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SECRET` и при необходимости `DATABASE_POOL_MAX=3` в **Project Settings → Environment Variables**.
3. До первого запуска примените схему командой из раздела 3 локально, используя Neon `DATABASE_URL`.
4. Deploy. Vercel автоматически определит Next.js.

### Render или Railway

- Build command: `npm run build`
- Start command: `npm run start`
- Runtime: Node.js
- Переменные окружения: те же, что указаны выше.

Схему Neon также нужно применить один раз до запуска сайта.

## Админ-панель

Откройте значок панели управления на рабочем столе сайта и войдите с `ADMIN_PASSWORD`. В production пароль по умолчанию отключен. Из панели можно:

- менять имя, био, ссылки, фон, аватар и баннер;
- синхронизировать треки с SoundCloud;
- скрывать, закреплять, переименовывать и удалять треки.

## Проверка деплоя

```bash
curl https://YOUR-DOMAIN/api/health
```

При успешном Neon-подключении ответ содержит:

```json
{"ok":true,"database":"neon","dataApiConfigured":true}
```

Если `ok` равен `false`, проверьте `DATABASE_URL`, наличие `?sslmode=require`, доступность Neon branch и созданные таблицы.
