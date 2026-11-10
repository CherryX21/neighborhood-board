/**
 * Практична робота №10: клієнтський фреймворк (Vue 3 через CDN, без збірки)
 * Студент: Мінаєв Артем Ігорович, група ІП-53
 * Варіант №18: Дошка сусідських оголошень (neighborhood-board)
 *
 * Обраний фреймворк: Vue 3. Компонент описується рядковим шаблоном і
 * підключається одним <script> до готової HTML-сторінки, тоді як React вимагав
 * би ще й Babel standalone для JSX.
 *
 * Список карток (#listings-list) повністю рендериться Vue: ручний
 * createElement/innerHTML з практикуму №7 для цієї ділянки видалено.
 * Форма, фільтр і запити до API лишаються в js/script.js і змінюють лише
 * реактивний стан, який повертає app.mount().
 */

// IIFE: константи компонента не потрапляють у глобальну область видимості
// і не конфліктують з оголошеннями в js/script.js
(function () {
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

  /**
   * Компонент картки оголошення AdCard.
   * Дані надходять лише через props, глобальних змінних компонент не читає.
   * Прапорець expanded локальний: клік «Показати деталі» розгортає опис
   * без участі батьківського компонента.
   */
  const AdCard = {
    props: {
      adId: { type: Number, required: true },
      title: { type: String, required: true },
      category: { type: String, required: true },
      description: { type: String, default: "" },
      // null означає «за домовленістю», 0 — «безкоштовно»
      price: { type: Number, default: null },
      daysAgo: { type: Number, default: 0 },
      time: { type: String, default: "" }
    },

    data() {
      return { expanded: false };
    },

    // Похідні значення перераховуються автоматично при зміні props
    computed: {
      categoryName() {
        return categoryNames[this.category] || this.category;
      },
      iconSrc() {
        return categoryIcons[this.category] || categoryIcons.other;
      },
      isOutdated() {
        return this.daysAgo > 14;
      },
      dateText() {
        if (this.daysAgo === 0) {
          return this.time ? `Сьогодні, ${this.time}` : "Сьогодні";
        }
        if (this.daysAgo === 1) {
          return this.time ? `Вчора, ${this.time}` : "Вчора";
        }
        return `${this.daysAgo} дн. тому`;
      },
      priceText() {
        if (this.price === null) return "Ціна: за домовленістю";
        return this.price === 0 ? "Ціна: безкоштовно" : `Ціна: ${this.price} грн.`;
      },
      detailsId() {
        return `ad-details-${this.adId}`;
      }
    },

    template: `
      <article class="card" :class="{ outdated: isOutdated }" :data-days-ago="daysAgo">
        <img :src="iconSrc" :alt="title" class="card-img" />
        <div class="card-content">
          <div class="card-meta">
            <span class="badge" :class="'badge-' + category">{{ categoryName }}</span>
            <time class="card-date">{{ dateText }}</time>
          </div>
          <h3>{{ title }}</h3>
          <p class="card-category">Категорія: {{ categoryName }}</p>
          <template v-if="description">
            <button
              type="button"
              class="btn-details"
              :aria-expanded="String(expanded)"
              :aria-controls="detailsId"
              @click="expanded = !expanded"
            >
              {{ expanded ? "Сховати деталі" : "Показати деталі" }}
            </button>
            <p class="card-description" :id="detailsId" v-show="expanded">{{ description }}</p>
          </template>
          <p class="card-price">{{ priceText }}</p>
        </div>
      </article>
    `
  };

  const listingsRoot = document.querySelector("#listings-list");

  if (listingsRoot) {
    const app = Vue.createApp({
      components: { AdCard },

      // Увесь стан дошки: оголошення з API, оголошення з форми і фільтр
      data() {
        return {
          remoteAds: [],
          localAds: [],
          currentCategory: "all",
          // Порожній результат показуємо лише після першого успішного завантаження
          hasLoadedOnce: false
        };
      },

      computed: {
        // Спочатку додані користувачем, потім отримані з API
        allAds() {
          return [...this.localAds, ...this.remoteAds];
        },
        // Фільтр за категорією і сортування від найсвіжіших до старіших;
        // при однаковому віку вище розташовується оголошення з більшим id
        visibleAds() {
          const filtered =
            this.currentCategory === "all"
              ? this.allAds
              : this.allAds.filter((ad) => ad.category === this.currentCategory);
          return [...filtered].sort(
            (a, b) => a.daysAgo - b.daysAgo || b.id - a.id
          );
        },
        showEmptyState() {
          return this.hasLoadedOnce && this.visibleAds.length === 0;
        }
      },

      template: `
        <p v-if="showEmptyState" class="empty-state">
          Оголошень за вибраною категорією немає.
        </p>
        <ad-card
          v-for="ad in visibleAds"
          :key="ad.id"
          :ad-id="ad.id"
          :title="ad.title"
          :category="ad.category"
          :description="ad.description"
          :price="ad.price"
          :days-ago="ad.daysAgo"
          :time="ad.time"
        />
      `
    });

    // mount() повертає кореневий екземпляр: через нього js/script.js змінює стан
    window.BoardApp = { vm: app.mount(listingsRoot), categoryNames };
  }
})();
