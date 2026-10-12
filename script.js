/**
 * Практична робота №6: Основи JavaScript: змінні, умови, цикли, функції
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 */

// Крок 3: Перевірка підключення скрипта до HTML-сторінки
console.log('=== Скрипт script.js успішно підключено до веб-сторінки ===');

// Крок 7: Стрілкова функція скорочення тексту до n символів (за специфікацією варіанта №18)
// Якщо довжина рядка перевищує n, обрізає його та додає трикрапку '…'
const shorten = (text, n) => (text.length > n ? text.slice(0, n) + '…' : text);

// Крок 4: Оголошення базових даних варіанта №18 (масив об'єктів оголошень)
// Кожне оголошення містить id, title (заголовок), category (категорію),
// price (ціну у грн) та daysAgo (кількість днів з моменту публікації)
const ads = [
  {
    id: 1,
    title: '24-дюймовий IPS-монітор Full HD у відмінному стані',
    category: 'electronics',
    price: 3500,
    daysAgo: 0,
  },
  {
    id: 2,
    title: "Ремонт комп'ютерів, діагностика та заміна термопасти",
    category: 'services',
    price: 300,
    daysAgo: 0,
  },
  {
    id: 3,
    title: 'Навчальні підручники з веб-програмування та алгоритмів',
    category: 'other',
    price: 0,
    daysAgo: 1,
  },
  {
    id: 4,
    title: 'Бездротова механічна клавіатура з підсвіткою (червоні свічі)',
    category: 'electronics',
    price: 1200,
    daysAgo: 1,
  },
  {
    id: 5,
    title: 'Налаштування домашнього Wi-Fi роутера та домашньої мережі',
    category: 'services',
    price: 250,
    daysAgo: 9,
  },
  {
    id: 6,
    title: 'Стратегічна настільна гра для дружньої компанії 2–5 осіб',
    category: 'other',
    price: 450,
    daysAgo: 10,
  },
  {
    id: 7,
    title: 'Лазерний принтер HP LaserJet 1010 на запчастини або відновлення',
    category: 'electronics',
    price: 600,
    daysAgo: 18,
  },
  {
    id: 8,
    title: 'Репетиторство з англійської мови для школярів і студентів',
    category: 'services',
    price: 350,
    daysAgo: 21,
  },
  {
    id: 9,
    title: "Дитяче дерев'яне ліжечко з ортопедичним матрацом",
    category: 'other',
    price: 800,
    daysAgo: 30,
  },
];

// Допоміжний об'єкт для людиночитабельного виведення назв категорій
const categoryNames = {
  electronics: 'Електроніка',
  services: 'Послуги',
  other: 'Інше',
};

/**
 * Крок 5 та 6: Обробка масиву циклом for...of із фільтрацією за категорією
 * та умовною класифікацією оголошень (позначення днів > 14 як «застаріле»)
 *
 * @param {Array} adsList - Масив об'єктів оголошень
 * @param {string} targetCategory - Категорія для фільтрації ('electronics', 'services', 'other' або 'all')
 */
function printAdsByCategory(adsList, targetCategory) {
  const catTitle = categoryNames[targetCategory] || targetCategory;
  console.log(`\n--- Оголошення категорії: "${catTitle}" ---`);

  let count = 0;
  let outdatedCount = 0;

  for (const ad of adsList) {
    // Фільтрація: перевіряємо відповідність категорії
    if (targetCategory === 'all' || ad.category === targetCategory) {
      count++;

      // Крок 6: Умовна класифікація (daysAgo > 14 -> «застаріле», інакше «актуальне»)
      let statusLabel = '';
      if (ad.daysAgo > 14) {
        statusLabel = 'застаріле';
        outdatedCount++;
      } else {
        statusLabel = 'актуальне';
      }

      // Використання стрілкової функції shorten для компактного виведення
      const shortTitle = shorten(ad.title, 35);
      const priceText = ad.price === 0 ? 'Безкоштовно' : `${ad.price} грн`;

      console.log(
        `[#${ad.id}] "${shortTitle}" | Ціна: ${priceText} | Опубліковано: ${ad.daysAgo} дн. тому -> [Статус: ${statusLabel}]`
      );
    }
  }

  // Підсумковий висновок по категорії
  console.log(
    `Підсумок для "${catTitle}": знайдено ${count} оголошень (актуальних: ${count - outdatedCount}, застарілих: ${outdatedCount}).`
  );
}

/**
 * Функція для розрахунку загальної статистики дошки оголошень
 * Обчислює загальну кількість, кількість за категоріями та кількість застарілих оголошень
 *
 * @param {Array} adsList - Масив оголошень
 */
function printBoardStatistics(adsList) {
  console.log('\n=== Загальна статистика дошки оголошень ===');

  let totalAds = adsList.length;
  let outdatedTotal = 0;
  let activeTotal = 0;
  let totalPrice = 0;

  for (let i = 0; i < adsList.length; i++) {
    const ad = adsList[i];
    totalPrice += ad.price;

    // Класифікація через потрійний (тернарний) оператор
    const isOutdated = ad.daysAgo > 14;
    if (isOutdated) {
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

// Демонстрація роботи програми в консолі браузера:
// 1. Тестування стрілкової функції shorten (Крок 7)
console.log('\n--- Тестування стрілкової функції shorten() ---');
console.log('Оригінал (49 симв.):', '24-дюймовий IPS-монітор Full HD у відмінному стані');
console.log('shorten(title, 25):', shorten('24-дюймовий IPS-монітор Full HD у відмінному стані', 25));
console.log('shorten(title, 15):', shorten('Ремонт комп’ютерів', 15));

// 2. Виведення оголошень за окремими категоріями (Крок 5, 6)
printAdsByCategory(ads, 'electronics');
printAdsByCategory(ads, 'services');
printAdsByCategory(ads, 'other');

// 3. Загальна підсумкова статистика
printBoardStatistics(ads);
