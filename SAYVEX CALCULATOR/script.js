(function () {
  var S = NX.Settings, E = NX.Engine, H = NX.History, C = NX.Converter;
  var expr = '', done = false, lastExpr = '', errMsg = '', mode = 'calc', sciOn = false;
  function $(i) { return document.getElementById(i); }
  function el(t, c, h) { var e = document.createElement(t); if (c) { e.className = c; } if (h !== undefined) { e.innerHTML = h; } return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function restart(node, cls) { node.className = node.className.replace(' ' + cls, '').replace(cls, ''); void node.offsetWidth; node.className += ' ' + cls; }

  /* ---------- Biçimlendirme ---------- */
  function fmt(x, d) {
    if (d === undefined) { d = +S.get('dec'); }
    if (!isFinite(x)) { return 'Hata'; }
    var a = Math.abs(x), s, parts, sep = S.get('sep'), ip, dp;
    if (a !== 0 && (a >= 1e15 || a < 1e-9)) { return x.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e'); }
    s = String(parseFloat(x.toFixed(d)));
    if (s.indexOf('e') >= 0) { return s; }
    parts = s.split('.'); ip = parts[0]; dp = parts[1];
    if (sep !== 'none') {
      var g = sep === 'comma' ? ',' : (sep === 'space' ? ' ' : '.');
      ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, g);
    }
    return dp ? ip + (sep === 'dot' ? ',' : '.') + dp : ip;
  }
  function repr(r) { return String(parseFloat(r.toPrecision(14))); }
  function disp(s) { return s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/sqrt/g, '√').replace(/\bpi\b/g, 'π'); }

  /* ---------- Ses ---------- */
  var wavSrc = null;
  function makeWav() {
    var n = 400, sr = 8000, i, d = '';
    function w32(v) { return String.fromCharCode(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); }
    function w16(v) { return String.fromCharCode(v & 255, (v >> 8) & 255); }
    for (i = 0; i < n; i++) { d += String.fromCharCode(128 + Math.round(60 * Math.sin(i * 2 * Math.PI * 900 / sr) * (1 - i / n))); }
    return 'data:audio/wav;base64,' + btoa('RIFF' + w32(36 + n) + 'WAVEfmt ' + w32(16) + w16(1) + w16(1) + w32(sr) + w32(sr) + w16(1) + w16(8) + 'data' + w32(n) + d);
  }
  function snd() {
    if (!S.get('sound')) { return; }
    try { if (!wavSrc) { wavSrc = makeWav(); } var a = new Audio(wavSrc); a.volume = 0.4; a.play(); } catch (e) { }
  }

  /* ---------- Hesap makinesi ---------- */
  function B(l, v, c) { return { l: l, v: v, c: c || '' }; }
  var MAIN = [
    [B('C', 'C', 'clr'), B('(', '(', 'op2'), B(')', ')', 'op2'), B('÷', '/', 'op')],
    [B('7', '7'), B('8', '8'), B('9', '9'), B('×', '*', 'op')],
    [B('4', '4'), B('5', '5'), B('6', '6'), B('−', '-', 'op')],
    [B('1', '1'), B('2', '2'), B('3', '3'), B('+', '+', 'op')],
    [B('0', '0'), B('.', '.'), B('⌫', 'BK', 'op2'), B('=', 'EQ', 'eq')]
  ];
  var FSTD = [
    [B('x²', '^2', 'fn'), B('x³', '^3', 'fn'), B('√', 'sqrt(', 'fn'), B('xʸ', '^', 'fn'), B('n!', '!', 'fn')],
    [B('1/x', '1/(', 'fn'), B('π', 'pi', 'fn'), B('e', 'e', 'fn'), B('%', '%', 'fn')]
  ];
  var FSCI = [
    [B('x²', '^2', 'fn'), B('x³', '^3', 'fn'), B('√', 'sqrt(', 'fn'), B('xʸ', '^', 'fn'), B('n!', '!', 'fn')],
    [B('sin', 'sin(', 'fn'), B('cos', 'cos(', 'fn'), B('tan', 'tan(', 'fn'), B('asin', 'asin(', 'fn'), B('acos', 'acos(', 'fn')],
    [B('atan', 'atan(', 'fn'), B('log', 'log(', 'fn'), B('ln', 'ln(', 'fn'), B('10ˣ', '10^(', 'fn'), B('eˣ', 'e^(', 'fn')],
    [B('∛', 'cbrt(', 'fn'), B('|x|', 'abs(', 'fn'), B('nCr', 'ncr(', 'fn'), B('nPr', 'npr(', 'fn'), B(',', ',', 'fn')],
    [B('DEG', 'ANG', 'fn'), B('π', 'pi', 'fn'), B('e', 'e', 'fn'), B('%', '%', 'fn'), B('1/x', '1/(', 'fn')]
  ];
  function mkBtn(b) {
    var btn = el('button', 'k ' + b.c, b.l);
    if (b.v === 'ANG') { btn.id = 'angBtn'; btn.innerHTML = E.getAngle() === 'deg' ? 'DEG' : 'RAD'; }
    btn.onclick = function () { restart(btn, 'pulse'); press(b.v); };
    return btn;
  }
  function buildKeys() {
    var k = $('keys'), rows = (sciOn ? FSCI : FSTD).concat(MAIN), i, j, r;
    k.innerHTML = '';
    for (i = 0; i < rows.length; i++) {
      r = el('div', 'row');
      for (j = 0; j < rows[i].length; j++) { r.appendChild(mkBtn(rows[i][j])); }
      k.appendChild(r);
    }
  }
  function input(v) {
    if (done) { done = false; if (!/^[+\-*\/^%!]/.test(v)) { expr = ''; } }
    errMsg = '';
    if (expr.length < 200) { expr += v; }
  }
  function press(v) {
    snd();
    if (v === 'C') { expr = ''; done = false; errMsg = ''; lastExpr = ''; }
    else if (v === 'BK') { if (done) { expr = ''; done = false; } else { expr = expr.replace(/([a-z]+\(|pi|.)$/, ''); } errMsg = ''; }
    else if (v === 'EQ') { calc(); return; }
    else if (v === 'ANG') { setAngle(E.getAngle() === 'deg' ? 'rad' : 'deg'); return; }
    else { input(v); }
    render();
  }
  function calc() {
    if (!expr || done) { return; }
    try {
      var r = E.evaluate(expr), raw = repr(r);
      H.add(expr, raw, disp(expr), fmt(r));
      lastExpr = disp(expr); expr = raw; done = true; errMsg = '';
      renderHist(); render(); if (S.get('anim')) { restart($('cur'), 'pop'); }
    } catch (x) { errMsg = x.message; render(); }
  }
  function render() {
    var cur = $('cur'), prev = $('prev'), txt, pv = '';
    txt = done ? fmt(Number(expr)) : (expr ? disp(expr) : '0');
    cur.innerHTML = esc(txt);
    cur.style.fontSize = txt.length > 22 ? '28px' : (txt.length > 16 ? '36px' : (txt.length > 11 ? '46px' : '56px'));
    prev.className = '';
    if (errMsg) { prev.className = 'bad'; pv = errMsg; }
    else if (done) { pv = lastExpr + ' ='; }
    else if (expr && /[+\-*\/^%!(]|pi|[a-z]/.test(expr.replace(/^-/, ''))) { try { pv = '= ' + fmt(E.evaluate(expr)); } catch (x) { pv = ''; } }
    prev.innerHTML = esc(pv);
  }
  function renderHist() {
    var list = $('hlist'), items = H.all(), i;
    list.innerHTML = '';
    if (!items.length) { list.appendChild(el('div', 'empty', 'Henüz hesaplama yok.')); return; }
    for (i = 0; i < items.length; i++) { list.appendChild(histItem(items[i])); }
  }
  function histItem(it) {
    var d = el('div', 'hi'), e = el('div', 'he', esc(it.de) + ' ='), r = el('div', 'hr', esc(it.dr));
    e.title = 'İşlemi tekrar kullan'; r.title = 'Sonucu kullan';
    e.onclick = function () { expr = it.e; done = false; errMsg = ''; setMode(mode === 'sci' ? 'sci' : 'calc'); render(); };
    r.onclick = function () { expr = it.r; done = false; errMsg = ''; setMode(mode === 'sci' ? 'sci' : 'calc'); render(); };
    d.appendChild(e); d.appendChild(r);
    return d;
  }

  /* ---------- Ayarlar ---------- */
  function setAngle(a) {
    E.setAngle(a); S.set('angle', a);
    $('angInd').innerHTML = a === 'deg' ? 'DEG' : 'RAD';
    if ($('angBtn')) { $('angBtn').innerHTML = a === 'deg' ? 'DEG' : 'RAD'; }
    $('s-angle').value = a; render();
  }
  function applyTheme() {
    document.body.className = 'th-' + S.get('theme') + (S.get('anim') ? '' : ' noanim');
  }
  function initSettings() {
    $('s-theme').value = S.get('theme'); $('s-sound').checked = !!S.get('sound'); $('s-anim').checked = !!S.get('anim');
    $('s-dec').value = String(S.get('dec')); $('s-angle').value = S.get('angle'); $('s-sep').value = S.get('sep');
    $('s-info').innerHTML = 'Ayarların kaydedildiği yer: ' + esc(S.where());
    $('s-theme').onchange = function () { S.set('theme', this.value); applyTheme(); };
    $('s-sound').onclick = function () { S.set('sound', this.checked); };
    $('s-anim').onclick = function () { S.set('anim', this.checked); applyTheme(); };
    $('s-dec').onchange = function () { S.set('dec', +this.value); render(); renderHist(); doConv(); };
    $('s-angle').onchange = function () { setAngle(this.value); };
    $('s-sep').onchange = function () { S.set('sep', this.value); render(); doConv(); };
    E.setAngle(S.get('angle')); $('angInd').innerHTML = S.get('angle') === 'deg' ? 'DEG' : 'RAD';
    applyTheme();
  }

  /* ---------- Dönüştürücü ---------- */
  function fillSel(sel, arr, selIdx) {
    var i; sel.innerHTML = '';
    for (i = 0; i < arr.length; i++) { var o = document.createElement('option'); o.value = arr[i]; o.text = arr[i]; sel.appendChild(o); }
    sel.selectedIndex = selIdx;
  }
  function fillUnits() {
    var u = C.units($('c-cat').value);
    fillSel($('c-from'), u, 0); fillSel($('c-to'), u, Math.min(1, u.length - 1));
    doConv();
  }
  function doConv() {
    var v = parseFloat($('c-val').value.replace(',', '.')), out = $('c-res'), r;
    if (isNaN(v)) { out.innerHTML = '—'; return; }
    r = C.convert($('c-cat').value, $('c-from').value, $('c-to').value, v);
    out.innerHTML = esc(fmt(r, Math.max(6, +S.get('dec')))) + ' <span class="sub">' + esc($('c-to').value) + '</span>';
  }
  function initConv() {
    fillSel($('c-cat'), C.names(), 0); fillUnits();
    $('c-cat').onchange = fillUnits; $('c-from').onchange = doConv; $('c-to').onchange = doConv;
    $('c-val').onkeyup = doConv; $('c-val').oninput = doConv;
    $('c-swap').onclick = function () { var a = $('c-from').selectedIndex; $('c-from').selectedIndex = $('c-to').selectedIndex; $('c-to').selectedIndex = a; doConv(); };
  }

  /* ---------- İstatistik ---------- */
  function card(l, v) { return '<div class="sc"><small>' + l + '</small><b>' + esc(v) + '</b></div>'; }
  function doStats() {
    var txt = $('st-in').value.replace(/^\s+|\s+$/g, ''), out = $('st-out'), sepRe, parts, nums = [], i, t, n, sum = 0, mean, sq = 0, freq = {}, maxF = 0, modes = [], med, k;
    if (!txt) { out.innerHTML = '<p class="sub">Lütfen sayı girin.</p>'; return; }
    sepRe = /[\s;]+/.test(txt) ? /[\s;]+/ : /,/;
    parts = txt.split(sepRe);
    for (i = 0; i < parts.length; i++) {
      t = parts[i].replace(',', '.');
      if (t === '') { continue; }
      n = Number(t);
      if (isNaN(n)) { out.innerHTML = '<p class="sub" style="color:#fb7185">Geçersiz değer: ' + esc(parts[i]) + '</p>'; return; }
      nums.push(n);
    }
    if (!nums.length) { out.innerHTML = '<p class="sub">Lütfen sayı girin.</p>'; return; }
    var sorted = nums.slice().sort(function (a, b) { return a - b; }), len = nums.length;
    for (i = 0; i < len; i++) { sum += nums[i]; freq[nums[i]] = (freq[nums[i]] || 0) + 1; }
    mean = sum / len;
    for (i = 0; i < len; i++) { sq += (nums[i] - mean) * (nums[i] - mean); }
    med = len % 2 ? sorted[(len - 1) / 2] : (sorted[len / 2 - 1] + sorted[len / 2]) / 2;
    for (k in freq) { if (freq[k] > maxF) { maxF = freq[k]; } }
    if (maxF > 1) { for (k in freq) { if (freq[k] === maxF) { modes.push(fmt(Number(k), 6)); } } }
    var f = function (x) { return fmt(x, Math.max(6, +S.get('dec'))); };
    out.innerHTML = card('Adet', String(len)) + card('Toplam', f(sum)) + card('Ortalama', f(mean)) + card('Medyan', f(med)) +
      card('Mod', modes.length ? modes.join(', ') : 'Yok') + card('En büyük', f(sorted[len - 1])) + card('En küçük', f(sorted[0])) +
      card('Std. sapma (popülasyon)', f(Math.sqrt(sq / len))) + (len > 1 ? card('Std. sapma (örnek)', f(Math.sqrt(sq / (len - 1)))) : '');
  }

  /* ---------- Gezinme ---------- */
  var NAV = [['calc', 'Standart'], ['sci', 'Bilimsel'], ['conv', 'Dönüştürücü'], ['stat', 'İstatistik'], ['set', 'Ayarlar']];
  function setMode(m) {
    var v = (m === 'sci') ? 'calc' : m, i, views = ['calc', 'conv', 'stat', 'set'], node, btns;
    var wasCalc = (mode === 'calc' || mode === 'sci');
    mode = m;
    if (m === 'calc' || m === 'sci') { sciOn = (m === 'sci'); buildKeys(); }
    for (i = 0; i < views.length; i++) { $('v-' + views[i]).className = 'view' + (views[i] === v ? ' on' : ''); }
    node = $('v-' + v);
    if (S.get('anim') && !(wasCalc && v === 'calc' && arguments.length > 1)) { restart(node, 'in'); }
    btns = $('nav').getElementsByTagName('button');
    for (i = 0; i < btns.length; i++) { btns[i].className = (btns[i].getAttribute('data-m') === m) ? 'on' : ''; }
    for (i = 0; i < NAV.length; i++) { if (NAV[i][0] === m) { $('modeName').innerHTML = NAV[i][1]; } }
    render();
  }
  function buildNav() {
    var i;
    for (i = 0; i < NAV.length; i++) { (function (m) {
      var b = el('button', '', m[1]); b.setAttribute('data-m', m[0]);
      b.onclick = function () { snd(); setMode(m[0]); };
      $('nav').appendChild(b);
    })(NAV[i]); }
  }

  /* ---------- Klavye ---------- */
  document.onkeydown = function (ev) {
    ev = ev || window.event;
    var tg = (ev.target || ev.srcElement), k = ev.key, tn = tg && tg.tagName ? tg.tagName.toLowerCase() : '';
    if (mode !== 'calc' && mode !== 'sci') { return; }
    if (tn === 'input' || tn === 'textarea' || tn === 'select') { return; }
    if (!k) { return; }
    var handled = true;
    if (/^[0-9.+\-*\/()^!%]$/.test(k)) { press(k); }
    else if (k === ',' && mode === 'sci') { press(','); }
    else if (k === 'Enter' || k === '=') { press('EQ'); }
    else if (k === 'Backspace') { press('BK'); }
    else if (k === 'Escape' || k === 'Esc') { press('C'); }
    else { handled = false; }
    if (handled) { if (ev.preventDefault) { ev.preventDefault(); } else { ev.returnValue = false; } }
  };

  /* ---------- Başlangıç ---------- */
  function init() {
    try { var w = 1040, h = 800; window.resizeTo(w, h); window.moveTo(Math.max(0, (screen.availWidth - w) / 2), Math.max(0, (screen.availHeight - h) / 2)); } catch (e) { }
    S.load(); initSettings(); initConv(); buildNav();
    $('hclr').onclick = function () { H.clear(); renderHist(); };
    $('st-go').onclick = doStats;
    renderHist(); setMode('calc');
  }
  init();
})();
