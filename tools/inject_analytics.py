#!/usr/bin/env python3
"""Run before every commit that adds or rebuilds pages (python3 tools/inject_analytics.py).
Makes every page carry the cookie-consent banner, /_identify.js and /_ga.js, and writes
those two scripts. The live server serves the repo exactly as committed: nothing is
added on the server any more, so a page that skips this step goes live without analytics."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTHOG_KEY = 'phc_rLrkCEMmTtsPMLrf9LNK2ThdqhXT6y5XRoxNEXd6dBBV'  # public client key, served in every page

c = ROOT / "assets" / "consent.js"
if c.exists():
    s = c.read_text()
    s2 = s.replace("key: ''", "key: '%s'" % POSTHOG_KEY, 1)
    if s2 != s:
        c.write_text(s2)

(ROOT / "_identify.js").write_text(r"""(function(){
  function grab(form){
    var e = form.querySelector('input[type=email], input[name*=email i]');
    if (!e || !e.value || e.value.indexOf('@') < 1) return;
    var props = {};
    var n = form.querySelector('input[name*=name i]'); if (n && n.value) props.name = n.value;
    var co = form.querySelector('input[name*=company i], input[name*=organi]'); if (co && co.value) props.company = co.value;
    props.form_page = location.pathname;
    if (window.AriraConsent && window.AriraConsent.identify) window.AriraConsent.identify(e.value, props);
  }
  document.addEventListener('submit', function(ev){ try { grab(ev.target); } catch(x){} }, true);
})();
""")
(ROOT / "_ga.js").write_text(r"""(function(){
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
""")
CONSENT_TAGS = ('<link rel="stylesheet" href="/assets/vendor/cookieconsent/cookieconsent.css">'
                '<link rel="stylesheet" href="/assets/consent.css">'
                '<script defer src="/assets/vendor/cookieconsent/cookieconsent.umd.js"></script>'
                '<script defer src="/assets/consent.js"></script>')
ID_TAG = '<script defer src="/_identify.js"></script>'
GA_TAG = '<script defer src="/_ga.js"></script>'
for f in ROOT.rglob("*.html"):
    if ".git" in f.parts:
        continue
    s = f.read_text(errors="ignore")
    add = ""
    if "consent.js" not in s: add += CONSENT_TAGS
    if "/_identify.js" not in s: add += ID_TAG
    if "/_ga.js" not in s: add += GA_TAG
    if add:
        new, n = re.subn(r"</head>", add + "</head>", s, count=1, flags=re.I)
        if n: f.write_text(new)
