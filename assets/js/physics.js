/** PortfolioPhysics: a small rigid-body and spring kit for decorative motion.
 *  Plain ES2018, no dependencies, no inline code; exposed as
 *  window.PortfolioPhysics (and module.exports, so it can be tested in Node).
 *
 *  The model (SI units; angles in radians):
 *
 *  Spring    m x'' = -k (x - x*) - c x'
 *            Presets give a natural frequency f and a damping ratio z:
 *            k = m (2 pi f)^2,  c = 2 z m (2 pi f). Optional hard limits
 *            [min, max] reflect with a restitution (0 clamps).
 *
 *  Hinge     A thin rigid plate turning about one edge: mass m, length L
 *            (edge to free edge), width w along the hinge, I = m L^2 / 3.
 *            theta = 0 lies open on the table, theta = pi lies folded over.
 *            I theta'' = - m g (L/2) cos(theta)          gravity on the centre
 *                        - kappa (theta - theta_r)        crease memory
 *                        - c theta'                       hinge friction
 *                        - c_air theta' |theta'|          air drag
 *                        + tau_hand                       a push, until released
 *            c_air = rho Cd w L^4 / 8 (quadratic drag integrated along the plate).
 *            The crease is elasto-plastic: once the fold passes the elastic
 *            range delta, its rest angle follows, theta_r = max(theta_r,
 *            theta - delta), so a pressed crease springs back by delta at most.
 *            Limit stops at [min, max] reflect with restitution e.
 *
 *  Loop      requestAnimationFrame drives a fixed step (1/240 s,
 *            semi-implicit Euler); renders interpolate between the last two
 *            steps. Long frames are clamped, the loop stops by itself once
 *            every body rests, pauses while the tab is hidden, and with
 *            reduced motion (read again on every start) it runs the
 *            simulation to rest at once and paints only the end state.
 *            An owner with its own frame loop creates the world with
 *            { clock: "external" } and calls world.advance(timestamp).
 *            Choreography (world.at / world.when) runs in simulated time, so
 *            the animated and the instant run end in the same state.
 *
 *  Testing   Set window.PortfolioPhysicsDebug = { record: true, worlds: [] }
 *            before this file loads: every world then logs each step's
 *            body states in world.samples; world.stats counts frames and
 *            the longest script time spent in one frame (scriptMax, ms).
 *            debug.hold = t freezes every run at t simulated seconds (exact
 *            stills); set it to null to let the run finish.
 *
 *  Light     Lambert shading from a face normal, and a contact shadow whose
 *            reach, softness and strength follow the height above the
 *            surface that receives it.
 */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (root) root.PortfolioPhysics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : null, function (root) {
  "use strict";

  var STEP = 1 / 240;
  var MAX_FRAME = 1 / 15;
  var GRAVITY = 9.81;
  var AIR_DENSITY = 1.2;
  var PLATE_DRAG = 1.17;
  var doc = root && root.document;
  var now = root && root.performance && root.performance.now ? function () { return root.performance.now(); } : Date.now;

  /* Presets: natural frequency (Hz) and damping ratio. Overshoot of a step
     is exp(-z pi / sqrt(1 - z^2)): paper ~6%, glass ~1%, settle none. */
  var PRESETS = {
    paper: { frequency: 3.1, damping: 0.66 },
    glass: { frequency: 2.1, damping: 0.82 },
    settle: { frequency: 2.6, damping: 1 }
  };

  function preset(name) {
    if (name && typeof name === "object") return name;
    return PRESETS[name] || PRESETS.settle;
  }
  function pick(value, fallback) { return value === undefined || value === null ? fallback : value; }

  /* ---- Spring --------------------------------------------------------- */
  /* Optional limits [min, max] are hard stops: the value never passes them,
     and a spring that hits one rebounds with `restitution` (0 clamps). */
  function Spring(options) {
    options = options || {};
    var base = preset(options.preset);
    var omega = 2 * Math.PI * pick(options.frequency, base.frequency);
    var limits = options.limits || [-Infinity, Infinity];
    this.name = options.name || "spring";
    this.mass = pick(options.mass, 1);
    this.stiffness = pick(options.stiffness, this.mass * omega * omega);
    this.damping = pick(options.dampingCoefficient, 2 * pick(options.damping, base.damping) * this.mass * omega);
    this.min = limits[0];
    this.max = limits[1];
    this.restitution = pick(options.restitution, 0);
    this.value = Math.min(this.max, Math.max(this.min, pick(options.from, 0)));
    this.velocity = pick(options.velocity, 0);
    this.target = pick(options.to, this.value);
    this.precision = pick(options.precision, 0.001);
    this.restVelocity = pick(options.restVelocity, this.precision * 4);
    this.previous = this.value;
    this.impacts = [];
    this.resting = this.value === this.target && this.velocity === 0;
  }
  Spring.prototype.integrate = function (dt, time) {
    this.previous = this.value;
    if (this.resting) return;
    var force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += force / this.mass * dt;
    this.value += this.velocity * dt;
    var bound = this.value > this.max ? this.max : this.value < this.min ? this.min : null;
    if (bound !== null) {
      this.value = bound;
      if ((bound === this.max) === (this.velocity > 0)) {
        // Resting contact: an approach slower than three steps of the force
        // pressing it there stops dead instead of chattering on the stop.
        var contact = Math.max(this.restVelocity * 4, Math.abs(force / this.mass) * dt * 3);
        if (Math.abs(this.velocity) > contact) this.impacts.push({ time: time, speed: this.velocity });
        this.velocity = Math.abs(this.velocity) > contact ? -this.restitution * this.velocity : 0;
      }
    }
    var still = Math.abs(this.velocity) < this.restVelocity;
    // Pressed against a stop by a target beyond it, or close to the target.
    var pressed = bound !== null && (bound === this.max ? this.target >= this.max : this.target <= this.min);
    if (still && (pressed || Math.abs(this.value - this.target) < this.precision)) {
      this.value = pressed ? bound : this.target;
      this.velocity = 0;
      this.resting = true;
    }
  };
  Spring.prototype.set = function (target, velocity) {
    this.target = target;
    if (typeof velocity === "number") this.velocity = velocity;
    this.resting = this.value === Math.min(this.max, Math.max(this.min, this.target)) && this.velocity === 0;
    return this;
  };
  Spring.prototype.snap = function () {
    this.value = this.previous = Math.min(this.max, Math.max(this.min, this.target));
    this.velocity = 0;
    this.resting = true;
    return this;
  };
  Spring.prototype.at = function (alpha) { return this.previous + (this.value - this.previous) * alpha; };
  Spring.prototype.sample = function () { return [this.value, this.velocity]; };

  /* ---- Hinge: a thin plate turning about an edge ------------------------ */
  function Hinge(options) {
    options = options || {};
    var limits = options.limits || [0, Math.PI];
    var crease = options.crease || {};
    this.name = options.name || "hinge";
    this.mass = pick(options.mass, 0.0025);
    this.length = pick(options.length, 0.1);
    this.width = pick(options.width, 0.2);
    this.gravity = pick(options.gravity, GRAVITY);
    this.inertia = pick(options.inertia, this.mass * this.length * this.length / 3);
    this.weight = this.mass * this.gravity * this.length / 2;     // the largest gravity torque, N m
    this.creaseStiffness = pick(crease.stiffness, 0);              // kappa, N m / rad
    this.creaseRest = pick(crease.rest, 0);                        // theta_r
    this.elastic = pick(crease.elastic, Infinity);                 // delta
    this.friction = pick(options.friction, 0);                     // c, N m s
    this.air = pick(options.air, AIR_DENSITY * PLATE_DRAG * this.width * Math.pow(this.length, 4) / 8);
    this.min = limits[0];
    this.max = limits[1];
    this.restitution = pick(options.restitution, 0.3);
    this.angle = pick(options.angle, this.min);
    this.velocity = pick(options.velocity, 0);
    this.previous = this.angle;
    this.drive = null;
    this.impacts = [];
    this.peak = this.angle;
    // Rest: nearly still (restSpeed, rad/s) and within `precision` radians of
    // equilibrium, estimated from the free torque and its local stiffness;
    // where there is no restoring stiffness, the free acceleration must be
    // below restAcceleration (rad/s^2). Contacts slower than settleSpeed stop
    // on the stop instead of chattering.
    this.precision = pick(options.precision, 0.002);
    this.restSpeed = pick(options.restSpeed, 0.03);
    this.restAcceleration = pick(options.restAcceleration, 0.6);
    this.settleSpeed = pick(options.settleSpeed, 0.35);
    this.resting = this.velocity === 0;
  }
  Hinge.prototype.torque = function (angle, velocity, withHand) {
    var torque = -this.weight * Math.cos(angle) -
      this.creaseStiffness * (angle - this.creaseRest) -
      this.friction * velocity -
      this.air * velocity * Math.abs(velocity);
    if (withHand && this.drive) torque += this.drive.torque;
    return torque;
  };
  /* A hand pushes with a steady torque until the plate passes `until`. */
  Hinge.prototype.push = function (torque, until) {
    this.drive = { torque: torque, until: until };
    this.resting = false;
    return this;
  };
  Hinge.prototype.integrate = function (dt, time) {
    this.previous = this.angle;
    if (this.resting) return;
    var acceleration = this.torque(this.angle, this.velocity, true) / this.inertia;
    this.velocity += acceleration * dt;
    this.angle += this.velocity * dt;
    if (this.drive && (this.drive.torque > 0 ? this.angle >= this.drive.until : this.angle <= this.drive.until)) this.drive = null;
    // The crease yields past its elastic range and remembers the new angle.
    if (this.angle - this.creaseRest > this.elastic) this.creaseRest = this.angle - this.elastic;
    if (this.angle > this.peak) this.peak = this.angle;
    if (this.angle > this.max || this.angle < this.min) {
      var bound = this.angle > this.max ? this.max : this.min;
      this.angle = bound;
      if ((bound === this.max) === (this.velocity > 0)) {
        // Resting contact, as for springs: slower than settleSpeed or than
        // three steps of the acceleration pressing it there, it stops dead.
        var contact = Math.max(this.settleSpeed, Math.abs(acceleration) * dt * 3);
        if (Math.abs(this.velocity) > contact) this.impacts.push({ time: time, speed: this.velocity });
        this.velocity = Math.abs(this.velocity) > contact ? -this.restitution * this.velocity : 0;
      }
    }
    if (this.drive || Math.abs(this.velocity) > this.restSpeed) return;
    var free = this.torque(this.angle, 0, false);
    var pressed = (this.angle >= this.max && free >= 0) || (this.angle <= this.min && free <= 0);
    var eps = 1e-4;
    var stiffness = (this.torque(this.angle - eps, 0, false) - this.torque(this.angle + eps, 0, false)) / (2 * eps);
    var near = stiffness > 0 ? Math.abs(free) / stiffness < this.precision : Math.abs(free / this.inertia) < this.restAcceleration;
    if (pressed || near) {
      this.velocity = 0;
      this.resting = true;
    }
  };
  Hinge.prototype.at = function (alpha) { return this.previous + (this.angle - this.previous) * alpha; };
  Hinge.prototype.sample = function () { return [this.angle, this.velocity]; };

  /* A panel of paper: mass and drag from its size and grammage, and a crease
     whose memory is given relative to the panel's own weight torque, so the
     numbers read as "how many times its own weight the crease can hold". */
  function paper(options) {
    var grammage = pick(options.grammage, 0.12);            // kg / m^2
    var layers = pick(options.layers, 1);
    var mass = grammage * options.length * options.width * layers;
    var gravity = pick(options.gravity, GRAVITY);
    var weight = mass * gravity * options.length / 2;
    var crease = options.crease || {};
    return {
      name: options.name,
      mass: mass,
      length: options.length,
      width: options.width,
      gravity: gravity,
      crease: { stiffness: pick(crease.strength, 0) * weight, rest: pick(crease.rest, 0), elastic: pick(crease.elastic, Infinity) },
      friction: pick(options.friction, 0) * mass * options.length * options.length / 3,
      restitution: pick(options.restitution, 0.3),
      precision: options.precision,
      restAcceleration: options.restAcceleration,
      restSpeed: options.restSpeed,
      settleSpeed: options.settleSpeed,
      limits: options.limits
    };
  }

  /* ---- Light ------------------------------------------------------------ */
  function normalize(v) {
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }
  // CSS space: x right, y down, z toward the viewer. A key light above-left,
  // in front of the page, as on the site's glass and folded artwork.
  var KEY = normalize([-0.36, -0.56, 0.75]);
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  var light = {
    key: KEY,
    normalize: normalize,
    lambert: function (normal, direction) { return Math.max(0, dot(normal, direction || KEY)); },
    /* The tone of a face against the same face lying flat: its irradiance
       relative to the flat face, minus one (negative is darker). An
       ambient share (sky and bounce light, default 0.38) keeps a face
       turned from the key light from going black:
         I = a + (1 - a) max(0, n . l),   tone = I / I_flat - 1. */
    tone: function (normal, direction, ambient) {
      var l = direction || KEY;
      var a = pick(ambient, 0.38);
      var flat = a + (1 - a) * Math.max(0, l[2]);
      return (a + (1 - a) * Math.max(0, dot(normal, l))) / flat - 1;
    },
    /* Where a point at height h above a surface casts its shadow, along the
       key light: an offset in the surface plane. */
    cast: function (height, direction) {
      var l = direction || KEY;
      return [-l[0] / l[2] * height, -l[1] / l[2] * height];
    },
    /* A contact shadow: strongest where the caster nearly touches, fading and
       softening as it rises (penumbra grows with height for a light of
       finite size). `reach` is the height at which it has halved. With
       `touch`, a translucent caster lying on the surface casts none (light
       passes through it): the shadow grows in over that height first.
         opacity = strength * h / (h + touch) * reach / (reach + h) */
    contact: function (height, options) {
      options = options || {};
      var h = Math.max(0, height);
      var reach = pick(options.reach, 60);
      var touch = pick(options.touch, 0);
      var strength = pick(options.strength, 1);
      return {
        opacity: strength * (touch > 0 ? h / (h + touch) : 1) * reach / (reach + h),
        blur: pick(options.blur, 2) + h * pick(options.softness, 0.18),
        offset: light.cast(h, options.direction)
      };
    }
  };

  /* ---- 4x4 matrices, column-major as CSS matrix3d() takes them ---------- */
  var mat = {
    identity: function () { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    multiply: function (a, b) {
      var out = new Array(16);
      for (var c = 0; c < 4; c += 1) {
        for (var r = 0; r < 4; r += 1) {
          out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
        }
      }
      return out;
    },
    chain: function () {
      var out = arguments[0];
      for (var i = 1; i < arguments.length; i += 1) out = mat.multiply(out, arguments[i]);
      return out;
    },
    translate: function (x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x || 0, y || 0, z || 0, 1]; },
    scale: function (x, y, z) { return [x, 0, 0, 0, 0, pick(y, x), 0, 0, 0, 0, pick(z, 1), 0, 0, 0, 0, 1]; },
    // CSS rotateX: positive turns the lower edge toward the viewer.
    rotateX: function (a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    // CSS rotateY: positive turns the left edge toward the viewer.
    rotateY: function (a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    // Rotation about a line through `point`, parallel to x or y.
    about: function (rotation, x, y, z) { return mat.chain(mat.translate(x, y, z), rotation, mat.translate(-x, -y, -z)); },
    apply: function (m, p) {
      var x = p[0], y = p[1], z = p[2] || 0;
      return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
    },
    direction: function (m, v) {
      return normalize([m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]]);
    },
    css: function (m) {
      var parts = new Array(16);
      for (var i = 0; i < 16; i += 1) parts[i] = Math.abs(m[i]) < 1e-9 ? 0 : Math.round(m[i] * 1e5) / 1e5;
      return "matrix3d(" + parts.join(",") + ")";
    }
  };

  /* ---- Preference ------------------------------------------------------- */
  function reducedMotion() {
    if (!root) return true;
    try {
      if (doc && doc.documentElement.classList.contains("no-motion")) return true;
      if (root.PortfolioMedia && typeof root.PortfolioMedia.isReduced === "function" && root.PortfolioMedia.isReduced()) return true;
      return Boolean(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (error) { return true; }
  }

  /* ---- World: the frame loop -------------------------------------------- */
  /* clock: "frame" (default) schedules its own requestAnimationFrame;
     "external" never does, and an owner that already runs a frame loop calls
     world.advance(timestamp) from it (it returns true while still moving).
     reduced: true or false forces the preference; left out, it is read again
     on every start(), and setReduced() changes it later. */
  function World(options) {
    options = options || {};
    var self = this;
    this.step = pick(options.step, STEP);
    this.maxFrame = pick(options.maxFrame, MAX_FRAME);
    this.limit = pick(options.limit, 8);           // simulated seconds per run, a safety net
    this.external = options.clock === "external";
    this.forcedReduced = typeof options.reduced === "boolean" ? options.reduced : null;
    this.reduced = this.forcedReduced !== null ? this.forcedReduced : reducedMotion();
    this.bodies = [];
    this.tasks = [];
    this.painters = [];
    this.waiters = [];
    this.time = 0;
    this.runStart = 0;
    this.alpha = 1;
    this.frame = 0;
    this.last = 0;
    this.accumulator = 0;
    this.running = false;
    this.destroyed = false;
    this.stats = { frames: 0, steps: 0, scriptMax: 0, scriptTotal: 0, frameGaps: [] };
    var debug = api.debug;
    this.samples = debug && debug.record ? [] : null;
    if (this.samples && debug.worlds) debug.worlds.push(this);
    this.tick = function (stamp) { self.frame = 0; if (self.advance(stamp)) self.request(); };
    this.onVisibility = function () {
      if (!doc) return;
      if (doc.hidden) { self.cancel(); return; }
      self.last = 0;          // the hidden time is not simulated
      self.request();
    };
    if (doc) doc.addEventListener("visibilitychange", this.onVisibility);
  }
  World.prototype.add = function (body) { this.bodies.push(body); return body; };
  World.prototype.spring = function (options) { return this.add(new Spring(options)); };
  World.prototype.hinge = function (options) { return this.add(new Hinge(options)); };
  World.prototype.paint = function (painter) { this.painters.push(painter); return this; };
  /* Choreography runs in simulated time, so an animated run and an instant
     run reach exactly the same end state. */
  World.prototype.at = function (time, fn) { this.tasks.push({ at: time, fn: fn }); return this; };
  World.prototype.after = function (delay, fn) { return this.at(this.time + delay, fn); };
  World.prototype.when = function (test, fn) { this.tasks.push({ when: test, fn: fn }); return this; };
  World.prototype.setReduced = function (flag) {
    this.forcedReduced = typeof flag === "boolean" ? flag : null;
    this.reduced = this.forcedReduced !== null ? this.forcedReduced : reducedMotion();
    if (this.reduced && this.running) this.settle();
    return this;
  };

  World.prototype.restingNow = function () {
    for (var i = 0; i < this.bodies.length; i += 1) if (!this.bodies[i].resting) return false;
    for (var j = 0; j < this.tasks.length; j += 1) if (this.tasks[j].at !== undefined) return false;
    return true;
  };
  World.prototype.expired = function () { return this.time - this.runStart > this.limit; };
  World.prototype.runTasks = function () {
    if (!this.tasks.length) return;
    var due = [];
    var kept = [];
    for (var i = 0; i < this.tasks.length; i += 1) {
      var task = this.tasks[i];
      if (task.at !== undefined ? this.time >= task.at - 1e-9 : task.when()) due.push(task); else kept.push(task);
    }
    if (!due.length) return;
    this.tasks = kept;
    for (var j = 0; j < due.length; j += 1) due[j].fn(this);
  };
  World.prototype.integrate = function () {
    this.runTasks();
    for (var i = 0; i < this.bodies.length; i += 1) this.bodies[i].integrate(this.step, this.time);
    this.time += this.step;
    this.stats.steps += 1;
    if (this.samples) {
      var row = [this.time];
      for (var j = 0; j < this.bodies.length; j += 1) row.push(this.bodies[j].sample());
      this.samples.push(row);
    }
  };
  World.prototype.render = function (alpha) {
    this.alpha = alpha;
    for (var i = 0; i < this.painters.length; i += 1) this.painters[i](this, alpha);
  };
  World.prototype.request = function () {
    if (this.external || this.frame || this.destroyed || !this.running || !root || (doc && doc.hidden)) return;
    this.frame = root.requestAnimationFrame(this.tick);
  };
  World.prototype.cancel = function () {
    if (this.frame && root) root.cancelAnimationFrame(this.frame);
    this.frame = 0;
  };
  /* One frame: integrate the elapsed time in fixed steps, paint the state
     interpolated between the last two steps, and stop at rest. */
  World.prototype.advance = function (stamp) {
    if (!this.running || this.destroyed) return false;
    var started = now();
    if (typeof stamp !== "number") stamp = now();
    var elapsed = this.last ? (stamp - this.last) / 1000 : this.step;
    if (this.last) this.stats.frameGaps.push(Math.round((stamp - this.last) * 10) / 10);
    this.last = stamp;
    this.accumulator += Math.min(Math.max(elapsed, 0), this.maxFrame);
    // Test hook: PortfolioPhysicsDebug.hold freezes the run at that many
    // simulated seconds, for exact stills.
    var debug = api.debug;
    var hold = debug && typeof debug.hold === "number" ? this.runStart + debug.hold - 1e-9 : Infinity;
    while (this.accumulator >= this.step && this.time < hold) {
      this.integrate();
      this.accumulator -= this.step;
    }
    var held = this.time >= hold;
    if (held) this.accumulator = 0;
    var rest = !held && (this.restingNow() || this.expired());
    this.render(rest || held ? 1 : this.accumulator / this.step);
    var spent = now() - started;
    this.stats.frames += 1;
    this.stats.scriptTotal += spent;
    if (spent > this.stats.scriptMax) this.stats.scriptMax = spent;
    if (rest) this.finish();
    return !rest;
  };
  World.prototype.finish = function () {
    this.running = false;
    this.accumulator = 0;
    this.cancel();
    var waiters = this.waiters;
    this.waiters = [];
    for (var i = 0; i < waiters.length; i += 1) waiters[i](this);
  };
  /* Run to rest synchronously and paint the end state once. */
  World.prototype.settle = function () {
    if (this.destroyed) return this;
    if (!this.running) this.runStart = this.time;
    this.running = true;
    this.cancel();
    while (!this.restingNow() && !this.expired()) this.integrate();
    this.render(1);
    this.finish();
    return this;
  };
  /* Starts (or resumes after new targets or pushes) a run. With reduced
     motion it goes straight to the end state. */
  World.prototype.start = function () {
    if (this.destroyed) return this;
    this.reduced = this.forcedReduced !== null ? this.forcedReduced : reducedMotion();
    if (this.reduced) return this.settle();
    if (this.running) { this.request(); return this; }
    this.runStart = this.time;
    this.running = true;
    this.last = 0;
    this.accumulator = 0;
    this.render(0);
    this.request();
    return this;
  };
  /* Resolves once every body rests and no timed step is pending. */
  World.prototype.rested = function () {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.running && self.restingNow()) resolve(self); else self.waiters.push(resolve);
    });
  };
  World.prototype.destroy = function () {
    this.destroyed = true;
    this.running = false;
    this.cancel();
    if (doc) doc.removeEventListener("visibilitychange", this.onVisibility);
    this.tasks = [];
    this.waiters = [];
  };

  var api = {
    version: 1,
    STEP: STEP,
    presets: PRESETS,
    Spring: Spring,
    Hinge: Hinge,
    World: World,
    createWorld: function (options) { return new World(options); },
    paper: paper,
    light: light,
    mat: mat,
    reducedMotion: reducedMotion,
    debug: root && root.PortfolioPhysicsDebug ? root.PortfolioPhysicsDebug : null
  };
  return api;
});
