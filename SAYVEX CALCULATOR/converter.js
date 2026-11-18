var NX = window.NX = window.NX || {};
NX.Converter = (function () {
  var cats = {
    'Uzunluk': { u: { 'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, 'inç': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mil': 1609.344 } },
    'Ağırlık': { u: { 'mg': 0.000001, 'g': 0.001, 'kg': 1, 'ton': 1000, 'oz': 0.028349523125, 'lb': 0.45359237 } },
    'Sıcaklık': { temp: true, u: { '°C': 1, '°F': 1, 'K': 1 } },
    'Alan': { u: { 'cm²': 0.0001, 'm²': 1, 'ha': 10000, 'km²': 1000000, 'ft²': 0.09290304, 'akre': 4046.8564224 } },
    'Hacim': { u: { 'ml': 0.001, 'L': 1, 'm³': 1000, 'gal (US)': 3.785411784, 'fl oz (US)': 0.0295735295625, 'bardak (US)': 0.2365882365 } },
    'Zaman': { u: { 'ms': 0.001, 'sn': 1, 'dk': 60, 'sa': 3600, 'gün': 86400, 'hafta': 604800 } },
    'Hız': { u: { 'm/s': 1, 'km/sa': 1 / 3.6, 'mph': 0.44704, 'knot': 0.514444444444 } },
    'Veri boyutu': { u: { 'bit': 0.125, 'B': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776 } }
  };
  var order = ['Uzunluk', 'Ağırlık', 'Sıcaklık', 'Alan', 'Hacim', 'Zaman', 'Hız', 'Veri boyutu'];
  function names() { return order; }
  function units(cat) { var r = [], k; for (k in cats[cat].u) { r.push(k); } return r; }
  function toC(u, v) { return u === '°C' ? v : (u === '°F' ? (v - 32) * 5 / 9 : v - 273.15); }
  function fromC(u, v) { return u === '°C' ? v : (u === '°F' ? v * 9 / 5 + 32 : v + 273.15); }
  function convert(cat, from, to, v) {
    var c = cats[cat];
    if (c.temp) { return fromC(to, toC(from, v)); }
    return v * c.u[from] / c.u[to];
  }
  return { names: names, units: units, convert: convert };
})();
