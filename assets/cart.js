class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        CartPerformance.measure(`${eventTarget}:paint-updated-sections"`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        CartPerformance.measureFromEvent(`${eventTarget}:user-action`, event);

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
              .then(() => CartPerformance.measureFromEvent('note-update:user-action', event));
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

const CART_EVENTS = [
  {
    event: 'cartUpdate',
    eventType: 'PUB_SUB_EVENTS',
    handler: debounce(syncWindowCart, 200),
  },
  {
    event: 'cartError',
    eventType: 'PUB_SUB_EVENTS',
    handler: debounce(syncWindowCart, 200),
  }
];

CART_EVENTS.forEach(({ event, eventType, handler }) => {
  if (eventType === 'PUB_SUB_EVENTS' && typeof PUB_SUB_EVENTS?.[event] !== 'undefined') {
    subscribe(PUB_SUB_EVENTS[event], handler);
  }

  if (eventType === 'DOM_EVENT') {
    window.addEventListener(event, handler);
  }
});

function syncWindowCart(event) {
  fetch('/cart.js')
    .then((res) => res.json())
    .then((data) => {
      window.cart = data;
      if (event?.source !== 'freebie-cart-sync') {
        publish(PUB_SUB_EVENTS.windowCartUpdated, {
          source: 'window-cart-sync',
          cartData: data
        });
      }
    })
    .catch((err) => console.error('Failed to fetch /cart.js', err));
}

class FreebieCartAutoSync extends HTMLElement {
  constructor() {
    super();
    this.thresholdFreebieEnabled = window.freebieRulesEnabled === true;
    this.cartFreebies = window.cartValueFreebies || [];
    this.productUnlock = window.productUnlockFreebie || null;
    this.processing = false;
  }

  connectedCallback() {
    if (!this.thresholdFreebieEnabled) return;
    this.cartItems = document.querySelector('cart-items') || document.querySelector('cart-drawer-items');
    this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, this.handleCartSync.bind(this));
  }

  async handleCartSync() {
    if (this.processing) return;
    this.processing = true;

    try {
      const cart = await fetch('/cart.js').then(res => res.json());
      window.cart = cart;

      const changes = this.calculateFreebieChanges(cart);

      if (changes.toAdd.length > 0 || changes.toRemove.length > 0) {
        await this.applyChanges(changes);
        await this.refreshCart();
      }
    } catch (error) {
      console.error('[FreebieCartAutoSync] Error:', error);
    }

    this.processing = false;
  }

  calculateFreebieChanges(cart) {
    const cartTotal = cart.total_price / 100;
    const items = cart.items || [];
    const freebieItems = items.filter(item => item.properties?.['Freebie product'] === true);

    const toAdd = [];
    const toRemove = [];

    this.cartFreebies.forEach(rule => {
      const hasFreebieInCart = freebieItems.some(item => item.variant_id === rule.variantId);

      if (cartTotal >= rule.threshold && !hasFreebieInCart && rule.inStock) {
        toAdd.push(rule.variantId);
      } else if (cartTotal < rule.threshold && hasFreebieInCart) {
        const freebieItem = freebieItems.find(item => item.variant_id === rule.variantId);
        toRemove.push(freebieItem.key);
      }
    });


    if (this.productUnlock) {
      const { triggerProductId, freebieVariantId, inStock } = this.productUnlock;
      const hasTriggerProduct = items.some(item => item.product_id === triggerProductId);
      const hasUnlockFreebie = freebieItems.some(item => item.variant_id === freebieVariantId);

      if (!hasUnlockFreebie && inStock && hasTriggerProduct) {
        toAdd.push(freebieVariantId);
      } else if (hasUnlockFreebie && !hasTriggerProduct) {
        const freebieItem = freebieItems.find(item => item.variant_id === freebieVariantId);
        if (freebieItem) toRemove.push(freebieItem.key);
      }
    }


    return { toAdd, toRemove };
  }

  async applyChanges(changes) {
    const operations = [];

    if (changes.toRemove.length > 0) {
      const updates = {};
      changes.toRemove.forEach(key => updates[key] = 0);

      operations.push(
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        })
      );
    }

    if (changes.toAdd.length > 0) {
      const items = changes.toAdd.map(variantId => ({
        id: variantId,
        quantity: 1,
        properties: { 'Freebie product': true }
      }));

      operations.push(
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        })
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }

  async refreshCart() {
    if (!this.cartItems) return;

    try {
      this.sectionsToRender = this.cartItems.getSectionsToRender().map(section => section.section).join(',');

      const [cartData, sectionsResponse] = await Promise.all([
        fetch('/cart.js').then(res => res.json()),
        fetch(`${routes.cart_url}?sections=${this.sectionsToRender}`).then(res => res.json())
      ]);

      window.cart = cartData;

      const isEmpty = cartData.item_count === 0;
      this.cartItems.classList.toggle('is-empty', isEmpty);

      const cartFooter = document.getElementById('main-cart-footer');
      const cartDrawer = document.querySelector('cart-drawer');
      if (cartFooter) cartFooter.classList.toggle('is-empty', isEmpty);
      if (cartDrawer) cartDrawer.classList.toggle('is-empty', isEmpty);

      this.cartItems.getSectionsToRender().forEach(section => {
        const element = document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
        if (element && sectionsResponse[section.section]) {
          element.innerHTML = this.cartItems.getSectionInnerHTML(sectionsResponse[section.section], section.selector);
        }
      });

    } catch (error) {
      console.error('[FreebieCartAutoSync] Refresh error:', error);
    }
  }

  disconnectedCallback() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

customElements.define('freebie-cart-auto-sync', FreebieCartAutoSync);
