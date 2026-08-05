(function () {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  const ctx     = canvas.getContext('2d');
  const COLOURS = ['#B89A8A','#D4AF70','#F5EFE6','#7A9E7E','#C9A98A','#E8D5C4','#8B7355'];
  const SHAPES  = ['rect', 'circle', 'ribbon'];
  let   particles = [];
  let   rafId     = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function Particle(x, y) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 3 + Math.random() * 5;
    this.x       = x;
    this.y       = y;
    this.vx      = Math.cos(angle) * speed;
    this.vy      = Math.sin(angle) * speed - 4;
    this.gravity = 0.18 + Math.random() * 0.1;
    this.drag    = 0.97;
    this.colour  = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    this.shape   = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.size    = 5 + Math.random() * 6;
    this.angle   = Math.random() * Math.PI * 2;
    this.spin    = (Math.random() - 0.5) * 0.25;
    this.alpha   = 1;
    this.decay   = 0.012 + Math.random() * 0.008;
  }

  Particle.prototype.update = function () {
    this.vx    *= this.drag;
    this.vy    *= this.drag;
    this.vy    += this.gravity;
    this.x     += this.vx;
    this.y     += this.vy;
    this.angle += this.spin;
    this.alpha -= this.decay;
  };

  Particle.prototype.draw = function () {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle   = this.colour;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'ribbon') {
      ctx.fillRect(-this.size / 2, -this.size / 5, this.size, this.size / 2.5);
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
  };

  function burst(x, y) {
    const count = 40 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y));
    }
    if (!rafId) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    burst(e.clientX, e.clientY);
  });
})();
