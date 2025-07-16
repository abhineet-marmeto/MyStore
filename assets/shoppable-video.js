class ModalButton extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.handleClick);
  }

  handleClick = () => {
    const targetId = this.dataset.target;
    const modal = document.getElementById(targetId);
    modal?.toggle();
  }
}
customElements.define('modal-button', ModalButton);

class ModalContent extends HTMLElement {
  connectedCallback() {
    this.overlay = this.querySelector('modal-overlay');
    this.closeBtn = this.querySelector('modal-close');

    this.overlay?.addEventListener('click', this.close);
    this.closeBtn?.addEventListener('click', this.close);
  }

  toggle = () => {
    this.classList.toggle('active');
    document.body.classList.toggle('overflow-hidden');
  }

  close = () => {
    this.classList.remove('active');
    document.body.classList.remove('overflow-hidden');
  }
}
customElements.define('modal-content', ModalContent);


if (!customElements.get("carousel-component")) {
  class CarouselComponent extends HTMLElement {
    constructor() {
      super();
      this.carouselElement = this;
      this.carouselOptions = JSON.parse(this.dataset.carouselOptions || '{}');

      this.swiperContainer = this.querySelector('.swiper');
      this.swiperWrapper = this.querySelector('.swiper-wrapper');

      if (!this.swiperContainer || !this.swiperWrapper) return;

      const isMobile = window.innerWidth <= 750;
      if (
        (isMobile && this.carouselOptions.destroyOnMobile) ||
        (!isMobile && this.carouselOptions.destroyOnDesktop)
      ) return;

      this.initSwiper();
    }

    initSwiper() {
      const paddingMobile = {
        left: this.carouselOptions.mobilePaddingLeft || '0%',
        right: this.carouselOptions.mobilePaddingRight || '0%',
      };

      const paddingDesktop = {
        left: this.carouselOptions.desktopPaddingLeft || '0%',
        right: this.carouselOptions.desktopPaddingRight || '0%',
      };

      const options = {
        slidesPerView: this.carouselOptions.effect === 'coverflow' ? 'auto' : (parseInt(this.carouselOptions.mobilePerPage) || 1),
        spaceBetween: this.convertToNumber(this.carouselOptions.gapMobile, 0),
        direction: this.carouselOptions.direction || 'horizontal',
        loop: this.carouselOptions.type === 'loop',
        speed: parseInt(this.carouselOptions.speed) || 1000,
        nested: this.carouselOptions.nested || false,

        slidesOffsetBefore: this.convertToNumber(this.carouselOptions.mobileSlidesOffsetBefore, 0),
        slidesOffsetAfter: this.convertToNumber(this.carouselOptions.mobileSlidesOffsetAfter, 0),

        autoplay: this.carouselOptions.autoplay
          ? {
            delay: parseInt(this.carouselOptions.autoplaySpeed) || 3000,
            disableOnInteraction: false,
          }
          : false,
        pagination: this.carouselOptions.showDotsOnMobile
          ? {
            el: this.querySelector('.swiper-pagination'),
            clickable: true,
          }
          : false,
        navigation: this.carouselOptions.showArrowsOnMobile
          ? {
            nextEl: this.querySelector('.swiper-button-next'),
            prevEl: this.querySelector('.swiper-button-prev'),
          }
          : false,
        allowTouchMove: !this.carouselOptions.disableDrag,
        centeredSlides: this.carouselOptions.focus === 'center' || this.carouselOptions.effect === 'coverflow',
        grabCursor: this.carouselOptions.grabCursor !== false,

        effect: this.carouselOptions.effect || 'slide',

        coverflowEffect: this.carouselOptions.effect === 'coverflow' ? {
          rotate: parseInt(this.carouselOptions.coverflowRotate) || 0,
          stretch: parseInt(this.carouselOptions.coverflowStretch) || 80,
          depth: parseInt(this.carouselOptions.coverflowDepth) || 200,
          modifier: parseFloat(this.carouselOptions.coverflowModifier) || 1,
          slideShadows: this.carouselOptions.coverflowSlideShadows !== false,
        } : undefined,

        fadeEffect: this.carouselOptions.effect === 'fade' ? {
          crossFade: this.carouselOptions.fadeCrossFade !== false,
        } : undefined,

        cubeEffect: this.carouselOptions.effect === 'cube' ? {
          slideShadows: this.carouselOptions.cubeSlideShadows !== false,
          shadow: this.carouselOptions.cubeShadow !== false,
          shadowOffset: parseInt(this.carouselOptions.cubeShadowOffset) || 20,
          shadowScale: parseFloat(this.carouselOptions.cubeShadowScale) || 0.94,
        } : undefined,

        flipEffect: this.carouselOptions.effect === 'flip' ? {
          slideShadows: this.carouselOptions.flipSlideShadows !== false,
          limitRotation: this.carouselOptions.flipLimitRotation !== false,
        } : undefined,

        cardsEffect: this.carouselOptions.effect === 'cards' ? {
          slideShadows: this.carouselOptions.cardsSlideShadows !== false,
          perSlideOffset: parseInt(this.carouselOptions.cardsPerSlideOffset) || 8,
          perSlideRotate: parseInt(this.carouselOptions.cardsPerSlideRotate) || 2,
        } : undefined,

        creativeEffect: this.carouselOptions.effect === 'creative' ? {
          prev: this.carouselOptions.creativePrev ? JSON.parse(this.carouselOptions.creativePrev) : {
            shadow: true,
            translate: [0, 0, -400],
          },
          next: this.carouselOptions.creativeNext ? JSON.parse(this.carouselOptions.creativeNext) : {
            translate: ['100%', 0, 0],
          },
        } : undefined,

        padding: {
          left: paddingMobile.left,
          right: paddingMobile.right,
        },

        breakpoints: {
          750: {
            slidesPerView: this.carouselOptions.effect === 'coverflow' ? 'auto' : (parseInt(this.carouselOptions.desktopPerPage) || 1),
            spaceBetween: this.convertToNumber(this.carouselOptions.gap, 0),

           
            slidesOffsetBefore: this.convertToNumber(this.carouselOptions.desktopSlidesOffsetBefore || this.carouselOptions.slidesOffsetBefore, 0),
            slidesOffsetAfter: this.convertToNumber(this.carouselOptions.desktopSlidesOffsetAfter || this.carouselOptions.slidesOffsetAfter, 0),

            pagination: this.carouselOptions.showDots
              ? {
                el: this.querySelector('.swiper-pagination'),
                clickable: true,
              }
              : false,
            navigation: this.carouselOptions.showArrows
              ? {
                nextEl: this.querySelector('.swiper-button-next'),
                prevEl: this.querySelector('.swiper-button-prev'),
              }
              : false,
            padding: {
              left: paddingDesktop.left,
              right: paddingDesktop.right,
            },
          },
        },

        on: {
          init: () => {
            setTimeout(() => {
              this.swiperContainer.classList.remove('is-loading');
            }, 200);
            if (this.carouselOptions.enableProgressBar) this.initProgressBar();
            if (this.carouselOptions.enableScrollBar) this.initCustomScrollbar();
          },
          slideChange: () => {
            if (this.carouselOptions.enableProgressBar) this.updateProgressBar();
            if (this.carouselOptions.enableScrollBar) this.updateCustomScrollbar();
          },
        },
      };

      this.swiper = new Swiper(this.swiperContainer, options);
    }

    convertToNumber(val, fallback = 0) {
      if (typeof val === 'string' && val.endsWith('rem')) {
        return parseFloat(val) * 16;
      } else if (typeof val === 'string' && val.endsWith('px')) {
        return parseFloat(val);
      } else if (!isNaN(val)) {
        return parseFloat(val);
      }
      return fallback;
    }

    initProgressBar() {
      this.progressBar = this.querySelector('swiper-progress-bar');
      if (!this.progressBar || !this.swiper) return;
      this.updateProgressBar();
    }

    updateProgressBar() {
      if (!this.progressBar || !this.swiper) return;
      const total = this.swiper.slides.length - this.swiper.loopedSlides * 2;
      const progress = ((this.swiper.realIndex + 1) / total) * 100;
      this.progressBar.style.width = `${progress}%`;
    }

    initCustomScrollbar() {
      this.scrollbar = this.querySelector('custom-scroll-bar');
      this.thumb = this.querySelector('.custom-scrollbar-thumb');
      this.updateCustomScrollbar();
    }

    updateCustomScrollbar() {
      if (!this.scrollbar || !this.thumb || !this.swiper) return;

      const progress = this.swiper.progress;
      const thumbMaxTranslate = this.scrollbar.clientWidth - this.thumb.clientWidth;
      const thumbPosition = progress * thumbMaxTranslate;
      this.thumb.style.transform = `translateX(${thumbPosition}px)`;
    }
  }

  customElements.define('carousel-component', CarouselComponent);
}

