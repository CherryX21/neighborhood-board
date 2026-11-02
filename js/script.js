/**
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 *
 * Джерело даних: JSONPlaceholder, https://jsonplaceholder.typicode.com/posts?userId=3
 * (публічне API без ключа). Поле title трактується як заголовок оголошення,
 * поле body — як його текст.
 */

console.log("Скрипт js/script.js успішно підключено");

// Стрілкова функція для скорочення задовгих рядків
const shorten = (text, n) => (text.length > n ? text.slice(0, n) + "…" : text);

// Максимальна довжина опису (збігається з атрибутом maxlength у textarea)
const DESCRIPTION_MAX_LENGTH = 200;

// Поріг, після якого лічильник символів виділяється кольором
const COUNTER_WARNING_THRESHOLD = 20;

// Мінімальна кількість значущих символів у назві оголошення
const TITLE_MIN_LENGTH = 3;

// Адреса публічного API (без ключа). Запит повертає 10 записів користувача №3
const API_URL = "https://jsonplaceholder.typicode.com/posts?userId=3";

// Максимальний час очікування відповіді сервера, мс
const REQUEST_TIMEOUT_MS = 8000;

// Категорії, між якими розподіляються записи API (у відповіді категорії немає)
const API_CATEGORIES = ["electronics", "services", "other"];

// Оголошення, отримані з API. Замінюються повністю при кожному успішному запиті
let remoteAds = [];

// Оголошення, додані користувачем через форму. Не втрачаються при оновленні з API
const localAds = [];

// Чи був хоча б один успішний запит (до цього порожній список не є «порожнім результатом»)
let hasLoadedOnce = false;

// Ознака виконання запиту: захищає від паралельних запитів
let isLoading = false;

/**
 * Повертає усі оголошення дошки: спочатку додані користувачем, потім з API
 * @returns {Array}
 */
function getAllAds() {
  return [...localAds, ...remoteAds];
}

// Словник назв категорій для відображення у бейджах
const categoryNames = {
  electronics: "Електроніка",
  services: "Послуги",
  other: "Інше"
};

// Відповідність категорій векторним іконкам
const categoryIcons = {
  electronics: "assets/img/monitor.svg",
  services: "assets/img/repair.svg",
  other: "assets/img/books.svg"
};

// Пошук контейнера для карток та лічильника
const listContainer = document.querySelector("#listings-list");
const listingsCountElement = document.querySelector("#listings-count");

// Елементи форми додавання оголошення
const addForm = document.querySelector("#add-ad-form");
const titleInput = document.querySelector("#ad-title");
const categorySelect = document.querySelector("#ad-category");
const priceInput = document.querySelector("#ad-price");
const descriptionInput = document.querySelector("#ad-description");
const descriptionCounter = document.querySelector("#ad-description-counter");
const formStatus = document.querySelector("#form-status");

// Кнопки, що показують і приховують форму (у шапці та в блоці оголошень)
const toggleButtons = document.querySelectorAll("[data-toggle-form]");

// Елементи станів завантаження та помилки
const loadingIndicator = document.querySelector("#loading-indicator");
const errorMessage = document.querySelector("#error-message");
const errorDetails = document.querySelector("#error-details");
const refreshButton = document.querySelector("#refresh-button");
const retryButton = document.querySelector("#retry-button");

// Форма фільтрації за категорією
const filterForm = document.querySelector("#filter-form");
const filterSelect = document.querySelector("#category");

// Власні повідомлення для порожніх обов'язкових полів форми
const requiredMessages = {
  "ad-title": "Вкажіть назву оголошення",
  "ad-category": "Оберіть категорію зі списку"
};

// Поточна категорія фільтра: значення "all" означає відсутність фільтрації
let currentCategory = "all";

// Видалення статичного шаблону картки перед формуванням списку
if (listContainer) {
  const staticPlaceholder = listContainer.querySelector(".card");
  if (staticPlaceholder) {
    staticPlaceholder.remove();
  }
}

