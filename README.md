# BioTracker

Персональный трекер здоровья и привычек. React + Vite + Capacitor Android.

---

## Стек

- **React 18** — UI
- **Vite 5** — сборщик
- **Capacitor 6** — Android WebView wrapper
- **localStorage** — хранилище данных

---

## Экраны

| Экран | Описание |
|-------|----------|
| Сегодня | Трекер привычек, вес, стрик, добавки |
| План | Персональный план питания и тренировок |
| Питание | Дневник питания, макронутриенты, избранное |
| Добавки | Список добавок, история за неделю |
| Прогресс | График веса, серия дней |
| Статистика | Недельная статистика, слабые места |
| Дневник | Заметки, отёки, Export/Import |

---

## Локальная разработка

```bash
npm install
npm run dev
```

---

## Сборка APK через GitHub Actions

1. Сделай **push** в ветку `main` или `master`
2. Перейди в **Actions** → выбери последний запуск
3. Дождись завершения (~5–8 минут)
4. В разделе **Artifacts** скачай `biotracker-debug-N.zip`
5. Распакуй → установи `app-debug.apk` на Android

> Для установки APK на Android: Настройки → Безопасность → Разрешить установку из неизвестных источников

---

## Шрифты

Файлы `.woff2` должны лежать в `public/fonts/`:

```
public/fonts/
├── space-mono-regular.woff2
├── space-mono-700.woff2
├── crimson-pro-regular.woff2
├── crimson-pro-italic.woff2
└── crimson-pro-600.woff2
```

Скачать: [Google Webfonts Helper](https://gwfh.mranftl.com/fonts)

Без файлов шрифтов приложение работает корректно — браузер использует системный `monospace` и `serif`.

---

## Export / Import данных

На экране **Дневник** → кнопки `[ EXPORT ]` и `[ IMPORT ]`.

Формат backup-файла:
```json
{
  "version": 1,
  "exportedAt": "ISO дата",
  "data": { "goals:v1": {}, "nutrition:...": [], ... }
}
```

---

## Структура localStorage

| Ключ | Тип | Описание |
|------|-----|----------|
| `goals:v1` | Object | Пользовательские цели |
| `daydata:YYYY-MM-DD` | Object | Данные привычек за день |
| `nutrition:YYYY-MM-DD` | Array | Записи питания |
| `weight:history` | Array | История веса |
| `supplements:YYYY-MM-DD` | Object | Принятые добавки |
| `favorites:products` | Array | Избранные продукты |
| `journal:YYYY-MM-DD` | Object | Запись дневника |
| `meta:streak` | Object | Серия дней |
| `meta:startDate` | String | Дата начала |

---

## Android Back Button

Реализован через `@capacitor/app`:
- На любом экране → возврат на «Сегодня»
- На «Сегодня» → выход из приложения
