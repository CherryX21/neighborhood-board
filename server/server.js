/**
 * Практична робота №14: Node.js, клієнт-серверна взаємодія, найпростіший сервер
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 *
 * Один сервер Express виконує дві ролі на одному порту (а отже, в одному origin,
 * тому налаштування CORS не потрібне):
 *   1. роздає статичні файли клієнта: index.html, css/, js/, assets/;
 *   2. віддає JSON-дані оголошень замість публічного API з практичної роботи №9.
 *
 * Ендпоінти API:
 *   GET  /api/posts       - усі оголошення (200, масив);
 *   GET  /api/posts/:id   - одне оголошення (200) або 404;
 *   POST /api/posts       - нове оголошення з JSON-тіла (201) або 400/413.
 *
 * Практична робота №15: усі відповіді отримують заголовки безпеки (CSP,
 * nosniff, захист від вбудовування у фрейми, Referrer-Policy).
 *
 * Оголошення зберігаються в пам'яті процесу: початковий список читається з
 * server/data/posts.json, а додані через POST зникають після перезапуску.
 */

"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");

// Порт і адреса прослуховування можна змінити змінними середовища.
// За замовчуванням сервер слухає лише локальний інтерфейс, тому з мережі
// гуртожитку до нього ніхто не достукається.
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

// Корінь клієнта - тека над server/. Назовні віддаються лише перелічені
// піддиректорії та index.html, а не весь проєкт (код сервера, .git тощо).
const CLIENT_DIR = path.resolve(__dirname, "..");
const STATIC_DIRS = ["css", "js", "assets"];

const DATA_FILE = path.join(__dirname, "data", "posts.json");

// Обмеження збігаються з полями форми на сторінці
const CATEGORIES = ["electronics", "services", "other"];
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_PRICE = 1000000000;

/* ==========================================================================
   Дані
   ========================================================================== */

/**
 * Перетворює запис початкового файлу (форма з практичної роботи №6: daysAgo і
 * time) на оголошення зі справжньою датою публікації в форматі ISO 8601.
 * Завдяки цьому дані мають таку саму структуру, що й записи IndexedDB
 * (практична робота №11), і щоразу виглядають «свіжими».
 * @param {Object} seed - запис із posts.json
 * @returns {Object} оголошення {id, title, category, price, description, date}
 */
function seedToPost(seed) {
  const now = new Date();
  const date = new Date(now);
  const [hours, minutes] = seed.time.split(":").map(Number);

  date.setDate(date.getDate() - seed.daysAgo);
  date.setHours(hours, minutes, 0, 0);

  return {
    id: seed.id,
    title: seed.title,
    category: seed.category,
    price: seed.price,
    description: seed.description,
    // Оголошення «сьогодні» не може мати час у майбутньому
    date: (date > now ? now : date).toISOString()
  };
}

/**
 * Читає початковий список оголошень з файлу
 * @returns {Array<Object>}
 */
function loadPosts() {
  const seeds = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  return seeds.map(seedToPost);
}

let posts = loadPosts();
let nextId = Math.max(0, ...posts.map((post) => post.id)) + 1;

/**
 * Перевіряє тіло POST-запиту й повертає очищене оголошення або список помилок
 * @param {any} body - розібране JSON-тіло
 * @returns {{errors: string[], value?: Object}}
 */
