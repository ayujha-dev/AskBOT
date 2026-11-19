/**
 * BackgroundEffects: Reactbits-inspired dynamic ambient aurora & particle canvas.
 * Delivers a rich, fluid glassmorphic background with smooth performance.
 */

export class BackgroundEffects {
  static canvas = null;
  static ctx = null;
  static animationFrameId = null;
  static particles = [];
  static orbs = [];
  static mouse = { x: -1000, y: -1000, radius: 140 };
  static isDark = true;
  static isRunning = false;

  static init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'bg-canvas';
      this.canvas.className = 'fixed inset-0 pointer-events-none z-0';
      document.body.prepend(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.handleResize();
    this.setupElements();
    this.start();
  }

  static handleResize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.setupElements();
  }

  static handleMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  }

  static setupElements() {
    const width = this.canvas ? this.canvas.width : 1000;
    const height = this.canvas ? this.canvas.height : 800;

    // 1. Radiant ambient orbs (harmonious, cohesive cool twilight spectrum)
    this.orbs = [
      {
        x: width * 0.2,
        y: height * 0.25,
        radius: Math.min(width, height) * 0.45,
        colorDark: 'rgba(99, 102, 241, 0.06)', // Soft celestial indigo
        colorLight: 'rgba(99, 102, 241, 0.12)', // Gentle mist indigo in light mode
        vx: 0.16,
        vy: 0.12,
        angle: 0
      },
      {
        x: width * 0.75,
        y: height * 0.35,
        radius: Math.min(width, height) * 0.48,
        colorDark: 'rgba(129, 140, 248, 0.05)', // Synchronized soft periwinkle
        colorLight: 'rgba(129, 140, 248, 0.11)', // Soft periwinkle in light mode
        vx: -0.14,
        vy: 0.18,
        angle: Math.PI / 2
      },
      {
        x: width * 0.5,
        y: height * 0.8,
        radius: Math.min(width, height) * 0.46,
        colorDark: 'rgba(165, 180, 252, 0.04)', // Harmonious whisper lavender
        colorLight: 'rgba(165, 180, 252, 0.09)', // Subtle atmospheric lavender in light mode
        vx: 0.12,
        vy: -0.15,
        angle: Math.PI
      }
    ];

    // 2. Subtle starlight dust particles
    const particleCount = Math.min(32, Math.floor((width * height) / 36000));
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.6 + 0.5,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        alpha: Math.random() * 0.35 + 0.1,
        alphaSpeed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
  }

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  static stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  static draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.isDark = document.documentElement.classList.contains('dark');

    ctx.clearRect(0, 0, width, height);

    // 1. Draw glowing ambient orbs
    ctx.save();
    for (const orb of this.orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;

      if (orb.x < -orb.radius) orb.vx *= -1;
      if (orb.x > width + orb.radius) orb.vx *= -1;
      if (orb.y < -orb.radius) orb.vy *= -1;
      if (orb.y > height + orb.radius) orb.vy *= -1;

      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
      const color = this.isDark ? orb.colorDark : orb.colorLight;
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw starlight dust particles with mouse repulsion
    ctx.save();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha += p.alphaSpeed;

      if (p.alpha > 0.6 || p.alpha < 0.1) {
        p.alphaSpeed *= -1;
      }

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Mouse interactivity
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.mouse.radius) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        p.x -= (dx / dist) * force * 1.5;
        p.y -= (dy / dist) * force * 1.5;
      }

      ctx.fillStyle = this.isDark
        ? `rgba(199, 210, 254, ${p.alpha * 0.35})`
        : `rgba(100, 116, 139, ${p.alpha * 0.45})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