/**
 * Повертає копію масиву, впорядковану від найсвіжіших оголошень до старіших.
 * При однаковому віку новіше оголошення (з більшим id) розташовується вище.
 * @param {Array} listings - масив оголошень
 * @returns {Array}
 */
function sortByFreshness(listings) {
  return [...listings].sort((a, b) => a.daysAgo - b.daysAgo || b.id - a.id);
}

/**
 * Повертає оголошення, що відповідають поточному фільтру категорії
 * @returns {Array}
 */
function getVisibleAds() {
  const allAds = getAllAds();
  const filtered =
    currentCategory === "all"
      ? allAds
      : allAds.filter((ad) => ad.category === currentCategory);
  return sortByFreshness(filtered);
}

/**
 * Динамічна генерація та вставка карток оголошень у DOM
 * @param {Array} listings - масив оголошень
 */
function renderListings(listings) {
  if (!listContainer) return;

  // Очищення контейнера перед рендерингом
  listContainer.innerHTML = "";

  // Порожній результат показуємо лише після першого успішного завантаження
  if (listings.length === 0 && hasLoadedOnce) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Оголошень за вибраною категорією немає.";
    listContainer.append(empty);
    return;
  }

  listings.forEach((ad) => {
    // Створення картки
    const card = document.createElement("article");
    card.className = "card";

    // Встановлення data-атрибута з віком оголошення
    card.dataset.daysAgo = ad.daysAgo;

    // Додавання класу для оголошень старших за 14 днів
    if (ad.daysAgo > 14) {
      card.classList.add("outdated");
    }

    // Зображення картки
    const img = document.createElement("img");
    img.src = categoryIcons[ad.category] || "assets/img/books.svg";
    img.alt = ad.title;
    img.className = "card-img";

    // Блок із текстовим вмістом
    const content = document.createElement("div");
    content.className = "card-content";

    // Мета-дані: бейдж категорії та дата публікації
    const meta = document.createElement("div");
    meta.className = "card-meta";

    const badge = document.createElement("span");
    badge.className = `badge badge-${ad.category}`;
    badge.textContent = categoryNames[ad.category] || ad.category;

    const date = document.createElement("time");
    date.className = "card-date";
    if (ad.daysAgo === 0) {
      date.textContent = ad.time ? `Сьогодні, ${ad.time}` : "Сьогодні";
    } else if (ad.daysAgo === 1) {
      date.textContent = ad.time ? `Вчора, ${ad.time}` : "Вчора";
    } else {
      date.textContent = `${ad.daysAgo} дн. тому`;
    }

    meta.append(badge, date);

    // Заголовок оголошення
    const title = document.createElement("h3");
    title.textContent = ad.title;

    // Категорія оголошення
    const category = document.createElement("p");
    category.className = "card-category";
    category.textContent = `Категорія: ${categoryNames[ad.category] || ad.category}`;

    // Вартість
    const price = document.createElement("p");
    price.className = "card-price";
    if (ad.price === null) {
      price.textContent = "Ціна: за домовленістю";
    } else {
      price.textContent =
        ad.price === 0 ? "Ціна: безкоштовно" : `Ціна: ${ad.price} грн.`;
    }

    // Збирання структури картки: опис додається лише якщо він заповнений
    content.append(meta, title, category);
    if (ad.description) {
      const description = document.createElement("p");
      description.className = "card-description";
      description.textContent = ad.description;
      content.append(description);
    }
    content.append(price);
    card.append(img, content);

    // Додавання картки до контейнера
    listContainer.append(card);
  });
}

/**
 * Оновлення лічильника активних оголошень (daysAgo <= 14)
 * @param {Array} listings - масив оголошень
 */
function updateListingsSummary(listings) {
  if (!listingsCountElement) return;

  const activeCount = listings.filter((ad) => ad.daysAgo <= 14).length;
  listingsCountElement.textContent = `Активних оголошень: ${activeCount} (із ${listings.length})`;
}

/**
 * Перемальовує список з урахуванням фільтра та оновлює лічильник.
 * Лічильник завжди рахує всі оголошення, незалежно від фільтра.
 */
