if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.addOnForm = document.body.querySelector('product-add-on-form');
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        let selectedAddOnItems = '';
        if (this.addOnForm) {
          let selectedAddOnInputs = this.addOnForm.querySelectorAll('input[type="checkbox"]:checked');
          if (selectedAddOnInputs.length > 0) {
            selectedAddOnItems = Array.from(selectedAddOnInputs)
              .map((input, index) => `${index + 1}. ${input.dataset.addOnHandle}`)
              .join(', ');
          }
        }

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          if (selectedAddOnItems != '') formData.append('properties[Add-on]', selectedAddOnItems);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            
            if (!response.status) this.form.dispatchEvent(new CustomEvent('product-form:submitted'));

            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}


class ProductAddOnForm extends HTMLElement {
  constructor() {
    super();
    this.mainProductForm = null;
  }

  connectedCallback() {
    const mainProductName = this.dataset.productName;
    const mainFormId = this.dataset.formId;
    if (!mainFormId) return;

    this.mainProductForm = document.getElementById(mainFormId);
    if (!this.mainProductForm) return;

    this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
    this.allAddOnInputs = this.querySelectorAll('input[type="checkbox"]');
    if (this.allAddOnInputs.length === 0) return;
    this.mainProductForm.addEventListener('product-form:submitted', (e) => this.onMainFormSubmit(e, mainProductName));
    this.allAddOnInputs.forEach((addOnInput) => addOnInput.addEventListener('change', (e) => {
      this.updateProductInfo(e);
    }));

    this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, () => {
      this.allAddOnInputs.forEach(input => {
        input.checked = false;
      });
    });
  }

  updateProductInfo(event) {
    const checkedAddOns = this.querySelectorAll('input[type="checkbox"]:checked');
    let totalAddOnPrice = 0;
    checkedAddOns.forEach(input => {
      totalAddOnPrice += parseFloat(input.dataset.addOnPrice || 0);
    });

    const productRegularPriceAllEle = document.body.querySelectorAll('[data-variant-regular-price]');
    productRegularPriceAllEle.forEach((ele) => {
      const basePrice = parseFloat(ele.dataset.variantRegularPrice || 0);
      const newPrice = ((basePrice + totalAddOnPrice) / 100).toFixed(2);

      const match = ele.textContent.match(/\d/);
      if (match) {
        const index = match.index;
        ele.textContent = ele.textContent.slice(0, index) + newPrice;
      }
    });

    const productSalePriceAllEle = document.body.querySelectorAll('[data-variant-sale-price]');
    productSalePriceAllEle.forEach((ele) => {
      const baseSalePrice = parseFloat(ele.dataset.variantSalePrice || 0);
      const newSalePrice = ((baseSalePrice + totalAddOnPrice) / 100).toFixed(2);

      const match = ele.textContent.match(/\d/);
      if (match) {
        const index = match.index;
        ele.textContent = ele.textContent.slice(0, index) + newSalePrice;
      }
    });
  }

  async onMainFormSubmit(event, mainProductName) {

    const selectedAddOnInputs = this.querySelectorAll('input[type="checkbox"]:checked');
    if (selectedAddOnInputs.length === 0) return;
    event.preventDefault();
    try {
      const addOnItems = Array.from(selectedAddOnInputs).map(input => ({
        id: input.value,
        quantity: 1,
        properties: {
          'Main product': mainProductName,
          '_private-attribute': "checking single _ private attribute",
          '__private-attribute': "checking double __ private attribute",
        }
      }));

      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: addOnItems })
      });

      selectedAddOnInputs.forEach(input => {
        input.checked = false;
      });

      const sections = this.cart.getSectionsToRender().map(section => section.id).join(',');
      const res = await fetch(`/cart?sections=${sections}`);
      const cartSections = await res.json();

      if (this.cart && typeof this.cart.renderContents === 'function') {
        this.cart.renderContents({ sections: cartSections });
      }
    } catch (error) {
      console.error(error);
      alert('There was a problem adding items to the cart.');
    }
  }
}
if (!customElements.get('product-add-on-form')) {
  customElements.define('product-add-on-form', ProductAddOnForm);
}