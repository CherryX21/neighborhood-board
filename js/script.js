/**
 * Практична робота №8: Обробка подій та форми, клієнтська валідація
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
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

// Масив оголошень із параметрами варіанта №18
const ads = [
  {
    id: 1,
    title: "24-дюймовий IPS-монітор Full HD у відмінному стані",
    category: "electronics",
    price: 3500,
    daysAgo: 0,
    time: "10:20"
  },
  {
    id: 2,
    title: "Ремонт комп'ютерів, діагностика та заміна термопасти",
    category: "services",
    price: 300,
    daysAgo: 0,
    time: "09:45"
  },
  {
    id: 3,
    title: "Навчальні підручники з веб-програмування та алгоритмів",
    category: "other",
    price: 0,
    daysAgo: 1,
    time: "14:00"
  },
  {
    id: 4,
    title: "Бездротова механічна клавіатура з підсвіткою (червоні свічі)",
    category: "electronics",
    price: 1200,
    daysAgo: 1,
    time: "12:30"
  },
  {
    id: 5,
    title: "Налаштування домашнього Wi-Fi роутера та домашньої мережі",
    category: "services",
    price: 250,
    daysAgo: 9
  },
  {
    id: 6,
    title: "Стратегічна настільна гра для дружньої компанії 2–5 осіб",
    category: "other",
    price: 450,
    daysAgo: 10
  },
  {
    id: 7,
    title: "Лазерний принтер HP LaserJet 1010 на запчастини або відновлення",
    category: "electronics",
    price: 600,
    daysAgo: 18
  },
  {
    id: 8,
    title: "Репетиторство з англійської мови для школярів і студентів",
    category: "services",
    price: 350,
    daysAgo: 21
  },
  {
    id: 9,
    title: "Дитяче дерев'яне ліжечко з ортопедичним матрацом",
    category: "other",
    price: 800,
    daysAgo: 30
  }
];

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
  const filtered =
    currentCategory === "all"
      ? ads
      : ads.filter((ad) => ad.category === currentCategory);
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
    price.textContent = ad.price === 0 ? "Ціна: безкоштовно" : `Ціна: ${ad.price} грн.`;

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
  updateListingsSummary(ads);
}

// Початковий рендеринг списку карток і лічильника
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
  descriptionCounter.classList.toggle("near-limit", remaining <= COUNTER_WARNING_THRESHOLD);
}

/**
 * Повертає нове значення id на основі максимального наявного
 * @returns {number}
 */
function getNextId() {
  return Math.max(0, ...ads.map((ad) => ad.id)) + 1;
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

    // Формування нового об'єкта тієї ж структури, що й елементи масиву ads
    const newAd = {
      id: getNextId(),
      title: titleInput.value.trim(),
      category: categorySelect.value,
      price: priceInput.value === "" ? 0 : Number(priceInput.value),
      description: descriptionInput.value.trim(),
      daysAgo: 0,
      time: getCurrentTime()
    };

    ads.push(newAd);

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

    console.log(`Додано оголошення #${newAd.id}. Усього в масиві: ${ads.length}`);
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

// Перевірка кількості згенерованих карток у консолі
if (listContainer) {
  const renderedCards = listContainer.querySelectorAll(".card");
  const outdatedCards = listContainer.querySelectorAll(".card.outdated");
  console.log(`Успішно згенеровано елементів у DOM: ${renderedCards.length}`);
  console.log(`Оголошень із класом .outdated: ${outdatedCards.length}`);
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
      const priceText = ad.price === 0 ? "Безкоштовно" : `${ad.price} грн`;

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
    totalPrice += ad.price;
    if (ad.daysAgo > 14) {
      outdatedTotal++;
    } else {
      activeTotal++;
    }
  }

  console.log(`Всього оголошень у базі: ${adsList.length}`);
  console.log(`Актуальних оголошень (<= 14 днів): ${activeTotal}`);
  console.log(`Застарілих оголошень (> 14 днів): ${outdatedTotal}`);
  console.log(`Сумарна заявлена вартість товарів/послуг: ${totalPrice} грн`);
}

// Виведення аналітики в консоль
printAdsByCategory(ads, "electronics");
printAdsByCategory(ads, "services");
printAdsByCategory(ads, "other");
printBoardStatistics(ads);
