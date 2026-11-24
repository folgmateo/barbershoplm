/* BarberShopLM — animaciones, navegación y formulario */
(() => {
  "use strict";

  // CAMBIA ESTE NÚMERO por el WhatsApp real de la barbería (código de país, sin "+" ni espacios)
  const WHATSAPP_NUMBER = "50200000000";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  // Estado compartido con la escena 3D (js/scene.js)
  window.BSLM = { heroProgress: 0, reduced, mouseX: 0, mouseY: 0 };

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- navegación ---------- */
  const nav = document.getElementById("nav");
  const toggle = nav.querySelector(".nav__toggle");
  const menu = document.getElementById("menu");

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Cerrar menú" : "Abrir menú";
    menu.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) menu.querySelector("a").focus();
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a") && menu.classList.contains("is-open")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  const onScrollNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- formulario ---------- */
  setupForm();

  if (!hasGsap || reduced) {
    // Sin animaciones: el contenido ya es visible por defecto. Solo el ratón para la escena.
    trackMouse();
    return;
  }

  /* ---------- GSAP + Lenis ---------- */
  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    // anclas con scroll suave
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === "#inicio" ? 0 : -70, duration: 1.4 });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  trackMouse();

  /* split de letras conservando elementos internos (p. ej. <em>) */
  const splitChars = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach((ch) => {
            const s = document.createElement("span");
            s.className = "char";
            s.setAttribute("aria-hidden", "true");
            s.textContent = ch;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return el.querySelectorAll(".char");
  };

  /* ---------- intro del hero ---------- */
  const chars = [];
  document.querySelectorAll("[data-split]").forEach((el) => chars.push(...splitChars(el)));

  const markPaths = document.querySelectorAll(".hero__mark .draw");
  markPaths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });

  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .to(markPaths, { strokeDashoffset: 0, duration: 1.6, stagger: 0.15, ease: "power2.inOut" })
    .from(chars, { yPercent: 115, rotate: 8, duration: 1.2, stagger: 0.04 }, 0.35)
    .from(".hero__lede", { y: 30, autoAlpha: 0, duration: 1 }, 0.9)
    .from(".hero__cta .btn", { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 1.05)
    .from(".nav__brand, .nav__toggle, .nav__menu > a", { y: -30, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.6)
    .from(".hero__scroll", { autoAlpha: 0, duration: 1 }, 1.4);

  // Hero fijado (breve): giro de 360° + explosión del poste (js/scene.js)
  const ORBIT_LENGTH = window.innerWidth < 860 ? "+=110%" : "+=130%";
  const orbitTl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: ORBIT_LENGTH,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate: (self) => { window.BSLM.heroProgress = self.progress; },
    },
    defaults: { ease: "none" },
  });
  orbitTl
    .fromTo(".hero__content", { y: 0, autoAlpha: 1 }, { y: -80, autoAlpha: 0, duration: 0.14, immediateRender: false }, 0)
    .fromTo(".hero__scroll", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.05, immediateRender: false }, 0);
  orbitTl.set({}, {}, 1); // la línea de tiempo dura exactamente 1 (= progreso del scroll)

  // barra de progreso
  gsap.to(".progress span", {
    scaleX: 1, ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });

  /* ---------- marquee con velocidad del scroll ---------- */
  const marquee = gsap.to(".marquee__track", { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
      gsap.to(marquee, { timeScale: v < 0 ? -1 + v : 1 + v, duration: 0.4, overwrite: true });
      gsap.to(marquee, { timeScale: v < 0 ? -1 : 1, duration: 1.2, delay: 0.4 });
    },
  });

  /* ---------- títulos de sección (máscara) ---------- */
  document.querySelectorAll(".reveal-title").forEach((h) => {
    h.innerHTML = `<span class="ln"><span>${h.innerHTML}</span></span>`;
    gsap.from(h.querySelector(".ln > span"), {
      yPercent: 110, duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: h, start: "top 88%" },
    });
  });

  ScrollTrigger.batch(".reveal", {
    start: "top 90%",
    onEnter: (els) => gsap.from(els, { y: 40, autoAlpha: 0, duration: 1, stagger: 0.12, ease: "power3.out" }),
    once: true,
  });

  /* ---------- servicios ---------- */
  gsap.from(".services .card", {
    y: 80, rotateX: -18, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: "expo.out",
    transformOrigin: "50% 100%",
    clearProps: "transform",
    scrollTrigger: { trigger: ".services__grid", start: "top 82%" },
  });
  gsap.from(".card__icon", {
    scale: 0.4, rotate: -45, duration: 1, stagger: 0.12, ease: "back.out(2)", delay: 0.3,
    scrollTrigger: { trigger: ".services__grid", start: "top 82%" },
  });

  if (finePointer) {
    document.querySelectorAll(".tilt").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
        card.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
        card.style.setProperty("--gx", `${px * 100}%`);
        card.style.setProperty("--gy", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- galería: máscaras + parallax ---------- */
  document.querySelectorAll(".shot").forEach((shot, i) => {
    const inner = shot.querySelector(".shot__inner");
    const img = shot.querySelector("img");
    const dir = ["inset(100% 0 0 0)", "inset(0 100% 0 0)", "inset(0 0 100% 0)"][i % 3];
    const tl = gsap.timeline({ scrollTrigger: { trigger: shot, start: "top 88%" } });
    tl.fromTo(inner, { clipPath: dir }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" })
      .from(img, { scale: 1.4, duration: 1.8, ease: "expo.out" }, 0.2)
      .from(shot.querySelector("figcaption"), { y: 14, autoAlpha: 0, duration: 0.8 }, 0.9);
    gsap.fromTo(img, { yPercent: -12 }, {
      yPercent: 0, ease: "none",
      scrollTrigger: { trigger: shot, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ---------- equipo ---------- */
  gsap.from(".barber", {
    y: 90, autoAlpha: 0, duration: 1.2, stagger: 0.14, ease: "expo.out",
    scrollTrigger: { trigger: ".team__grid", start: "top 85%" },
  });
  gsap.from(".barber__photo", {
    clipPath: "inset(0 0 100% 0)", duration: 1.4, stagger: 0.14, ease: "expo.inOut",
    scrollTrigger: { trigger: ".team__grid", start: "top 85%" },
  });

  /* ---------- precios ---------- */
  gsap.from(".menu tbody tr", {
    x: -40, autoAlpha: 0, duration: 0.9, stagger: 0.07, ease: "power3.out",
    scrollTrigger: { trigger: ".menu", start: "top 82%" },
  });
  gsap.from(".menu td:last-child", {
    scale: 0.6, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: "back.out(2.5)", delay: 0.35,
    scrollTrigger: { trigger: ".menu", start: "top 82%" },
  });

  /* ---------- reservas y visita ---------- */
  gsap.from(".form .field, .form .btn", {
    y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: "power3.out",
    scrollTrigger: { trigger: ".form", start: "top 85%" },
  });
  gsap.from(".hours div", {
    x: 30, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: "power3.out",
    scrollTrigger: { trigger: ".hours", start: "top 90%" },
  });

  /* ---------- transiciones entre secciones: leve escala de entrada ---------- */
  document.querySelectorAll(".team, .booking").forEach((sec) => {
    gsap.fromTo(sec, { clipPath: "inset(6% 4% 0% 4% round 24px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "top 35%", scrub: true },
    });
  });

  /* ---------- footer ---------- */
  gsap.from(".footer__brand img", {
    rotate: -180, scale: 0.5, autoAlpha: 0, duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: ".footer", start: "top 95%" },
  });
  gsap.from(".social li", {
    y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: "back.out(2)",
    scrollTrigger: { trigger: ".footer", start: "top 95%" },
  });

  /* ---------- botones magnéticos ---------- */
  if (finePointer) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
  }

  // recalcular cuando carguen fuentes e imágenes
  window.addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ================= helpers ================= */
  function trackMouse() {
    if (!finePointer) return;
    window.addEventListener("pointermove", (e) => {
      window.BSLM.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      window.BSLM.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function setupForm() {
    const form = document.getElementById("booking-form");
    const date = form.elements.date;
    const time = form.elements.time;
    const status = document.getElementById("form-status");

    const pad = (n) => String(n).padStart(2, "0");
    const today = new Date();
    date.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    // horario: mar-vie 10:00-20:30, sáb 9:30-15:00, dom y lun cerrado
    const slotsFor = (day) => {
      if (day === 0 || day === 1) return [];
      const [start, end] = day === 6 ? [9.5, 14.5] : [10, 20];
      const out = [];
      for (let h = start; h <= end; h += 0.5) out.push(`${pad(Math.floor(h))}:${h % 1 ? "30" : "00"}`);
      return out;
    };

    const fillTimes = () => {
      time.innerHTML = '<option value="">Elige una hora</option>';
      if (!date.value) return;
      const d = new Date(`${date.value}T00:00`);
      slotsFor(d.getDay()).forEach((s) => time.add(new Option(s, s)));
    };
    date.addEventListener("change", () => { fillTimes(); validate(date); });

    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre (mínimo 2 letras)."),
      phone: (v) => (/^(502)?\d{8}$/.test(v.replace(/[\s\-+()]/g, "")) ? "" : "Escribe un teléfono de 8 dígitos, por ejemplo 5555 1234."),
      service: (v) => (v ? "" : "Elige un servicio."),
      date: (v) => {
        if (!v) return "Elige una fecha.";
        if (v < date.min) return "La fecha ya ha pasado. Elige hoy o un día posterior.";
        const day = new Date(`${v}T00:00`).getDay();
        return day === 0 || day === 1 ? "Ese día está cerrado. Abrimos de martes a sábado." : "";
      },
      time: (v) => (v ? "" : "Elige una hora."),
    };

    function validate(field) {
      const rule = rules[field.name];
      if (!rule) return true;
      const msg = rule(field.value);
      const wrap = field.closest(".field");
      wrap.classList.toggle("is-invalid", Boolean(msg));
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      wrap.querySelector(".field__error").textContent = msg;
      return !msg;
    }

    form.addEventListener("blur", (e) => { if (e.target.name in rules && e.target.value) validate(e.target); }, true);
    form.addEventListener("input", (e) => {
      if (e.target.closest(".field")?.classList.contains("is-invalid")) validate(e.target);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fields = Object.keys(rules).map((n) => form.elements[n]);
      const results = fields.map(validate);
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) {
        status.textContent = "Revisa los campos marcados.";
        firstBad.focus();
        if (hasGsap && !reduced) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
        return;
      }
      const f = form.elements;
      const [y, m, d] = f.date.value.split("-");
      const lines = [
        "Hola, quiero reservar una cita en BarberShopLM:",
        `• Nombre: ${f.name.value.trim()}`,
        `• Teléfono: ${f.phone.value.trim()}`,
        `• Servicio: ${f.service.value}`,
        `• Barbero: ${f.barber.value}`,
        `• Fecha: ${d}/${m}/${y} a las ${f.time.value}`,
      ];
      if (f.notes.value.trim()) lines.push(`• Comentarios: ${f.notes.value.trim()}`);
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
      status.textContent = "Reserva lista. Abriendo WhatsApp para enviarla…";
      window.open(url, "_blank", "noopener");
    });
  }
})();