if (!customElements.get("custom-video")) {
  class CustomVideo extends HTMLElement {
    constructor() {
      super();
      this.video = null;
      this.pauseType = this.dataset.intersectionPauseType || 'in-view';
      this.observer = null;
      this.slideObserver = null;
      this.isInView = false;
      this.isActiveSlide = false;
      this.dataset.videoState = 'paused';
    }

    connectedCallback() {
      this.video = this.querySelector('video');

      if (!this.video) {
        console.warn('No video element found in custom-video');
        return;
      }

      this.video.addEventListener('play', () => {
        this.dataset.videoState = 'playing';
      });

      this.video.addEventListener('pause', () => {
        this.dataset.videoState = 'paused';
      });

      if (this.pauseType === 'active-slide') {
        this.initActiveSlideObserver();
      } else if (this.pauseType === 'in-view') {
        this.initInViewObserver();
      }
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this.slideObserver) {
        this.slideObserver.disconnect();
      }
    }

    initInViewObserver() {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.isInView = entry.isIntersecting;
          this.handleVideoPlayback();
        });
      }, options);

      this.observer.observe(this);
    }

    initActiveSlideObserver() {
      const slide = this.closest('.swiper-slide');
      if (!slide) {
        console.warn('custom-video with active-slide type must be inside a swiper-slide');
        return;
      }

      const slideOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
      };

      this.slideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const isSlideVisible = entry.isIntersecting;
          const isActiveSlide = entry.target.classList.contains('swiper-slide-active');
          this.isActiveSlide = isSlideVisible && isActiveSlide;
          this.handleVideoPlayback();
        });
      }, slideOptions);

      this.slideObserver.observe(slide);

      this.listenForSwiperEvents(slide);
    }

    listenForSwiperEvents(slide) {
      const swiperContainer = slide.closest('.swiper');
      if (!swiperContainer) return;

      const checkSwiperEvents = () => {
        const carousel = swiperContainer.closest('carousel-component');
        if (carousel && carousel.swiper) {
          const swiper = carousel.swiper;

          swiper.on('slideChange', () => {
            setTimeout(() => {
              this.checkActiveSlide(slide);
            }, 100);
          });

          swiper.on('transitionEnd', () => {
            this.checkActiveSlide(slide);
          });

          this.checkActiveSlide(slide);
        }
      };

      if (swiperContainer.swiper) {
        checkSwiperEvents();
      } else {
        setTimeout(checkSwiperEvents, 500);
      }
    }

    checkActiveSlide(slide) {
      const isActive = slide.classList.contains('swiper-slide-active');
      const isVisible = this.isElementInViewport(slide);

      this.isActiveSlide = isActive && isVisible;
      this.handleVideoPlayback();
    }

    isElementInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }

    handleVideoPlayback() {
      if (!this.video) return;
    
      let shouldPlay = false;
    
      if (this.pauseType === 'active-slide') {
        shouldPlay = this.isActiveSlide;
      } else if (this.pauseType === 'in-view') {
        shouldPlay = this.isInView;
      }
    
      if (shouldPlay && this.dataset.videoState !== 'playing') {
        this.playVideo();
      } else if (!shouldPlay && this.dataset.videoState !== 'paused') {
        clearTimeout(this.pauseTimeout);
        this.pauseTimeout = setTimeout(() => {
          if (!shouldPlay && this.dataset.videoState !== 'paused') {
            this.pauseVideo();
          }
        }, 150);
      }
    }

    playVideo() {
      if (!this.video || this.dataset.videoState === 'playing') return;
      this.dataset.videoState = 'playing';
      try {
        const playPromise = this.video.play();
        if (playPromise instanceof Promise) {
          playPromise.catch(() => {});
        }
      } catch {}
    }
    
    pauseVideo() {
      if (!this.video || this.dataset.videoState === 'paused') return;
      this.dataset.videoState = 'paused';
      this.video.pause();
    }

    play() {
      this.playVideo();
    }

    pause() {
      this.pauseVideo();
    }

    setPauseType(type) {
      if (type !== this.pauseType) {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        if (this.slideObserver) {
          this.slideObserver.disconnect();
          this.slideObserver = null;
        }

        this.pauseType = type;
        this.dataset.intersectionPauseType = type;

        if (type === 'active-slide') {
          this.initActiveSlideObserver();
        } else if (type === 'in-view') {
          this.initInViewObserver();
        }
      }
    }
  }

  customElements.define('custom-video', CustomVideo);
}

