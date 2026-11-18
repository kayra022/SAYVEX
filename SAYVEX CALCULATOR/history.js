var NX = window.NX = window.NX || {};
NX.History = (function () {
  var items = [], MAX = 50;
  function add(rawExpr, rawRes, dispExpr, dispRes) {
    items.unshift({ e: rawExpr, r: rawRes, de: dispExpr, dr: dispRes });
    if (items.length > MAX) { items.pop(); }
  }
  function clear() { items = []; }
  function all() { return items; }
  return { add: add, clear: clear, all: all };
})();
