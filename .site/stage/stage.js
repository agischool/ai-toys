/* 互动版运行时：一次手势一拍的分镜阅读器。
 * 经典脚本，无依赖，双击 file:// 也能运行。
 * 不依赖浏览器的滚动：滚轮、触摸、键盘各自折算成「前进一拍 / 后退一拍」，画面固定不动，
 * 所以触控板惯性、鼠标滚轮、手指轻划在各浏览器里表现一致。
 * 纯函数在 Node 下经 module.exports 暴露，供单元测试。 */
(function () {
  'use strict';

  /* ---------------- 纯函数 ---------------- */

  /* 自动播放时每拍停留的秒数：按字数估读，已含 0.7s 的镜头移动。 */
  function dwell(chars) {
    return Math.min(12, Math.max(2.4, 1.4 + 0.14 * chars));
  }

  /* 把世界坐标里的矩形 rect=[x,y,w,h] 等比放进 area={x,y,w,h} 并居中。 */
  function fitCamera(rect, area) {
    var s = Math.min(area.w / rect[2], area.h / rect[3]);
    return {
      s: s,
      x: area.x + (area.w - rect[2] * s) / 2 - rect[0] * s,
      y: area.y + (area.h - rect[3] * s) / 2 - rect[1] * s
    };
  }

  /* 元素在第 i 拍是否可见：at 起、until 前。 */
  function visibleAt(at, until, i) {
    return i >= at && (until == null || i < until);
  }

  /* 元素名 name 是否被聚焦列表点名：全等，或以 "<项>." 开头。 */
  function focusHit(focus, name) {
    for (var k = 0; k < focus.length; k++) {
      if (name === focus[k] || name.indexOf(focus[k] + '.') === 0) return true;
    }
    return false;
  }

  /* '#b12' → 第 12 拍（下标 11）；无效返回 -1。 */
  function parseBeatHash(hash, total) {
    var m = /^#b(\d+)$/.exec(hash || '');
    if (!m) return -1;
    var n = Number(m[1]);
    return n >= 1 && n <= total ? n - 1 : -1;
  }
  function formatBeatHash(i) { return '#b' + (i + 1); }

  /* 滚轮手势限流：一次手势只前进一拍。feed(dy, t) 返回 +1 / -1 / 0；t 是毫秒时间戳，由调用方传入，
   * 所以测试可以喂合成的事件序列。
   * 触控板松手后还会有一两秒的惯性事件：翻页后锁住，直到事件流停顿 quiet 毫秒才解锁。
   * 锁定期间有两种情况视为读者又发起了一次手势：
   *   1) 锁定 minLock 毫秒后，增量突然比最近的平均值大得多（在惯性上又甩了一下）；
   *   2) 锁定 restart 毫秒后，增量仍不小于本次手势峰值的 restartRatio（一直在匀速滚动的鼠标滚轮）。 */
  function createWheelGate(options) {
    var o = { threshold: 18, quiet: 130, minLock: 350, reaccel: 1.7, restart: 900, restartRatio: 0.7 };
    for (var key in options) o[key] = options[key];
    var sum = 0, locked = false, lastT = -1e9, lockedAt = 0, avg = 0, peak = 0;
    return {
      feed: function (dy, t) {
        var a = Math.abs(dy);
        if (!a) return 0;
        if (t - lastT > o.quiet) { locked = false; sum = 0; avg = 0; peak = 0; }
        lastT = t;
        var prev = avg;
        avg = prev ? prev * 0.6 + a * 0.4 : a;
        if (locked) {
          peak = Math.max(peak, a);
          var since = t - lockedAt;
          var surge = since > o.minLock && a > prev * o.reaccel + 8;
          var steady = since > o.restart && a >= peak * o.restartRatio && a >= 20;
          if (!surge && !steady) return 0;
          locked = false; sum = 0;
        }
        sum += dy;
        if (Math.abs(sum) < o.threshold) return 0;
        var dir = sum > 0 ? 1 : -1;
        sum = 0; locked = true; lockedAt = t; peak = a;
        return dir;
      }
    };
  }

  /* 触摸滑动：手指上滑为前进。慢拖需要 48px，快速一划 24px 即可；斜着划不算。 */
  function swipeStep(dx, dy, ms) {
    var ay = Math.abs(dy), ax = Math.abs(dx);
    if (ay < ax * 1.2) return 0;
    if (ay >= 48 || (ay >= 24 && ms < 220)) return dy < 0 ? 1 : -1;
    return 0;
  }

  /* 画面区：为顶栏和字幕卡留出位置。capH 是字幕卡实际占的高度（含它离底边的距离），
   * 由页面量出，所以短句子给画面留更多地方；静默拍（封面）没有字幕卡，只留底栏。 */
  function artArea(w, h, capH) {
    var portrait = w / h < 0.85;
    var top = portrait ? 56 : 64;
    var bottom = capH ? capH + 14 : 64;
    return { x: 0, y: top, w: w, h: Math.max(120, h - top - bottom), portrait: portrait };
  }

  var api = {
    dwell: dwell, fitCamera: fitCamera, visibleAt: visibleAt, focusHit: focusHit,
    parseBeatHash: parseBeatHash, formatBeatHash: formatBeatHash,
    createWheelGate: createWheelGate, swipeStep: swipeStep, artArea: artArea
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  /* ---------------- 页面 ---------------- */

  var dataEl = document.getElementById('stage-data');
  if (!dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var beats = data.beats;
  var total = beats.length;
  var root = document.documentElement;
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  var stage = $('#stage');
  var capText = $('#cap');
  var capCard = $('#capcard');
  var count = $('#count');
  var hint = $('#hint');
  var secNum = $('#sec-num');
  var secName = $('#sec-name');
  var secPill = $('#sec');
  var bar = $('#bar');
  var btnPrev = $('#btn-prev');
  var btnNext = $('#btn-next');
  var btnPlay = $('#btn-play');
  var btnToc = $('#btn-toc');
  var toc = $('#toc');
  var readEl = $('#read');

  var cur = -1;
  var playing = false;
  var timer = 0;
  var lastScene = null;
  var urlTimer = 0;
  var flipState = {};

  /* 每个场景自己编步号（0 起）；每一拍在分镜里声明自己对应哪一步。 */
  var scenes = {};
  $$('.scene').forEach(function (svg) {
    var timed = $$('[data-at]', svg);
    timed.forEach(function (el) {
      el._at = Number(el.getAttribute('data-at'));
      var un = el.getAttribute('data-until');
      el._until = un == null ? null : Number(un);
    });
    scenes[svg.getAttribute('data-scene')] = { el: svg, cam: $('.cam', svg), timed: timed };
  });

  function mode() { return root.getAttribute('data-mode'); }

  /* ---- 渲染：状态只由（场景、步号、镜头）决定，所以跳转和逐拍走得到同样的画面 ---- */

  function setOn(sc, step) {
    for (var k = 0; k < sc.timed.length; k++) {
      var on = visibleAt(sc.timed[k]._at, sc.timed[k]._until, step);
      sc.timed[k].classList.toggle('on', on);
      sc.timed[k].setAttribute('aria-hidden', String(!on));
    }
  }

  /* 聚焦：这一拍点名的元素保持原样，其余压暗（solo 时整个藏起来）。镜头放大时用，
   * 免得露出一半的邻居显得像出错。名字用 data-n。 */
  function setFocus(sc, focus, solo) {
    var has = !!(focus && focus.length);
    sc.el.classList.toggle('has-focus', has);
    sc.el.classList.toggle('solo', has && !!solo);
    for (var k = 0; k < sc.timed.length; k++) {
      var e = sc.timed[k];
      e.classList.toggle('focus', has && focusHit(focus, e.getAttribute('data-n') || ''));
    }
  }

  /* how：'instant' 直接到位；'enter' 刚切入场景，先复位再让元素依次出现；'diff' 同场景内只动变化的元素。 */
  function applyElements(i, how) {
    var b = beats[i];
    var sc = scenes[b.scene];
    if (!sc) return;
    if (how === 'instant') {
      sc.el.classList.add('snap');
      setOn(sc, b.step);
      setFocus(sc, b.focus, b.solo);
      void sc.el.getBoundingClientRect();
      sc.el.classList.remove('snap');
    } else if (how === 'enter') {
      sc.el.classList.add('snap');
      sc.timed.forEach(function (e) { e.classList.remove('on'); });
      setFocus(sc, b.focus, b.solo);
      void sc.el.getBoundingClientRect();
      sc.el.classList.remove('snap');
      setOn(sc, b.step);
    } else {
      setOn(sc, b.step);
      setFocus(sc, b.focus, b.solo);
    }
  }

  function applyCamera(i, instant) {
    var b = beats[i];
    var sc = scenes[b.scene];
    if (!sc) return;
    var cam = data.scenes[b.scene].cams[b.cam];
    var area = artArea(innerWidth, innerHeight, b.quiet ? 0 : innerHeight - capCard.getBoundingClientRect().top);
    var rect = area.portrait ? cam.p : cam.l;
    var t = fitCamera(rect, area);
    var g = sc.cam;
    if (instant) g.style.transition = 'none';
    g.style.transform = 'translate(' + t.x.toFixed(2) + 'px,' + t.y.toFixed(2) + 'px) scale(' + t.s.toFixed(4) + ')';
    if (instant) { void g.getBoundingClientRect(); g.style.transition = ''; }
  }

  function applyScene(i) {
    var id = beats[i].scene;
    if (id === lastScene) return false;
    Object.keys(scenes).forEach(function (key) {
      scenes[key].el.classList.toggle('is-active', key === id);
      scenes[key].el.setAttribute('aria-hidden', String(key !== id));
    });
    lastScene = id;
    return true;
  }

  /* 静默拍（封面）：字幕卡不显示，但文字仍写进状态区，读屏照样播报。 */
  function applyCaption(i) {
    var b = beats[i];
    capText.innerHTML = b.html || '';
    capText.setAttribute('data-kind', b.kind || 'text');
    capCard.classList.toggle('quiet', !!b.quiet);
    capText.classList.remove('in');
    void capText.offsetWidth;
    capText.classList.add('in');
  }

  function applyHud(i) {
    var b = beats[i];
    var sec = data.sections[b.section];
    secNum.textContent = sec.num ? sec.num + '/' + data.sectionCount : '';
    secName.textContent = sec.label;
    secPill.hidden = !sec.label;
    bar.style.transform = 'scaleX(' + ((i + 1) / total).toFixed(4) + ')';
    count.textContent = (i + 1) + ' / ' + total;
    btnPrev.disabled = i <= 0;
    btnNext.disabled = i >= total - 1;
  }

  function syncUrl(i) {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      if (mode() !== 'stage') return;
      try { history.replaceState(null, '', location.pathname + location.search + formatBeatHash(i)); } catch (e) { /* Safari 限频时忽略 */ }
    }, 200);
  }

  function render(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(total - 1, i));
    if (i === cur && !opts.force) return;
    stage.setAttribute('data-orient', artArea(innerWidth, innerHeight).portrait ? 'portrait' : 'landscape');
    var changed = applyScene(i);
    cur = i;
    applyCaption(i);   // 先排字幕：镜头要按字幕卡的实际高度留白
    applyElements(i, opts.instant ? 'instant' : changed ? 'enter' : 'diff');
    syncInteractions();
    applyCamera(i, opts.instant || changed);
    applyHud(i);
    syncUrl(i);
    if (i > 0 && hint) hint.hidden = true;
    schedule();
  }

  function go(i, fromAuto) {
    if (!fromAuto) stopPlay();
    render(i);
  }
  function step(dir, fromAuto) { go(cur + dir, fromAuto); }

  /* ---- 自动播放：读者一操作就停 ---- */

  function stopPlay() {
    if (!playing) return;
    playing = false;
    clearTimeout(timer);
    btnPlay.setAttribute('data-playing', 'false');
    btnPlay.textContent = '播放';
  }
  function startPlay() {
    if (cur >= total - 1) render(0);
    playing = true;
    btnPlay.setAttribute('data-playing', 'true');
    btnPlay.textContent = '暂停';
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing || document.hidden || mode() !== 'stage') return;
    timer = setTimeout(function () {
      if (cur >= total - 1) { stopPlay(); return; }
      step(1, true);
    }, dwell(beats[cur].chars || 0) * 1000);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearTimeout(timer); else schedule();
  });

  /* ---- 输入：滚轮、触摸、键盘各自折算成一拍 ---- */

  var gate = createWheelGate();
  function inDialog(t) { return !!(t && t.closest && t.closest('dialog')); }

  /* 挂在 document 上：光标停在顶栏按钮上时滚轮也要接管。 */
  document.addEventListener('wheel', function (e) {
    if (mode() !== 'stage' || e.ctrlKey || toc.open || inDialog(e.target)) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) return;   // 横向手势留给浏览器（后退/前进）
    e.preventDefault();
    if (e.deltaY) stopPlay();   // 自动播放中读者一动滚轮就接管，哪怕这一下没够翻页
    var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    var dir = gate.feed(e.deltaY * unit, e.timeStamp);
    if (dir) step(dir);
  }, { passive: false });

  var touch = null;
  document.addEventListener('touchstart', function (e) {
    if (mode() !== 'stage' || inDialog(e.target) || e.touches.length !== 1) { touch = null; return; }
    var p = e.touches[0];
    touch = { x: p.clientX, y: p.clientY, t: e.timeStamp };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (touch && e.cancelable) e.preventDefault();   // 不让页面跟着手指橡皮筋
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    if (!touch) return;
    var p = e.changedTouches[0], t0 = touch;
    touch = null;
    var dir = swipeStep(p.clientX - t0.x, p.clientY - t0.y, e.timeStamp - t0.t);
    if (dir) step(dir);
  });
  document.addEventListener('touchcancel', function () { touch = null; });

  /* 键盘：焦点在按钮或链接上时，空格和回车留给它们自己。 */
  document.addEventListener('keydown', function (e) {
    if (mode() !== 'stage' || e.ctrlKey || e.metaKey || e.altKey || toc.open) return;
    var t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    var key = e.key;
    var onControl = t && t.closest && t.closest('button,a,.hit');
    if ((key === ' ' || key === 'Enter') && onControl) return;
    var dir = 0, to = -1;
    if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'PageDown' || (key === ' ' && !e.shiftKey)) dir = 1;
    else if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'PageUp' || (key === ' ' && e.shiftKey)) dir = -1;
    else if (key === 'Home') to = 0;
    else if (key === 'End') to = total - 1;
    else return;
    e.preventDefault();
    if (e.repeat) return;
    if (to >= 0) go(to); else step(dir);
  });

  btnPrev.addEventListener('click', function () { step(-1); });
  btnNext.addEventListener('click', function () { step(1); });
  btnPlay.addEventListener('click', function () { if (playing) stopPlay(); else startPlay(); });

  /* 翻面是独立的阅读动作，不推动拍号；横竖屏共用同一张卡的状态。 */
  function syncInteractions() {
    Object.keys(scenes).forEach(function (id) {
      var sc = scenes[id];
      $$('.hit', sc.el).forEach(function (hit) {
        var host = hit.closest('.s');
        var shown = id === lastScene && host.classList.contains('on') && getComputedStyle(host).display !== 'none' &&
          !(sc.el.classList.contains('solo') && !host.classList.contains('focus'));
        hit.setAttribute('tabindex', shown ? '0' : '-1');
        var key = hit.getAttribute('data-flip');
        if (!key) return;
        var reveal = !!(beats[cur] && beats[cur].reveal);
        var stateKey = (reveal ? cur + ':' : '') + key;
        var flipped = flipState[stateKey] == null ? reveal : flipState[stateKey];
        hit.classList.toggle('is-flipped', flipped);
        hit.setAttribute('aria-pressed', String(flipped));
        hit.setAttribute('aria-label', hit.getAttribute(flipped ? 'data-back-label' : 'data-front-label'));
      });
    });
    var focused = document.activeElement;
    if (focused && focused.matches('.hit') && focused.getAttribute('tabindex') !== '0') {
      stage.setAttribute('tabindex', '-1');
      stage.focus({ preventScroll: true });
    }
  }
  function flip(hit) {
    if (!hit || hit.getAttribute('tabindex') !== '0') return;
    stopPlay();
    var key = (beats[cur].reveal ? cur + ':' : '') + hit.getAttribute('data-flip');
    flipState[key] = !hit.classList.contains('is-flipped');
    syncInteractions();
  }
  stage.addEventListener('click', function (e) {
    var hit = e.target.closest && e.target.closest('[data-flip]');
    if (hit) { e.preventDefault(); flip(hit); }
  });
  stage.addEventListener('keydown', function (e) {
    var hit = e.target.closest && e.target.closest('[data-flip]');
    if (!hit || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) flip(hit);
  });

  /* ---- 目录 ---- */

  function buildToc() {
    var list = $('#toc-list');
    list.innerHTML = '';
    data.sections.forEach(function (sec) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'toc-card';
      b.innerHTML = '<span class="toc-no"></span><span class="toc-name"></span>';
      if (sec.thumbnail) b.insertAdjacentHTML('afterbegin', sec.thumbnail);
      $('.toc-no', b).textContent = sec.num || sec.mark || '';
      $('.toc-name', b).textContent = sec.label;
      b.addEventListener('click', function () { closeToc(); go(sec.first); });
      li.appendChild(b);
      list.appendChild(li);
    });
  }
  function openToc() {
    stopPlay();
    if (toc.showModal) toc.showModal(); else toc.setAttribute('open', '');
  }
  function closeToc() {
    if (toc.close) toc.close(); else toc.removeAttribute('open');
  }
  btnToc.addEventListener('click', openToc);
  toc.addEventListener('click', function (e) { if (e.target === toc) closeToc(); });
  toc.addEventListener('close', function () { btnToc.focus(); });
  $('#toc-close').addEventListener('click', closeToc);

  /* ---- 模式：分镜 / 全文 ---- */

  /* 改查询参数：?read 与 ?stage 互斥；空值写成无等号的形式。 */
  function queryWith(changes) {
    var p = new URLSearchParams(location.search);
    Object.keys(changes).forEach(function (name) {
      if (changes[name]) p.set(name, ''); else p.delete(name);
    });
    var qs = p.toString().replace(/=(?=&|$)/g, '');
    return location.pathname + (qs ? '?' + qs : '');
  }
  var startBeat = parseBeatHash(location.hash, total);

  function setMode(next) {
    root.setAttribute('data-mode', next);
    if (next === 'read') {
      stopPlay();
      history.replaceState(null, '', queryWith({ read: true, stage: false }));
      window.scrollTo(0, 0);
      readEl.setAttribute('tabindex', '-1');
      readEl.focus({ preventScroll: true });
    } else {
      /* 系统开了「减少动态效果」时，要用 ?stage 才能留在分镜版。 */
      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      history.replaceState(null, '', queryWith({ read: false, stage: reduced }));
      render(cur < 0 ? Math.max(startBeat, 0) : cur, { force: true, instant: true });
    }
  }
  $$('[data-action="read"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); setMode('read'); });
  });
  $$('[data-action="stage"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); setMode('stage'); });
  });

  window.addEventListener('hashchange', function () {
    var i = parseBeatHash(location.hash, total);
    if (i >= 0 && mode() === 'stage') go(i);
  });
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (mode() === 'stage' && cur >= 0) render(cur, { force: true, instant: true });
    }, 80);
  });

  /* ---- 启动 ---- */

  buildToc();
  if (hint) hint.textContent = matchMedia('(pointer: coarse)').matches ? '上滑翻页' : '滚动或按 ↓ 翻页';
  var begin = function () {
    if (mode() === 'stage') render(Math.max(startBeat, 0), { force: true, instant: true });
    requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.add('ready'); }); });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin, begin); else begin();
})();