function refreshBoard() {
  renderListings(getVisibleAds());
  updateListingsSummary(getAllAds());
}

// Початковий рендеринг: список порожній до відповіді API, лічильник показує 0
refreshBoard();

/**
 * Синхронізує стан кнопок показу форми з її поточною видимістю
 */
function syncToggleButtons() {
  const isVisible = addForm.classList.contains("visible");
  toggleButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(isVisible));
  });
}

/**
 * Показує або приховує повідомлення про результат додавання
 * @param {string} message - текст повідомлення (порожній рядок ховає блок)
 */
function setStatus(message) {
  if (formStatus) {
    formStatus.textContent = message;
  }
}

/**
 * Виводить або очищує текст помилки під полем.
 * Для поля з id="x" повідомлення розміщується в елементі з id="x-error".
 * @param {HTMLInputElement|HTMLSelectElement} field - поле форми
 */
function renderFieldError(field) {
  const errorElement = document.querySelector(`#${field.id}-error`);
  if (!errorElement) return;

  if (field.validity.valid) {
    errorElement.textContent = "";
    field.removeAttribute("aria-invalid");
  } else {
    errorElement.textContent = field.validationMessage;
    field.setAttribute("aria-invalid", "true");
  }
}

/**
 * Прибирає текст помилки та позначку aria-invalid, не виконуючи перевірку поля
 * @param {HTMLInputElement|HTMLSelectElement} field - поле форми
 */
function clearFieldError(field) {
  const errorElement = document.querySelector(`#${field.id}-error`);
  if (errorElement) {
    errorElement.textContent = "";
  }
  field.removeAttribute("aria-invalid");
}

/**
 * Підставляє власне повідомлення, якщо обов'язкове поле залишилось порожнім.
 * Без цього браузер показав би стандартний текст мовою інтерфейсу браузера.
 * @param {HTMLInputElement|HTMLSelectElement} field - поле форми
 */
function applyRequiredMessage(field) {
  if (field.validity.valueMissing) {
    field.setCustomValidity(requiredMessages[field.id] || "Заповніть це поле");
  }
}

/**
 * Додаткова перевірка назви: значущих символів (без крайніх пробілів) не менше TITLE_MIN_LENGTH.
 * Порожнє поле залишається на розсуд атрибута required.
 */
function validateTitle() {
  const length = titleInput.value.trim().length;
  if (titleInput.value !== "" && length < TITLE_MIN_LENGTH) {
    titleInput.setCustomValidity(
      `Назва має містити щонайменше ${TITLE_MIN_LENGTH} символи без урахування пробілів`
    );
  } else {
    titleInput.setCustomValidity("");
    applyRequiredMessage(titleInput);
  }
}

/**
 * Додаткова перевірка ціни: значення не може бути від'ємним.
 * Порожнє поле допустиме, воно означає безкоштовне оголошення.
 */
function validatePrice() {
  if (priceInput.value !== "" && Number(priceInput.value) < 0) {
    priceInput.setCustomValidity("Ціна не може бути від'ємною");
  } else {
    priceInput.setCustomValidity("");
  }
}

/**
 * Оновлює лічильник символів, що залишилися в описі, і підсвічує його біля ліміту
 */
function updateDescriptionCounter() {
  const remaining = DESCRIPTION_MAX_LENGTH - descriptionInput.value.length;
  descriptionCounter.textContent = `Залишилось символів: ${remaining}`;
  descriptionCounter.classList.toggle(
    "near-limit",
    remaining <= COUNTER_WARNING_THRESHOLD
  );
}

/**
 * Повертає нове значення id на основі максимального наявного
 * @returns {number}
 */
function getNextId() {
  return Math.max(0, ...getAllAds().map((ad) => ad.id)) + 1;
}

/**
 * Повертає поточний час у форматі ГГ:ХХ
 * @returns {string}
 */
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Друга подія варіанта: клік по кнопках «Додати оголошення» показує або приховує форму
toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!addForm) return;

    addForm.classList.toggle("visible");
    syncToggleButtons();
    setStatus("");

    // Після відкриття форми курсор одразу ставиться в перше поле
    if (addForm.classList.contains("visible")) {
      titleInput.focus();
    }
  });
});

