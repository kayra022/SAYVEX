var NX = window.NX = window.NX || {};
NX.Settings = (function () {
  var defaults = { theme: 'amoled', sound: true, anim: true, dec: 10, angle: 'deg', sep: 'none' };
  var data = {}, store = 'none', filePath = '';
  var k;
  for (k in defaults) { data[k] = defaults[k]; }
  function getPath() {
    var p = decodeURIComponent(location.pathname).replace(/^\//, '').replace(/\//g, '\\');
    return p.substr(0, p.lastIndexOf('\\') + 1) + 'settings.json';
  }
  function merge(o) { var x; for (x in o) { if (defaults.hasOwnProperty(x)) { data[x] = o[x]; } } }
  function load() {
    try {
      var fso = new ActiveXObject('Scripting.FileSystemObject');
      filePath = getPath(); store = 'file';
      if (fso.FileExists(filePath)) {
        var f = fso.OpenTextFile(filePath, 1, false, -1);
        var txt = f.ReadAll(); f.Close();
        merge(JSON.parse(txt));
      }
      return;
    } catch (e) { store = 'none'; }
    try { var s = window.localStorage.getItem('sayvex_settings'); if (s) { merge(JSON.parse(s)); } store = 'local'; } catch (e2) { store = 'none'; }
  }
  function save() {
    var txt = JSON.stringify(data);
    try {
      if (store === 'file') {
        var fso = new ActiveXObject('Scripting.FileSystemObject');
        var f = fso.CreateTextFile(filePath, true, true);
        f.Write(txt); f.Close();
      } else if (store === 'local') { window.localStorage.setItem('sayvex_settings', txt); }
    } catch (e) { }
  }
  function get(key) { return data[key]; }
  function set(key, val) { data[key] = val; save(); }
  function where() { return store === 'file' ? filePath : (store === 'local' ? 'tarayıcı deposu' : 'kaydedilemiyor'); }
  return { load: load, get: get, set: set, where: where };
})();