function validateNewPost(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      errors: [
        "Тіло запиту має бути JSON-об'єктом (Content-Type: application/json)"
      ]
    };
  }

  const errors = [];

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title === "") {
    errors.push("Поле title обов'язкове й має бути непорожнім рядком");
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push(
      `Поле title не може бути довшим за ${MAX_TITLE_LENGTH} символів`
    );
  }

  if (!CATEGORIES.includes(body.category)) {
    errors.push(`Поле category має бути одним із: ${CATEGORIES.join(", ")}`);
  }

  // Ціна необов'язкова: null означає «за домовленістю», 0 - «безкоштовно»
  let price = null;
  if (body.price !== undefined && body.price !== null) {
    if (
      !Number.isInteger(body.price) ||
      body.price < 0 ||
      body.price > MAX_PRICE
    ) {
      errors.push("Поле price має бути цілим невід'ємним числом");
    } else {
      price = body.price;
    }
  }

  let description = "";
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push("Поле description має бути рядком");
    } else if (body.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Поле description не може бути довшим за ${MAX_DESCRIPTION_LENGTH} символів`
      );
    } else {
      description = body.description.trim();
    }
  }

  if (errors.length > 0) return { errors };
  return {
    errors,
    value: { title, category: body.category, price, description }
  };
}

/* ==========================================================================
   Застосунок Express
   ========================================================================== */

const app = express();

// Не повідомляємо зайве про технологію сервера
app.disable("x-powered-by");

/* ---------- Заголовки безпеки (практична робота №15) ---------- */

// Content-Security-Policy (CSP) - друга лінія захисту від XSS. Навіть якщо
// розмітка користувача колись потрапить у DOM (наприклад, через помилково
// доданий v-html), браузер не виконає inline-обробник onerror чи тег <script>,
// бо скрипти дозволено лише з власного origin.
//   script-src 'unsafe-eval': Vue у глобальній збірці компілює рядкові шаблони
//     компонентів під час виконання через new Function. Без цього дозволу застосунок
//     не відобразиться; позбутися його можна лише попередньою компіляцією шаблонів.
//   style-src і font-src: лише власні стилі та Google Fonts (шрифт сторінки).
//   img-src data: потрібен для порожньої іконки <link rel="icon" href="data:,">.
//   connect-src 'self': fetch дозволено лише до цього сервера.
//   object-src, base-uri, form-action, frame-ancestors: закривають вбудовування
//     плагінів, підміну <base>, відправлення форм на сторонні сайти та показ
//     сторінки в чужому фреймі (clickjacking).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    // Браузер не вгадує тип файлу за вмістом (MIME sniffing)
    "X-Content-Type-Options": "nosniff",
    // Той самий захист від фреймів для старих браузерів без frame-ancestors
    "X-Frame-Options": "DENY",
    // Адреса сторінки не передається на інші сайти в заголовку Referer
    "Referrer-Policy": "no-referrer"
  });
  next();
});

// Журнал запитів у терміналі: видно метод, адресу та код відповіді
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt} мс)`
    );
  });
  next();
});

/* ---------- API ---------- */

// Розбір JSON-тіла лише для API, з обмеженням розміру
app.use("/api", express.json({ limit: "10kb" }));

const api = express.Router();

api
  .route("/posts")
  // Список усіх оголошень; Content-Type: application/json встановлює res.json
  .get((req, res) => {
    res.json(posts);
  })
  // Прийом нового оголошення з тіла запиту
  .post((req, res) => {
    const { errors, value } = validateNewPost(req.body);
    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Некоректні дані оголошення", details: errors });
    }

    const post = { id: nextId++, ...value, date: new Date().toISOString() };
    posts.push(post);

    // 201 Created і адреса створеного ресурсу в заголовку Location
    res.status(201).location(`/api/posts/${post.id}`).json(post);
  })
  .all((req, res) => {
    res
      .set("Allow", "GET, POST")
      .status(405)
      .json({ error: "Метод не підтримується" });
  });

api
  .route("/posts/:id")
  // Одне оголошення за id або 404 (також для нечислового id)
  .get((req, res) => {
    const post = /^\d+$/.test(req.params.id)
      ? posts.find((item) => item.id === Number(req.params.id))
      : undefined;

    if (!post) {
      return res.status(404).json({ error: "Оголошення не знайдено" });
    }
    res.json(post);
  })
  .all((req, res) => {
    res
      .set("Allow", "GET")
      .status(405)
      .json({ error: "Метод не підтримується" });
  });

// Будь-який інший шлях під /api
api.use((req, res) => {
  res.status(404).json({ error: "Ендпоінт не знайдено" });
});

app.use("/api", api);

/* ---------- Статичні файли клієнта ---------- */

function sendIndex(req, res) {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
}

app.get(["/", "/index.html"], sendIndex);

STATIC_DIRS.forEach((dir) => {
  // index: false - запит до самої теки не підміняється файлом index.html;
  // redirect: false - немає перенаправлення /js на /js/, одразу 404
  app.use(
    `/${dir}`,
    express.static(path.join(CLIENT_DIR, dir), {
      index: false,
      redirect: false
    })
  );
});

/* ---------- Помилки ---------- */

// Решта адрес: JSON-відповідь із кодом 404, а не порожня сторінка чи зависання
app.use((req, res) => {
  res.status(404).json({ error: "Не знайдено" });
});

// Обробник помилок (чотири аргументи): некоректний JSON, завелике тіло, збій у коді
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Некоректний JSON у тілі запиту" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Тіло запиту завелике" });
  }

  console.error(err);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

/* ==========================================================================
   Запуск
   ========================================================================== */

function start() {
  const server = app.listen(PORT, HOST, () => {
    console.log(
      `Сервер запущено на http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`
    );
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Порт ${PORT} уже зайнятий. Закрийте інший процес або задайте інший: PORT=3001 npm start`
      );
    } else {
      console.error(error);
    }
    process.exit(1);
  });

  return server;
}

// Файл можна і запускати (node server.js), і підключати для перевірки
if (require.main === module) {
  start();
}

module.exports = { app, start };