if (addForm) {
  // Лічильник символів оновлюється на кожну зміну тексту опису
  descriptionInput.addEventListener("input", updateDescriptionCounter);

  // Додаткова валідація назви та ціни виконується на кожну зміну значення
  titleInput.addEventListener("input", () => {
    validateTitle();
    renderFieldError(titleInput);
  });

  priceInput.addEventListener("input", () => {
    validatePrice();
    renderFieldError(priceInput);
  });

  categorySelect.addEventListener("change", () => {
    categorySelect.setCustomValidity("");
    renderFieldError(categorySelect);
  });

  // Подія invalid спрацьовує на полі, яке не пройшло перевірку під час спроби надсилання
  [titleInput, categorySelect, priceInput].forEach((field) => {
    field.addEventListener("invalid", () => {
      applyRequiredMessage(field);
      renderFieldError(field);
    });
  });

  // Надсилання форми: без перезавантаження сторінки, з додаванням запису в масив
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // Повторний запуск власних перевірок гарантує актуальний стан перед надсиланням
    validateTitle();
    validatePrice();

    if (!addForm.checkValidity()) {
      addForm.reportValidity();
      return;
    }

    // Формування нового об'єкта тієї ж структури, що й оголошення, отримані з API
    const newAd = {
      id: getNextId(),
      title: titleInput.value.trim(),
      category: categorySelect.value,
      price: priceInput.value === "" ? 0 : Number(priceInput.value),
      description: descriptionInput.value.trim(),
      daysAgo: 0,
      time: getCurrentTime()
    };

    localAds.push(newAd);

    // Скидання фільтра, щоб нове оголошення гарантовано з'явилося у списку
    currentCategory = "all";
    if (filterSelect) {
      filterSelect.value = "all";
    }

    refreshBoard();

    // Очищення форми: reset() не викликає подію input, тому стан оновлюється вручну
    addForm.reset();
    [titleInput, categorySelect, priceInput].forEach((field) => {
      field.setCustomValidity("");
      clearFieldError(field);
    });
    updateDescriptionCounter();

    // Приховування форми та повідомлення про успіх
    addForm.classList.remove("visible");
    syncToggleButtons();
    setStatus(`Оголошення «${shorten(newAd.title, 40)}» додано.`);

    console.log(
      `Додано оголошення #${newAd.id}. Усього на дошці: ${getAllAds().length}`
    );
  });
}

// Фільтрація за категорією без перезавантаження сторінки
if (filterForm) {
  filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    currentCategory = filterSelect.value;
    refreshBoard();
  });
}

// Початковий стан лічильника символів
if (descriptionInput && descriptionCounter) {
  updateDescriptionCounter();
}

/**
 * Фільтрація та виведення оголошень за категорією в консоль
 */
function printAdsByCategory(adsList, targetCategory) {
  const catTitle = categoryNames[targetCategory] || targetCategory;
  console.log(`Оголошення категорії: "${catTitle}"`);

  let count = 0;
  let outdatedCount = 0;

  for (const ad of adsList) {
    if (targetCategory === "all" || ad.category === targetCategory) {
      count++;
      const statusLabel = ad.daysAgo > 14 ? "застаріле" : "актуальне";
      if (ad.daysAgo > 14) outdatedCount++;

      const shortTitle = shorten(ad.title, 35);
      let priceText = `${ad.price} грн`;
      if (ad.price === null) priceText = "за домовленістю";
      else if (ad.price === 0) priceText = "Безкоштовно";

      console.log(
        `[#${ad.id}] "${shortTitle}" | Ціна: ${priceText} | Опубліковано: ${ad.daysAgo} дн. тому, статус: ${statusLabel}`
      );
    }
  }

  console.log(
    `Підсумок для "${catTitle}": знайдено ${count} оголошень (актуальних: ${count - outdatedCount}, застарілих: ${outdatedCount}).`
  );
}

