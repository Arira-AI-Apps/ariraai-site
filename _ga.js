(function(){
  var ID = 'G-CFW5X3G6E7', loaded = false;
  function load(){
    if (loaded) return; loaded = true;
    window['ga-disable-' + ID] = false;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', ID);
  }
  function check(){
    try {
      if (window.CookieConsent && CookieConsent.acceptedCategory('analytics')) load();
      else if (window.CookieConsent) { window['ga-disable-' + ID] = true; }
    } catch (e) {}
  }
  window.addEventListener('cc:onConsent', check);
  window.addEventListener('cc:onChange', check);
  window.addEventListener('load', function(){ setTimeout(check, 300); });
})();
