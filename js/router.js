/**
 * Практична робота №13: односторінковий застосунок (SPA) і клієнтська маршрутизація
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 *
 * Обраний підхід: hash-based роутинг (location.hash + подія hashchange).
 * Адреса маршруту лежить після символу #, тому браузер не надсилає її на
 * сервер, і застосунок однаково працює з Live Server, з вкладеної теки
 * (127.0.0.1:5500/neighborhood-board/) і з GitHub Pages без fallback-налаштувань,
 * яких вимагав би History API.
 *
 * «Сторінки» - це секції розмітки index.html (#filter, #ads, #new-ad, #post-page,
 * #not-found). Роутер зберігає їх як вузли DOM і щоразу вставляє потрібні в
 * єдиний контейнер <main id="app">. Вузли не створюються заново, тому не
 * дублюється розмітка, зберігаються обробники подій з script.js, реактивний
 * стан Vue і незбережений текст у формі, а перехід між маршрутами не
 * породжує нових запитів до API чи сховища.
 *
 * Файл підключається останнім: до цього script.js уже знайшов потрібні елементи
 * у повній розмітці, а app.js створив window.BoardApp.
 */
(function () {
  const app = document.querySelector("#app");
  if (!app) return;

  const SITE_TITLE = "Дошка сусідських оголошень";

  // Стан дошки, словник категорій та компонент AdCard з js/app.js
  const board = window.BoardApp || null;

  // «Сторінки» застосунку: секції з index.html
  const pages = {
    filter: document.querySelector("#filter"),
    ads: document.querySelector("#ads"),
    newAd: document.querySelector("#new-ad"),
    post: document.querySelector("#post-page"),
    notFound: document.querySelector("#not-found")
  };

  // Функція очищення попередньої сторінки (наприклад, unmount вкладеного Vue)
  let cleanup = null;
  let isFirstRender = true;

  /* ========================================================================
     Таблиця маршрутів
     path - патерн, :name - параметр; view - функція, що показує сторінку.
     Маршрути зіставляються за сегментами, порядок запису не важливий.
     ======================================================================== */
  const routes = [
    // Стрічка всіх оголошень з фільтром
    { path: "/", view: renderHome },
    // Стрічка, відфільтрована за категорією (посилання шапки й форма фільтра)
    { path: "/category/:category", view: renderCategory },
    // Окреме оголошення за id
    { path: "/posts/:id", view: renderPost },
    // Форма нового оголошення
    { path: "/new", view: renderNew }
  ];

  /**
   * Безпечно декодує сегмент адреси: некоректна послідовність %XX кидає
   * URIError, тому її залишаємо як є
   * @param {string} part - сегмент шляху
   * @returns {string}
   */
  function safeDecode(part) {
    try {
      return decodeURIComponent(part);
    } catch (error) {
      return part;
    }
  }

  /**
   * Повертає поточний шлях маршруту з location.hash: «#/posts/21» → «/posts/21».
   * Порожній хеш означає головну сторінку.
   * @returns {string}
   */
  function getPath() {
    const path = location.hash.slice(1);
    if (path === "") return "/";
    return path.startsWith("/") ? path : `/${path}`;
  }

  /**
   * Зіставляє шлях з таблицею маршрутів, розбиваючи рядки на сегменти по «/»
   * @param {string} path - поточний шлях
   * @returns {{view: Function, params: Object}|null} null - маршруту немає (404)
   */
  function matchRoute(path) {
    const pathParts = path.split("/").filter(Boolean);

    for (const route of routes) {
      const routeParts = route.path.split("/").filter(Boolean);
      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      const isMatch = routeParts.every((part, index) => {
        if (part.startsWith(":")) {
          params[part.slice(1)] = safeDecode(pathParts[index]);
          return true;
        }
        return part === pathParts[index];
      });

      if (isMatch) return { view: route.view, params };
    }

    return null;
  }

  /* ========================================================================
     Допоміжні функції відображення
     ======================================================================== */

  /**
   * Очищує контейнер і вставляє в нього задані сторінки
   * @param {...HTMLElement} nodes - секції, які потрібно показати
   */
  function show(...nodes) {
    app.replaceChildren(...nodes.filter(Boolean));
  }

  /**
   * Оновлює заголовок вкладки: його бачить історія браузера й закладки
   * @param {string} title - назва поточної сторінки
   */
  function setTitle(title) {
    document.title = `${title} — ${SITE_TITLE}`;
  }

  /**
   * Застосовує категорію до стану Vue та до списку фільтра
   * @param {string} category - all, electronics, services або other
   */
  function setCategory(category) {
    if (board) board.vm.currentCategory = category;
    const select = pages.filter && pages.filter.querySelector("#category");
    if (select) select.value = category;
  }

  /**
   * Позначає у шапці посилання поточної категорії атрибутом aria-current
   * @param {string} path - поточний шлях
   */
  function updateNav(path) {
    document.querySelectorAll(".nav-categories a").forEach((link) => {
      if (link.getAttribute("href") === `#${path}`) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  /* ========================================================================
     View-функції: кожна показує свою сторінку та за потреби повертає
     функцію очищення, яку роутер викличе перед наступним переходом
     ======================================================================== */

  function renderHome() {
    setCategory("all");
    show(pages.filter, pages.ads);
    setTitle("Стрічка оголошень");
  }

  function renderCategory({ category }, path) {
    if (!board || !Object.hasOwn(board.categoryNames, category)) {
      return renderNotFound(path);
    }
    setCategory(category);
    show(pages.filter, pages.ads);
    setTitle(`Категорія «${board.categoryNames[category]}»`);
  }

  function renderNew() {
    show(pages.newAd);
    setTitle("Нове оголошення");

    // Після переходу за посиланням курсор одразу ставиться в перше поле
    const titleField = pages.newAd.querySelector("#ad-title");
    if (titleField && !isFirstRender) titleField.focus();
  }

  /**
   * Сторінка окремого оголошення. Картку будує той самий компонент AdCard, що й
   * стрічка (у режимі detailed), тому логіка дати, ціни та категорії не
   * дублюється. Дані беруться з реактивного стану дошки: оголошення користувача
   * прочитано з IndexedDB, оголошення API отримано за практичною роботою №9.
   */
  function renderPost({ id }, path) {
    if (!board || !window.Vue || !/^\d+$/.test(id)) return renderNotFound(path);

    const container = pages.post.querySelector("#post-details");
    const adId = Number(id);

    const PostPage = {
      components: { AdCard: board.AdCard },
      props: { adId: { type: Number, required: true } },

      computed: {
        ad() {
          return board.vm.allAds.find((item) => item.id === this.adId) || null;
        },
        // Дані ще завантажуються: відсутність оголошення поки не помилка
        ready() {
          return board.vm.dataReady;
        }
      },

      // Назва оголошення стає заголовком вкладки, щойно його знайдено
      watch: {
        ad: {
          immediate: true,
          handler(ad) {
            setTitle(ad ? ad.title : `Оголошення № ${this.adId}`);
          }
        }
      },

      template: `
        <ad-card
          v-if="ad"
          detailed
          :ad-id="ad.id"
          :title="ad.title"
          :category="ad.category"
          :description="ad.description"
          :price="ad.price"
          :days-ago="ad.daysAgo"
          :time="ad.time"
        />
        <p v-else-if="!ready" class="post-message" role="status">
          Завантаження оголошення…
        </p>
        <div v-else class="post-message" role="alert">
          <p>Оголошення № {{ adId }} не знайдено. Можливо, його видалено.</p>
          <a href="#/" class="btn-action">До стрічки оголошень</a>
        </div>
      `
    };

    const postApp = window.Vue.createApp(PostPage, { adId });
    postApp.mount(container);
    show(pages.post);

    // Вкладений застосунок Vue знищується під час виходу зі сторінки
    return () => postApp.unmount();
  }

  /**
   * Сторінка «Не знайдено» для невідомої адреси
   * @param {string} path - адреса, якої немає в таблиці маршрутів
   */
  function renderNotFound(path) {
    const text = pages.notFound.querySelector("#not-found-text");
    // textContent вставляє адресу як текст, а не як розмітку
    text.textContent = `Адреси «${path}» не існує.`;
    show(pages.notFound);
    setTitle("Сторінку не знайдено");
  }

  /* ========================================================================
     Рендер за поточною адресою
     ======================================================================== */

  function render() {
    const path = getPath();

    if (typeof cleanup === "function") {
      cleanup();
      cleanup = null;
    }

    const match = matchRoute(path);
    cleanup = match ? match.view(match.params, path) : renderNotFound(path);

    updateNav(path);

    // Після переходу сторінка починається зверху, а фокус переходить на вміст:
    // клавіатурний користувач і скрінрідер не лишаються на видаленому посиланні
    if (!isFirstRender) {
      window.scrollTo(0, 0);
      if (!app.contains(document.activeElement)) {
        app.focus({ preventScroll: true });
      }
    }
    isFirstRender = false;
  }

  // Кнопки «назад» і «вперед», зміна посилання та введення адреси вручну
  window.addEventListener("hashchange", render);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.Router = {
    routes,
    matchRoute,
    render,
    navigate(path) {
      location.hash = `#${path}`;
    }
  };
})();
