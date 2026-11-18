var NX = window.NX = window.NX || {};
NX.Engine = (function () {
  var angle = 'deg';
  function setAngle(a) { angle = a; }
  function toRad(x) { return angle === 'deg' ? x * Math.PI / 180 : x; }
  function fromRad(x) { return angle === 'deg' ? x * 180 / Math.PI : x; }
  function clean(x) { return Math.abs(x) < 1e-15 ? 0 : x; }
  function inRange(x, n) { if (x < -1 || x > 1) { throw new Error(n + ': tanım aralığı dışında'); } }
  function isInt(x) { return x % 1 === 0; }
  function fact(n) {
    if (n < 0 || !isInt(n) || n > 170) { throw new Error('Faktöriyel: 0-170 arası tam sayı olmalı'); }
    var r = 1, i; for (i = 2; i <= n; i++) { r *= i; } return r;
  }
  function chk(n, r) { if (n < 0 || r < 0 || !isInt(n) || !isInt(r) || r > n) { throw new Error('Kombinasyon/permütasyon: geçersiz değer'); } }
  var F = {
    sin: function (x) { return clean(Math.sin(toRad(x))); },
    cos: function (x) { return clean(Math.cos(toRad(x))); },
    tan: function (x) { return clean(Math.tan(toRad(x))); },
    asin: function (x) { inRange(x, 'asin'); return fromRad(Math.asin(x)); },
    acos: function (x) { inRange(x, 'acos'); return fromRad(Math.acos(x)); },
    atan: function (x) { return fromRad(Math.atan(x)); },
    log: function (x) { if (x <= 0) { throw new Error('log: pozitif değer gerekli'); } return Math.log(x) / Math.LN10; },
    ln: function (x) { if (x <= 0) { throw new Error('ln: pozitif değer gerekli'); } return Math.log(x); },
    sqrt: function (x) { if (x < 0) { throw new Error('Negatif sayının karekökü yok'); } return Math.sqrt(x); },
    cbrt: function (x) { return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3); },
    abs: function (x) { return Math.abs(x); },
    fact: fact,
    ncr: function (n, r) { chk(n, r); r = Math.min(r, n - r); var s = 1, i; for (i = 1; i <= r; i++) { s = s * (n - r + i) / i; } return Math.round(s); },
    npr: function (n, r) { chk(n, r); var s = 1, i; for (i = 0; i < r; i++) { s *= (n - i); } return s; }
  };
  var ARITY = { ncr: 2, npr: 2 };
  function tokenize(s) {
    var t = [], i = 0, c, m, rest;
    s = s.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-').replace(/\u03c0/g, 'pi').replace(/\u221a/g, 'sqrt');
    while (i < s.length) {
      c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      rest = s.substr(i);
      m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(rest);
      if (m) { t.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      m = /^[a-z]+/i.exec(rest);
      if (m) { t.push({ t: 'id', v: m[0].toLowerCase() }); i += m[0].length; continue; }
      if ('+-*/^%!(),'.indexOf(c) >= 0) { t.push({ t: 'o', v: c }); i++; continue; }
      throw new Error('Geçersiz karakter: ' + c);
    }
    return t;
  }
  function parse(tk) {
    var p = 0;
    function isO(v) { var t = tk[p]; return !!t && t.t === 'o' && t.v === v; }
    function expect(v) { if (!isO(v)) { throw new Error('"' + v + '" bekleniyor'); } p++; }
    function expr() {
      var v = term(), o, r;
      while (isO('+') || isO('-')) { o = tk[p++].v; r = term(); v = (o === '+') ? v + r : v - r; }
      return v;
    }
    function term() {
      var v = unary(), t, d;
      for (;;) {
        t = tk[p];
        if (isO('*')) { p++; v *= unary(); }
        else if (isO('/')) { p++; d = unary(); if (d === 0) { throw new Error('Sıfıra bölme hatası'); } v /= d; }
        else if (t && (t.t === 'n' || t.t === 'id' || isO('('))) { v *= unary(); }
        else { break; }
      }
      return v;
    }
    function unary() {
      if (isO('-')) { p++; return -unary(); }
      if (isO('+')) { p++; return unary(); }
      return power();
    }
    function power() {
      var b = postfix();
      if (isO('^')) { p++; return Math.pow(b, unary()); }
      return b;
    }
    function postfix() {
      var v = primary();
      while (isO('!') || isO('%')) { if (tk[p++].v === '!') { v = fact(v); } else { v = v / 100; } }
      return v;
    }
    function primary() {
      var t = tk[p++], v, args, name, need;
      if (!t) { throw new Error('İfade eksik'); }
      if (t.t === 'n') { return t.v; }
      if (t.t === 'id') {
        if (t.v === 'pi') { return Math.PI; }
        if (t.v === 'e') { return Math.E; }
        name = t.v === 'x' ? '' : t.v;
        if (!F.hasOwnProperty(name)) { throw new Error('Bilinmeyen ifade: ' + t.v); }
        expect('(');
        args = [];
        if (!isO(')')) { args.push(expr()); while (isO(',')) { p++; args.push(expr()); } }
        expect(')');
        need = ARITY[name] || 1;
        if (args.length !== need) { throw new Error(name + ': ' + need + ' argüman gerekli'); }
        return F[name].apply(null, args);
      }
      if (t.v === '(') { v = expr(); expect(')'); return v; }
      throw new Error('Beklenmeyen simge: ' + t.v);
    }
    var res = expr();
    if (p < tk.length) { throw new Error('Beklenmeyen simge: ' + tk[p].v); }
    return res;
  }
  function evaluate(s) {
    var t = tokenize(s), o = 0, c = 0, i, r;
    if (!t.length) { throw new Error('Boş ifade'); }
    for (i = 0; i < t.length; i++) { if (t[i].t === 'o') { if (t[i].v === '(') { o++; } else if (t[i].v === ')') { c++; } } }
    while (o > c) { t.push({ t: 'o', v: ')' }); c++; }
    r = parse(t);
    if (isNaN(r) || !isFinite(r)) { throw new Error('Tanımsız sonuç'); }
    return parseFloat(r.toPrecision(14));
  }
  return { evaluate: evaluate, setAngle: setAngle, getAngle: function () { return angle; } };
})();