/**
 * Підрахунок загальної статистики дошки оголошень
 */
function printBoardStatistics(adsList) {
  console.log("Загальна статистика дошки оголошень");

  let outdatedTotal = 0;
  let activeTotal = 0;
  let totalPrice = 0;

  for (const ad of adsList) {
    totalPrice += ad.price ?? 0;
    if (ad.daysAgo > 14) {
      outdatedTotal++;
    } else {
      activeTotal++;
    }
  }

  console.log(`Всього оголошень у базі: ${adsList.length}`);
  console.log(`Актуальних оголошень (<= 14 днів): ${activeTotal}`);
  console.log(`Застарілих оголошень (> 14 днів): ${outdatedTotal}`);
  console.log(
    `Сумарна вартість оголошень із вказаною ціною: ${totalPrice} грн`
  );
}

/**
 * Виводить у консоль аналітику по поточному вмісту дошки.
 * Викликається після кожного успішного завантаження даних з API.
 */
function logBoardAnalytics() {
  if (listContainer) {
    const renderedCards = listContainer.querySelectorAll(".card");
    const outdatedCards = listContainer.querySelectorAll(".card.outdated");
    console.log(`Успішно згенеровано елементів у DOM: ${renderedCards.length}`);
    console.log(`Оголошень із класом .outdated: ${outdatedCards.length}`);
  }

  const allAds = getAllAds();
  API_CATEGORIES.forEach((category) => printAdsByCategory(allAds, category));
  printBoardStatistics(allAds);
}

/* ==========================================================================
   Практична робота №9: клієнт для публічного API (fetch, async/await)
   ========================================================================== */

/**
 * Помилка завантаження даних. Поле kind визначає причину:
 *   "network" — немає зʼєднання (fetch завершився reject),
 *   "timeout" — сервер не відповів за REQUEST_TIMEOUT_MS,
 *   "http"    — сервер відповів кодом 4xx/5xx (поле status),
 *   "format"  — тіло відповіді не є очікуваним JSON-масивом.
 */
