(() => {
        const hasGsap = window.gsap && window.ScrollTrigger;

        // =========================================
        // PRELOADER
        // =========================================
        if (hasGsap) {
            gsap.registerPlugin(ScrollTrigger);
            const preloaderTl = gsap.timeline();

            preloaderTl
              .to('.preloader-logo-container', { opacity: 1, duration: 0.8, ease: 'power3.out' }, 0)
              .fromTo('.preloader-emblem', { scale: 0.9 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0)
              .fromTo('.preloader-light',
                  { xPercent: -140, opacity: 0 },
                  { xPercent: 140, opacity: 0.85, duration: 1.3, ease: 'power2.inOut' }, 0.25)
              .to('.preloader-light', { opacity: 0, duration: 0.5, ease: 'power2.out' }, 1.35)
              .to('.preloader-line', { opacity: 1, duration: 0.8, ease: 'power3.inOut' }, 0.6)
              .to('.preloader-logo-container', { opacity: 0, y: -14, duration: 0.6, ease: 'power2.inOut' }, 1.95)
              .to('.preloader-line', { opacity: 0, duration: 0.35 }, 1.95)
              .to('.preloader', { yPercent: -100, duration: 0.9, ease: 'power3.inOut' }, 2.3)
              .from('.hero-text > *', { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 2.6);
        } else {
            document.querySelector('.preloader')?.remove();
        }

        // Header scroll
        const header = document.querySelector('header');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });

        // Mobile menu
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const closeBtn = document.querySelector('.close-menu');
        const mobileMenu = document.querySelector('.mobile-menu-overlay');
        const mobileNavLinks = mobileMenu.querySelectorAll('a');

        const closeMenu = () => {
            mobileMenu.classList.remove('active');
            mobileMenu.setAttribute('aria-hidden', 'true');
            mobileMenu.inert = true;
            menuBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            menuBtn.focus();
        };

        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            mobileMenu.setAttribute('aria-hidden', 'false');
            mobileMenu.inert = false;
            menuBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            closeBtn.focus();
        });
        closeBtn.addEventListener('click', closeMenu);
        mobileNavLinks.forEach(link => link.addEventListener('click', closeMenu));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && mobileMenu.classList.contains('active')) closeMenu();
        });

        const enquiryForm = document.querySelector('.enquiry-form');
        enquiryForm.addEventListener('submit', event => {
            event.preventDefault();
            enquiryForm.querySelector('.enquiry-status').textContent =
                'This form preview does not send messages. Your enquiry has not been sent.';
        });

        // Home-page progress, reveal, and looks interactions
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const progressScenes = document.querySelectorAll('.hero, .poetry-editorial, .given-story, .pillars, .pressure, .looks, .collection, .quality, .values, .future, .ending');
        let progressFrame = 0;
        const updateProgress = () => {
            progressFrame = 0;
            progressScenes.forEach(scene => {
                const rect = scene.getBoundingClientRect();
                const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
                scene.style.setProperty('--scroll-progress', progress.toFixed(3));
            });
        };
        const scheduleProgress = () => {
            if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
        };
        window.addEventListener('scroll', scheduleProgress, { passive: true });
        window.addEventListener('resize', scheduleProgress);
        updateProgress();

        const revealItems = document.querySelectorAll('.reveal-text, .looks-item');
        if (reduceMotion.matches || !('IntersectionObserver' in window)) {
            revealItems.forEach(item => { item.dataset.revealed = 'true'; });
        } else {
            const revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.dataset.revealed = 'true';
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.12 });
            revealItems.forEach(item => revealObserver.observe(item));
        }

        const looksGrid = document.querySelector('#looks-grid');
        const looks = [...(looksGrid?.querySelectorAll('.looks-item') || [])];
        const lookCaption = document.querySelector('#look-caption');
        const lookDots = document.querySelector('#look-dots');
        let currentLook = 0;
        let lookAnimation = null;
        if (looksGrid && looks.length && lookDots && lookCaption) {
            lookDots.innerHTML = looks.map((_, index) =>
                `<button type="button" class="link-arrow" data-look-index="${index}" aria-label="Show look ${index + 1}" aria-current="${index === currentLook}">${index + 1}</button>`
            ).join('');
            const syncLook = (nextIndex, animate = true) => {
                currentLook = (nextIndex + looks.length) % looks.length;
                looks.forEach((look, index) => {
                    look.setAttribute('aria-current', String(index === currentLook));
                    look.querySelector('img')?.setAttribute('aria-current', String(index === currentLook));
                });
                const image = looks[currentLook].querySelector('img');
                lookCaption.textContent = image?.dataset.mood || 'Sample look';
                lookDots.querySelectorAll('[data-look-index]').forEach((dot, index) => {
                    dot.setAttribute('aria-current', String(index === currentLook));
                });
                if (animate && !reduceMotion.matches && image?.animate) {
                    lookAnimation?.cancel();
                    lookAnimation = image.animate(
                        [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }],
                        { duration: 360, easing: 'ease-out' }
                    );
                    const selected = currentLook;
                    lookAnimation.onfinish = () => {
                        if (selected === currentLook) image.style.clipPath = '';
                    };
                }
                looks[currentLook].scrollIntoView({
                    behavior: reduceMotion.matches ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            };
            document.querySelector('#look-previous')?.addEventListener('click', () => syncLook(currentLook - 1));
            document.querySelector('#look-next')?.addEventListener('click', () => syncLook(currentLook + 1));
            lookDots.addEventListener('click', event => {
                const dot = event.target.closest('[data-look-index]');
                if (dot) syncLook(Number(dot.dataset.lookIndex));
            });
            looksGrid.addEventListener('keydown', event => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    syncLook(currentLook - 1);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    syncLook(currentLook + 1);
                }
            });
            let swipeStart = null;
            looksGrid.addEventListener('touchstart', event => {
                swipeStart = event.changedTouches[0].clientX;
            }, { passive: true });
            looksGrid.addEventListener('touchend', event => {
                if (swipeStart === null) return;
                const distance = event.changedTouches[0].clientX - swipeStart;
                swipeStart = null;
                if (Math.abs(distance) > 40) syncLook(currentLook + (distance < 0 ? 1 : -1));
            }, { passive: true });
            syncLook(currentLook, false);
        }

        if (!hasGsap) return;

        // =========================================
        // SCROLL MOTION (respects reduced motion)
        // =========================================
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {

            // 01 — Hero unfold
            const heroTl = gsap.timeline({
                scrollTrigger: {
                    trigger: ".hero",
                    start: "top top",
                    end: "+=100%",
                    pin: true,
                    scrub: 1,
                    anticipatePin: 1,
                    onEnter: () => gsap.set(".hero-unfold", { opacity: 1 }),
                    onLeaveBack: () => gsap.set(".hero-unfold", { opacity: 0 })
                }
            });
            heroTl.to(".hero-text", { opacity: 0, y: -30, duration: 0.4 }, 0.1)
                  .to(".hero-bg", { opacity: 0, duration: 0.4 }, 0.1)
                  .fromTo(".hero-unfold",
                      { clipPath: "circle(0% at 50% 50%)" },
                      { clipPath: "circle(150% at 50% 50%)", duration: 1, ease: "power2.inOut" }, 0.1)
                  .from(".unfold-content > *", {
                      y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out"
                  }, 0.3);

            // 02 — Poetry editorial
            gsap.from('.poetry-editorial-image', {
                clipPath: 'inset(100% 0 0 0)',
                duration: 1.6,
                ease: 'power4.inOut',
                scrollTrigger: { trigger: '.poetry-editorial', start: 'top 70%' }
            });
            gsap.from('.poetry-editorial-text > *', {
                y: 40, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out',
                scrollTrigger: { trigger: '.poetry-editorial', start: 'top 70%' }
            });

            // 03 — Meaning of GIVEN
            gsap.from('.given-image img', {
                clipPath: 'inset(100% 0 0 0)',
                duration: 1.5,
                ease: 'power4.inOut',
                scrollTrigger: { trigger: '.given-story', start: 'top 75%' }
            });
            gsap.from('.reveal-text', {
                y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
                scrollTrigger: { trigger: '.given-text', start: 'top 80%' }
            });

            // 04 — Pillars
            gsap.from('.pillars-header > *', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.pillars', start: 'top 75%' }
            });
            gsap.from('.pillar-card', {
                y: 60, opacity: 0, scale: 0.96, duration: 1.1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.pillars-grid', start: 'top 82%' }
            });

            // 05 — Pressure
            gsap.from('.pressure-header > *', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.pressure', start: 'top 78%' }
            });
            gsap.from('.pressure-panel', {
                y: 40, opacity: 0, duration: 1, stagger: 0.15, ease: 'power3.out',
                scrollTrigger: { trigger: '.pressure-panels', start: 'top 85%' }
            });

            // 06 — Looks
            gsap.from('.looks-header > *', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.looks', start: 'top 75%' }
            });
            gsap.from('.looks-item', {
                y: 60, opacity: 0, scale: 0.95, duration: 1.2, stagger: 0.12, ease: 'power3.out',
                scrollTrigger: { trigger: '.looks-grid', start: 'top 82%' }
            });

            // Collection
            gsap.to('.collection-image img', {
                yPercent: 15, ease: 'none',
                scrollTrigger: { trigger: '.collection', start: 'top bottom', end: 'bottom top', scrub: true }
            });
            gsap.from('.collection-circle', {
                scale: 0.5, rotation: -15, opacity: 0, duration: 1.4, ease: 'power3.out',
                scrollTrigger: { trigger: '.collection', start: 'top 60%' }
            });
            gsap.from('.collection-text > *:not(.collection-circle)', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.collection-text', start: 'top 78%' }
            });

            // 07 — Quality
            gsap.from('.quality-image', {
                clipPath: 'inset(100% 0 0 0)',
                duration: 1.5,
                ease: 'power4.inOut',
                scrollTrigger: { trigger: '.quality', start: 'top 75%' }
            });
            gsap.from('.quality-text > *', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.quality', start: 'top 78%' }
            });

            // 08 — Values
            gsap.from('.values-header > *', {
                y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.values', start: 'top 78%' }
            });
            gsap.from('.value-item', {
                y: 30, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out',
                scrollTrigger: { trigger: '.values-grid', start: 'top 85%' }
            });

            // 09 — Future
            gsap.to('.future-bg img', {
                yPercent: 15, ease: 'none',
                scrollTrigger: { trigger: '.future', start: 'top bottom', end: 'bottom top', scrub: true }
            });
            gsap.from('.future-text > *', {
                y: 40, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out',
                scrollTrigger: { trigger: '.future', start: 'top 65%' }
            });

            // Ending
            gsap.to('.ending-bg img', {
                yPercent: 20, ease: 'none',
                scrollTrigger: { trigger: '.ending', start: 'top bottom', end: 'bottom top', scrub: true }
            });
            gsap.from('.ending-text > *', {
                y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
                scrollTrigger: { trigger: '.ending', start: 'top 60%' }
            });

            // Footer
            gsap.from('.footer-emblem', {
                scale: 0.88, opacity: 0, duration: 1.4, ease: 'power3.out',
                scrollTrigger: { trigger: 'footer', start: 'top 85%' }
            });
            gsap.from('.footer-display', {
                y: 30, opacity: 0, duration: 1.1, ease: 'power3.out',
                scrollTrigger: { trigger: 'footer', start: 'top 82%' }
            });
            gsap.from('.footer-tagline', {
                y: 22, opacity: 0, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: 'footer', start: 'top 80%' }
            });
            gsap.from('.footer-divider', {
                scaleX: 0, duration: 1.2, ease: 'power3.inOut',
                scrollTrigger: { trigger: 'footer', start: 'top 78%' }
            });
            gsap.from('.footer-nav a, .footer-copyright, .back-to-top', {
                y: 14, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'power3.out',
                scrollTrigger: { trigger: 'footer', start: 'top 75%' }
            });
        });
})();
