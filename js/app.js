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
 *
 * Практична робота №11: оголошення, додані користувачем, можна видалити.
 * Картка лише повідомляє про намір подією remove, а видалення зі сховища
 * IndexedDB виконує js/script.js.
 *
 * Практична робота №12: щойно додане оголошення з'являється з CSS-анімацією
 * (slide-down + fade-in) і позначкою «Нове», яка плавно згасає. Анімацією
 * керує лише CSS (@keyframes у css/style.css); компонент знає тільки, коли
 * прибрати позначку: за подією animationend або за таймером для користувачів
 * із вимкненою анімацією.
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
      time: { type: String, default: "" },
      // true лише для оголошень, які зберігаються в браузері користувача
      removable: { type: Boolean, default: false },
      // true лише для оголошення, щойно доданого в цій сесії (не зберігається)
      isNew: { type: Boolean, default: false }
    },

    // remove передає id оголошення батьківському компоненту; seen повідомляє,
    // що позначка «Нове» згасла і її можна прибрати зі стану
    emits: ["remove", "seen"],

    data() {
      return { expanded: false };
    },

    mounted() {
      // Без анімації (prefers-reduced-motion) подія animationend не настане,
      // тому позначка прибирається таймером; 6000 мс = тривалість new-badge-fade
      const reducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (this.isNew && reducedMotion) {
        this.seenTimer = setTimeout(() => this.$emit("seen", this.adId), 6000);
      }
    },

    beforeUnmount() {
      clearTimeout(this.seenTimer);
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
      <article
        class="card"
        :class="{ outdated: isOutdated, 'card-enter': isNew }"
        :data-days-ago="daysAgo"
      >
        <img :src="iconSrc" :alt="title" class="card-img" />
        <div class="card-content">
          <div class="card-meta">
            <span class="card-badges">
              <span class="badge" :class="'badge-' + category">{{ categoryName }}</span>
              <span
                v-if="isNew"
                class="badge-new"
                @animationend="$emit('seen', adId)"
              >Нове</span>
            </span>
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
          <button
            v-if="removable"
            type="button"
            class="btn-delete"
            :aria-label="'Видалити оголошення «' + title + '»'"
            @click="$emit('remove', adId)"
          >
            Видалити
          </button>
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

      methods: {
        // Корінь не знає про сховище: він генерує DOM-подію на контейнері,
        // а js/script.js її обробляє
        requestRemove(id) {
          listingsRoot.dispatchEvent(
            new CustomEvent("ad-remove", { detail: { id } })
          );
        },

        // Позначка «Нове» згасла: знімаємо прапорець, і Vue прибирає її з DOM
        markSeen(id) {
          const ad = this.localAds.find((item) => item.id === id);
          if (ad) ad.isNew = false;
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
          :removable="ad.local === true"
          :is-new="ad.isNew === true"
          @remove="requestRemove"
          @seen="markSeen"
        />
      `
    });

    // mount() повертає кореневий екземпляр: через нього js/script.js змінює стан
    window.BoardApp = { vm: app.mount(listingsRoot), categoryNames };
  }
})();