class LoadError extends Error {
  constructor(kind, status) {
    super(`Помилка завантаження: ${kind}${status ? ` (${status})` : ""}`);
    this.name = "LoadError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Виконує GET-запит і повертає розібране тіло відповіді (JSON).
 * fetch() відхиляє проміс лише за мережевого збою, тому код статусу
 * перевіряється вручну через response.ok.
 *
 * @param {string} url - адреса ресурсу
 * @param {number} timeoutMs - максимальний час очікування, мс
 * @returns {Promise<any>}
 * @throws {LoadError}
 */
async function fetchJson(url, timeoutMs) {
  // AbortController дозволяє обірвати запит, якщо сервер не відповідає
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
    } catch {
      throw new LoadError(controller.signal.aborted ? "timeout" : "network");
    }

    // 404 або 500 не є винятком для fetch — перевіряємо статус самостійно
    if (!response.ok) {
      throw new LoadError("http", response.status);
    }

    try {
      // Розбір тіла відповіді також асинхронний
      return await response.json();
    } catch {
      throw new LoadError(controller.signal.aborted ? "timeout" : "format");
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Перевіряє, що запис API містить текстові поля title та body
 * @param {any} post - запис з відповіді API
 * @returns {boolean}
 */
function isValidPost(post) {
  return (
    post !== null &&
    typeof post === "object" &&
    Number.isInteger(post.id) &&
    typeof post.title === "string" &&
    post.title.trim() !== "" &&
    typeof post.body === "string"
  );
}

/**
 * Перетворює запис JSONPlaceholder на оголошення дошки (та сама структура,
 * що й в оголошень, доданих через форму).
 *
 * API повертає лише title та body, тому решта полів умовна:
 *   category — розподіляється по колу між трьома категоріями;
 *   price — null: ціна невідома, у картці виводиться «за домовленістю»;
 *   daysAgo — залежить від порядкового номера запису (дати в API немає).
 *
 * @param {{id: number, title: string, body: string}} post - запис з API
 * @param {number} index - порядковий номер запису у відповіді
 * @returns {Object} оголошення
 */
function mapPostToAd(post, index) {
  // Заголовки JSONPlaceholder починаються з малої літери — вирівнюємо вигляд
  const title = post.title.trim();
  return {
    id: post.id,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    category: API_CATEGORIES[index % API_CATEGORIES.length],
    price: null,
    description: post.body.replace(/\s*\n\s*/g, " ").trim(),
    daysAgo: index * 2
  };
}

/**
 * Повертає текст, що пояснює причину помилки завантаження
 * @param {Error} error - перехоплена помилка
 * @returns {string}
 */
function describeError(error) {
  if (error instanceof LoadError) {
    switch (error.kind) {
      case "network":
        return "Немає зʼєднання із сервером. Перевірте інтернет.";
      case "timeout":
        return `Сервер не відповів протягом ${REQUEST_TIMEOUT_MS / 1000} с.`;
      case "http":
        return `Сервер відповів кодом ${error.status}.`;
      case "format":
        return "Сервер повернув дані в неочікуваному форматі.";
    }
  }
  return "Сталася непередбачена помилка.";
}

/**
 * Вмикає стан завантаження: показує індикатор і блокує кнопки «Оновити»
 */
function showLoading() {
  if (loadingIndicator) loadingIndicator.hidden = false;
  if (listContainer) listContainer.setAttribute("aria-busy", "true");
  [refreshButton, retryButton].forEach((button) => {
    if (button) button.disabled = true;
  });
}

/**
 * Вимикає стан завантаження: ховає індикатор і розблоковує кнопки
 */
function hideLoading() {
  if (loadingIndicator) loadingIndicator.hidden = true;
  if (listContainer) listContainer.setAttribute("aria-busy", "false");
  [refreshButton, retryButton].forEach((button) => {
    if (button) button.disabled = false;
  });
}

/**
 * Показує користувачу повідомлення про помилку з поясненням причини
 * @param {Error} error - перехоплена помилка
 */
function showError(error) {
  if (errorDetails) errorDetails.textContent = describeError(error);
  if (errorMessage) errorMessage.hidden = false;
}

/**
 * Ховає повідомлення про помилку (перед новою спробою)
 */
function hideError() {
  if (errorMessage) errorMessage.hidden = true;
}

/**
 * Завантажує оголошення з публічного API JSONPlaceholder та виводить їх на дошку.
 *
 * API: https://jsonplaceholder.typicode.com/posts?userId=3 (без ключа).
 * Помилка варіанта №18: за мережевого збою користувач бачить повідомлення
 * «Оголошення тимчасово недоступні» замість порожньої сторінки. Раніше
 * завантажені оголошення за помилки не зникають.
 */
async function loadData() {
  // Повторний клік під час виконання запиту ігнорується
  if (isLoading) return;
  isLoading = true;

  showLoading();
  hideError();

  try {
    const posts = await fetchJson(API_URL, REQUEST_TIMEOUT_MS);
    console.log("Отримано дані від API:", posts);

    if (!Array.isArray(posts)) {
      throw new LoadError("format");
    }

    // Адаптація полів відповіді API до структури оголошень дошки
    remoteAds = posts.filter(isValidPost).map(mapPostToAd);
    hasLoadedOnce = true;

    // Повторне використання функції рендеру списку з практикуму №7
    refreshBoard();
    logBoardAnalytics();
  } catch (error) {
    // Сюди потрапляють мережеві збої, тайм-аут, коди 4xx/5xx та неочікуваний формат
    showError(error);
    console.error("Помилка завантаження оголошень:", error);
  } finally {
    // Стан завантаження зникає і за успіху, і за помилки
    isLoading = false;
    hideLoading();
  }
}

// Обидві кнопки «Оновити» повторюють запит без перезавантаження сторінки
[refreshButton, retryButton].forEach((button) => {
  if (button) button.addEventListener("click", loadData);
});

// Перший запит до API під час завантаження сторінки
loadData();
