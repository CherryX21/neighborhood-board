/**
 * Практична робота №7: Маніпуляція DOM за допомогою JavaScript
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 */

console.log("=== Скрипт js/script.js успішно підключено ===");

// Стрілкова функція для скорочення задовгих рядків
const shorten = (text, n) => (text.length > n ? text.slice(0, n) + "…" : text);

// Масив оголошень із параметрами варіанта №18
const ads = [
  {
    id: 1,
    title: "24-дюймовий IPS-монітор Full HD у відмінному стані",
    category: "electronics",
    price: 3500,
    daysAgo: 0
  },
  {
    id: 2,
    title: "Ремонт комп'ютерів, діагностика та заміна термопасти",
    category: "services",
    price: 300,
    daysAgo: 0
  },
  {
    id: 3,
    title: "Навчальні підручники з веб-програмування та алгоритмів",
    category: "other",
    price: 0,
    daysAgo: 1
  },
  {
    id: 4,
    title: "Бездротова механічна клавіатура з підсвіткою (червоні свічі)",
    category: "electronics",
    price: 1200,
    daysAgo: 1
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

// Видалення статичного шаблону картки перед формуванням списку
if (listContainer) {
  const staticPlaceholder = listContainer.querySelector(".card");
  if (staticPlaceholder) {
    staticPlaceholder.remove();
  }
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
    card.setAttribute("data-days-ago", ad.daysAgo);

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
      date.textContent = "Сьогодні, 10:20";
    } else if (ad.daysAgo === 1) {
      date.textContent = "Вчора, 14:00";
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

    // Збирання структури картки
    content.append(meta, title, category, price);
    card.append(img, content);

    // Додавання картки до контейнера
    listContainer.append(card);
  });
}

// Початковий рендеринг списку карток
renderListings(ads);

/**
 * Оновлення лічильника активних оголошень (daysAgo <= 14)
 * @param {Array} listings - масив оголошень
 */
function updateListingsSummary(listings) {
  if (!listingsCountElement) return;

  const activeCount = listings.filter((ad) => ad.daysAgo <= 14).length;
  listingsCountElement.textContent = `Активних оголошень: ${activeCount} (із ${listings.length})`;
}

// Оновлення лічильника на сторінці
updateListingsSummary(ads);

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
  console.log(`\n--- Оголошення категорії: "${catTitle}" ---`);

  let count = 0;
  let outdatedCount = 0;

  for (const ad of adsList) {
    if (targetCategory === "all" || ad.category === targetCategory) {
      count++;
      let statusLabel = ad.daysAgo > 14 ? "застаріле" : "актуальне";
      if (ad.daysAgo > 14) outdatedCount++;

      const shortTitle = shorten(ad.title, 35);
      const priceText = ad.price === 0 ? "Безкоштовно" : `${ad.price} грн`;

      console.log(
        `[#${ad.id}] "${shortTitle}" | Ціна: ${priceText} | Опубліковано: ${ad.daysAgo} дн. тому -> [Статус: ${statusLabel}]`
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
  console.log("\n=== Загальна статистика дошки оголошень ===");

  let totalAds = adsList.length;
  let outdatedTotal = 0;
  let activeTotal = 0;
  let totalPrice = 0;

  for (let i = 0; i < adsList.length; i++) {
    const ad = adsList[i];
    totalPrice += ad.price;
    if (ad.daysAgo > 14) {
      outdatedTotal++;
    } else {
      activeTotal++;
    }
  }

  console.log(`Всього оголошень у базі: ${totalAds}`);
  console.log(`Актуальних оголошень (<= 14 днів): ${activeTotal}`);
  console.log(`Застарілих оголошень (> 14 днів): ${outdatedTotal}`);
  console.log(`Сумарна заявлена вартість товарів/послуг: ${totalPrice} грн`);
}

// Виведення аналітики в консоль
printAdsByCategory(ads, "electronics");
printAdsByCategory(ads, "services");
printAdsByCategory(ads, "other");
printBoardStatistics(ads);
