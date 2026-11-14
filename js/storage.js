/**
 * Практична робота №11: локальні сховища даних (localStorage та IndexedDB)
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 *
 * Зберігаються лише оголошення, додані користувачем через форму. Оголошення
 * з публічного API (практична робота №9) щоразу надходять із мережі, тому
 * в сховище не потрапляють.
 *
 * Запис у сховищі "posts" (keyPath "id"):
 *   { id, title, category, price, description, date }
 * де date - момент публікації у форматі ISO 8601. Поля daysAgo і time у запис
 * не входять: вони залежать від поточного часу й обчислюються під час читання.
 *
 * Файл підключається між app.js та script.js і надає глобальний об'єкт
 * window.PostStore. Код загорнуто в IIFE, щоб константи не конфліктували
 * з оголошеннями в інших скриптах.
 */
(function () {
  // Ключ localStorage зі списком оголошень (використовується на першому етапі
  // практичної роботи, у резервному режимі та як джерело для міграції)
  const LS_KEY = "neighborhoodPosts";

  // Прапорець завершеної міграції: не дає переносити дані повторно
  const LS_MIGRATED_KEY = "neighborhoodPostsMigrated";

  // Параметри бази IndexedDB
  const DB_NAME = "NeighborhoodBoardDB";
  const STORE_NAME = "posts";

  // Поточний режим сховища: "indexeddb" або "localstorage" (резервний)
  let mode = "indexeddb";

  /* ========================================================================
     localStorage: синхронний доступ, лише рядки
     ======================================================================== */

  /**
   * Записує масив оголошень у localStorage у вигляді JSON-рядка.
   * Може кинути виняток (переповнення квоти, заборонений доступ), тому
   * виклик має бути в try/catch на стороні викликача.
   * @param {Array<Object>} items - масив записів
   */
  function saveToLocalStorage(items) {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }

  /**
   * Читає масив оголошень із localStorage.
   * JSON.parse кидає виняток для пошкодженого рядка, тому розбір загорнуто
   * в try/catch: за помилки застосунок стартує з порожнього списку.
   * @returns {Array<Object>}
   */
  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Пошкоджені дані в localStorage:", error);
      return [];
    }
  }

  /* ========================================================================
     IndexedDB: асинхронний доступ через транзакції
     ======================================================================== */

  // Кеш відкритого з'єднання: база відкривається один раз, а не на кожну операцію
  let dbPromise = null;

  /**
   * Одне відкриття бази. Без параметра version браузер відкриває наявну базу
   * як є, а нової бази ще немає - створює її з версією 1 (тоді й спрацьовує
   * onupgradeneeded, де створюється об'єктне сховище).
   * @param {number} [version] - версія для явного оновлення схеми
   * @returns {Promise<IDBDatabase>}
   */
  function openWithVersion(version) {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB недоступна в цьому браузері"));
        return;
      }

      const request = version
        ? indexedDB.open(DB_NAME, version)
        : indexedDB.open(DB_NAME);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Перевірка захищає від повторного створення вже наявного сховища
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        // Якщо іншій вкладці потрібне оновлення схеми, з'єднання закривається
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => reject(request.error);

      // Інша вкладка тримає стару версію бази відкритою
      request.onblocked = () =>
        reject(new Error("Відкриття бази заблоковане іншою вкладкою"));
    });
  }

  /**
   * Відкриває базу даних і гарантує наявність сховища posts. Якщо база вже
   * існує, але сховища в ній немає (наприклад, після невдалого видалення бази
   * з DevTools), версія піднімається на одиницю, і onupgradeneeded створює його.
   * @returns {Promise<IDBDatabase>}
   */
  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = openWithVersion().then((db) => {
      if (db.objectStoreNames.contains(STORE_NAME)) return db;

      const nextVersion = db.version + 1;
      db.close();
      return openWithVersion(nextVersion);
    });

    // Невдале відкриття не кешується: наступна спроба почне все спочатку
    dbPromise.catch(() => {
      dbPromise = null;
    });

    return dbPromise;
  }

  /**
   * Виконує операцію в транзакції та чекає її завершення.
   * Проміс виконується за oncomplete (дані справді зафіксовано), а не за
   * успіхом окремого запиту.
   * @param {"readonly"|"readwrite"} txMode - режим транзакції
   * @param {(store: IDBObjectStore) => void} operation - дії зі сховищем
   * @returns {Promise<void>}
   */
  async function runTransaction(txMode, operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, txMode);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Транзакцію скасовано"));
      operation(tx.objectStore(STORE_NAME));
    });
  }

  /**
   * Додає запис або оновлює наявний з таким самим id (put замість add:
   * add кидає помилку для дубліката ключа).
   * @param {Object} item - запис оголошення
   * @returns {Promise<void>}
   */
  function addItem(item) {
    return runTransaction("readwrite", (store) => {
      store.put(item);
    });
  }

  /**
   * Оновлює запис. Через put це та сама операція, що й addItem.
   * @param {Object} item - запис оголошення з наявним id
   * @returns {Promise<void>}
   */
  function updateItem(item) {
    return addItem(item);
  }

  /**
   * Записує кілька записів в одній транзакції: або всі, або жодного
   * @param {Array<Object>} items - записи оголошень
   * @returns {Promise<void>}
   */
  function addItems(items) {
    return runTransaction("readwrite", (store) => {
      items.forEach((item) => store.put(item));
    });
  }

  /**
   * Повертає усі записи сховища
   * @returns {Promise<Array<Object>>}
   */
  async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Видаляє запис за ключем
   * @param {number} id - ідентифікатор оголошення
   * @returns {Promise<void>}
   */
  function deleteItem(id) {
    return runTransaction("readwrite", (store) => {
      store.delete(id);
    });
  }

  /**
   * Видаляє кілька записів в одній транзакції
   * @param {Array<number>} ids - ідентифікатори оголошень
   * @returns {Promise<void>}
   */
  function deleteItems(ids) {
    return runTransaction("readwrite", (store) => {
      ids.forEach((id) => store.delete(id));
    });
  }

  /* ========================================================================
     Міграція з localStorage в IndexedDB
     ======================================================================== */

  /**
   * Перевіряє, що запис придатний для IndexedDB: без цілого id метод put
   * кинув би DataError і перервав би всю транзакцію.
   * @param {any} record - запис із localStorage
   * @returns {boolean}
   */
  function isValidRecord(record) {
    return (
      record !== null &&
      typeof record === "object" &&
      Number.isInteger(record.id) &&
      typeof record.title === "string" &&
      record.title.trim() !== ""
    );
  }

  /**
   * Одноразово переносить оголошення з localStorage в IndexedDB.
   * Міграція виконується, лише якщо прапорець ще не встановлено, у
   * localStorage є валідні дані, а сховище IndexedDB порожнє. Після успішного
   * запису встановлюється прапорець і видаляється застаріла копія.
   * @returns {Promise<number>} кількість перенесених записів
   */
  async function migrateFromLocalStorage() {
    if (localStorage.getItem(LS_MIGRATED_KEY) === "true") return 0;

    const legacy = loadFromLocalStorage().filter(isValidRecord);
    if (legacy.length === 0) return 0;

    // Непорожнє сховище означає, що дані вже є: їх не перезаписуємо
    const existing = await getAllItems();
    if (existing.length > 0) return 0;

    await addItems(legacy);

    localStorage.setItem(LS_MIGRATED_KEY, "true");
    localStorage.removeItem(LS_KEY);
    return legacy.length;
  }

  /* ========================================================================
     Єдиний інтерфейс для script.js
     ======================================================================== */

  /**
   * Ініціалізація сховища: відкриття бази та міграція. Якщо IndexedDB
   * недоступна (наприклад, у деяких режимах приватного перегляду), далі
   * використовується localStorage.
   * @returns {Promise<{mode: string, migrated: number, error: Error|null}>}
   */
  async function init() {
    try {
      await openDB();
    } catch (error) {
      mode = "localstorage";
      console.warn("IndexedDB недоступна, використано localStorage:", error);
      return { mode, migrated: 0, error };
    }

    mode = "indexeddb";

    let migrated = 0;
    try {
      migrated = await migrateFromLocalStorage();
    } catch (error) {
      // База працює, тому режим не змінюється; дані в localStorage лишаються
      // недоторканими, і міграцію буде повторено під час наступного запуску
      console.error("Міграція з localStorage не вдалася:", error);
    }

    return { mode, migrated, error: null };
  }

  /**
   * Повертає всі збережені оголошення
   * @returns {Promise<Array<Object>>}
   */
  async function getAll() {
    if (mode === "indexeddb") return getAllItems();
    return loadFromLocalStorage();
  }

  /**
   * Зберігає нове (або оновлене) оголошення
   * @param {Object} record - запис оголошення
   * @returns {Promise<void>}
   */
  async function add(record) {
    if (mode === "indexeddb") return addItem(record);

    const items = loadFromLocalStorage().filter(
      (item) => item.id !== record.id
    );
    items.push(record);
    saveToLocalStorage(items);
  }

  /**
   * Видаляє оголошення за id
   * @param {number} id - ідентифікатор оголошення
   * @returns {Promise<void>}
   */
  async function remove(id) {
    return removeMany([id]);
  }

  /**
   * Видаляє кілька оголошень за списком id
   * @param {Array<number>} ids - ідентифікатори оголошень
   * @returns {Promise<void>}
   */
  async function removeMany(ids) {
    if (ids.length === 0) return;
    if (mode === "indexeddb") return deleteItems(ids);

    const items = loadFromLocalStorage().filter(
      (item) => !ids.includes(item.id)
    );
    saveToLocalStorage(items);
  }

  window.PostStore = {
    init,
    getAll,
    add,
    remove,
    removeMany,
    get mode() {
      return mode;
    },
    // Низькорівневі функції відкриті для перевірки в консолі браузера
    ls: { saveToLocalStorage, loadFromLocalStorage },
    idb: { openDB, addItem, updateItem, getAllItems, deleteItem }
  };
})();