document.addEventListener('DOMContentLoaded', function () {
  const openers = document.querySelectorAll('product-drawer-opener');
  openers.forEach(opener => {
    opener.addEventListener('click', function (e) {
      e.preventDefault();

      const drawerId = opener.getAttribute('data-drawer-id');
      const productUrl = opener.getAttribute('data-product-url');
      if (!drawerId || !productUrl) return;

      const drawer = document.getElementById(drawerId);
      if (!drawer) return;

      const infoDrawer = drawer.querySelector('product-info-drawer');
      if (!infoDrawer) return;

      infoDrawer.open(productUrl);
    });
  });
});

if (!customElements.get('product-info-drawer')) {
  customElements.define(
    'product-info-drawer',
    class ProductInfoDrawer extends HTMLElement {
      constructor() {
        super();
        this.drawerContent = this.querySelector('.product-info-drawer-container');
        this.closeBtn = this.querySelector('.product-drawer-close-btn');
        if (this.closeBtn) {
          this.closeBtn.addEventListener('click', () => this.close());
        }
      }

      open(productUrl) {
        this.classList.add('open');
        this.drawerContent.innerHTML = '<div class="drawer-loading">Loading...</div>';
        fetch(productUrl)
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const productElement = responseHTML.querySelector('product-info');
            productElement?.querySelector("product-info > div").classList.contains("page-width") && productElement?.querySelector("product-info > div").classList.remove("page-width");
            if (productElement) {
              this.preprocessHTML(productElement);
              this.drawerContent.innerHTML = productElement.outerHTML;
            } else {
              this.drawerContent.innerHTML = '<div class="drawer-error">Product info not found.</div>';
            }
            this.parentElement.setAttribute('data-open', 'true');
          })
          .catch(() => {
            this.drawerContent.innerHTML = '<div class="drawer-error">Failed to load product info.</div>';
          });
      }

      close() {
        this.parentElement.setAttribute('data-open', 'false');
        this.classList.remove('open');
      }

      preprocessHTML(productElement) {
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        this.removeGalleryListSemantic(productElement);
        this.updateImageSizes(productElement);
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;
        if (!sectionId) return;
        const oldId = sectionId;
        const newId = `drawer-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(oldId, newId);
        Array.from(productElement.attributes).forEach((attribute) => {
          if (attribute.value.includes(oldId)) {
            productElement.setAttribute(attribute.name, attribute.value.replace(oldId, newId));
          }
        });
        productElement.dataset.originalSection = sectionId;
      }

      removeDOMElements(productElement) {
        const pickupAvailability = productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();
        const productModal = productElement.querySelector('product-modal');
        if (productModal) productModal.remove();
        const modalDialog = productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;
        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        const product = productElement.querySelector('.product');
        const desktopColumns = product?.classList.contains('product--columns');
        if (!desktopColumns) return;
        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;
        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';
        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }
        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }
    }
  );
}