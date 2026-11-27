/*
 * Arira AI — cookie consent, consent-gated analytics, and on-device data deletion.
 *
 * Engine: CookieConsent v3 (MIT, github.com/orestbida/cookieconsent), self-hosted in /assets/vendor/cookieconsent/.
 * Analytics: PostHog, self-hosted on Arira's AWS (signals.ariraai.com). Nothing loads until the visitor opts in.
 *
 * Categories
 *   necessary        always on — stores the consent choice itself (cc_cookie)
 *   analytics        PostHog pageviews, clicks, anonymous visitor ID
 *   personalisation  lets Arira link an identity the visitor gives (e.g. email) to their visits
 *
 * Bump CONSENT_REVISION whenever a new cookie, tool or purpose is added: every visitor is asked again.
 * Set POSTHOG.key once the self-hosted PostHog project exists. While it is empty, no analytics code loads.
 */
(function () {
  'use strict';

  var CONSENT_REVISION = 1;
  var POSTHOG = {
    key: 'phc_rLrkCEMmTtsPMLrf9LNK2ThdqhXT6y5XRoxNEXd6dBBV',                                   // project API key from signals.ariraai.com → Project settings
    host: 'https://signals.ariraai.com'
  };
  var POLICY_URL = '/legal/cookies/';
  var REQUESTS_URL = '/legal/data-deletion/';

  // ---------- PostHog (loaded only after analytics consent) ----------
  var phLoaded = false;

  function loadPostHog() {
    if (phLoaded || !POSTHOG.key) return;
    phLoaded = true;
    /* Official PostHog loader snippet (MIT). */
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset get_distinct_id isFeatureEnabled onFeatureFlags getFeatureFlag reloadFeatureFlags group onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(POSTHOG.key, {
      api_host: POSTHOG.host,
      person_profiles: 'always',
      persistence: 'localStorage+cookie',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,         // session replay is OFF; the cookie policy says so. Update both together.
      respect_dnt: false,                      // consent is handled here; GPC is honoured below
      loaded: function (ph) {
        ph.opt_in_capturing();
        ph.register({ consent_revision: CONSENT_REVISION, consent_personalisation: accepted('personalisation') });
        paintVisitorId();
      }
    });
  }

  function stopPostHog() {
    if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
      try { window.posthog.opt_out_capturing(); window.posthog.reset(); } catch (e) {}
    }
    clearStorage(/^(ph_|__ph)/);
  }

  // ---------- helpers ----------
  function accepted(cat) {
    return !!(window.CookieConsent && window.CookieConsent.acceptedCategory(cat));
  }

  function clearStorage(pattern) {
    [window.localStorage, window.sessionStorage].forEach(function (store) {
      try {
        Object.keys(store).forEach(function (k) { if (!pattern || pattern.test(k)) store.removeItem(k); });
      } catch (e) {}
    });
  }

  function expireCookie(name) {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    domains.forEach(function (d) {
      document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '') + '; SameSite=Lax';
    });
  }

  function allCookieNames() {
    return document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); }).filter(Boolean);
  }

  function applyConsent() {
    if (accepted('analytics')) {
      loadPostHog();
      if (window.posthog && window.posthog.register) {
        window.posthog.register({ consent_personalisation: accepted('personalisation') });
      }
    } else {
      stopPostHog();
    }
    paintStatus();
  }

  // ---------- public API ----------
  window.AriraConsent = {
    /* Link a visitor's own details to their visits. Runs only with analytics + personalisation consent. */
    identify: function (email, props) {
      if (!accepted('analytics') || !accepted('personalisation') || !window.posthog) return false;
      window.posthog.identify(String(email).trim().toLowerCase(), Object.assign({ email: email }, props || {}));
      return true;
    },
    openSettings: function () { window.CookieConsent && window.CookieConsent.showPreferences(); },
    /* Delete everything this site stored on this device, withdraw all optional consent, ask again. */
    deleteAllSiteData: function () {
      stopPostHog();
      allCookieNames().forEach(expireCookie);
      clearStorage(null);
      if (window.CookieConsent) {
        window.CookieConsent.reset(true);       // removes consent cookie + UI
        runConsent(true);                       // rebuild UI and ask again
      }
      paintStatus();
      paintVisitorId();
      return true;
    },
    visitorId: function () {
      try { return window.posthog && window.posthog.get_distinct_id ? window.posthog.get_distinct_id() : ''; } catch (e) { return ''; }
    }
  };

  // ---------- page widgets (used on /legal/cookies/ and /legal/data-deletion/) ----------
  function paintStatus() {
    var el = document.querySelectorAll('[data-arira-consent-status]');
    if (!el.length) return;
    var txt;
    if (!window.CookieConsent || !window.CookieConsent.validConsent()) {
      txt = 'You have not made a choice yet. Only the essential consent cookie can be set.';
    } else {
      var on = ['Strictly necessary'];
      if (accepted('analytics')) on.push('Analytics');
      if (accepted('personalisation')) on.push('Personalisation');
      txt = 'Switched on for you: ' + on.join(', ') + '.';
    }
    el.forEach(function (n) { n.textContent = txt; });
  }

  function paintVisitorId() {
    var id = window.AriraConsent.visitorId();
    document.querySelectorAll('[data-arira-visitor-id]').forEach(function (n) {
      n.textContent = id || 'None — no analytics ID is stored on this device.';
    });
  }

  function bindButtons() {
    document.querySelectorAll('[data-arira-delete-data]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        window.AriraConsent.deleteAllSiteData();
        var msg = document.querySelector('[data-arira-delete-done]');
        if (msg) { msg.hidden = false; }
      });
    });
  }

  // ---------- consent UI ----------
  var cookieRow = function (name, domain, purpose, expiry) {
    return { name: name, domain: domain, desc: purpose, exp: expiry };
  };

  function startConsent(forceShow) {
    var CC = window.CookieConsent;
    if (!CC) return;
    if (!CC.validConsent()) {
      var gpc = navigator.globalPrivacyControl === true;
      if (gpc && !forceShow) {
        CC.acceptCategory([]);                 // Global Privacy Control = reject optional cookies, no banner
      } else {
        CC.show(true);
      }
    }
  }

  function init() {
    if (!window.CookieConsent) return;
    bindButtons();
    runConsent(false);
  }

  function runConsent(forceShow) {
    var CC = window.CookieConsent;
    CC.run({
      revision: CONSENT_REVISION,
      autoShow: false,
      hideFromBots: true,
      disablePageInteraction: false,
      cookie: { name: 'cc_cookie', expiresAfterDays: 182, sameSite: 'Lax' },
      guiOptions: {
        consentModal: { layout: 'bar inline', position: 'bottom', equalWeightButtons: true, flipButtons: false },
        preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false }
      },
      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: {
          autoClear: { cookies: [{ name: /^ph_/ }, { name: /^__ph/ }], reloadPage: false }
        },
        personalisation: {}
      },
      onFirstConsent: applyConsent,
      onConsent: applyConsent,
      onChange: applyConsent,
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: '',
              description: 'We use cookies to measure and improve this site. Optional cookies run only if you accept. <a href="' + POLICY_URL + '">Cookie policy</a>',
              acceptAllBtn: 'Accept',
              acceptNecessaryBtn: 'Reject',
              showPreferencesBtn: 'Settings'
            },
            preferencesModal: {
              title: 'Cookie settings',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save my choices',
              closeIconLabel: 'Close',
              serviceCounterLabel: 'Service|Services',
              sections: [
                {
                  title: 'How we use cookies',
                  description: 'Pick what you are comfortable with. Optional cookies are off until you switch them on. Turning a category off later deletes its cookies from this device.'
                },
                {
                  title: 'Strictly necessary <span class="pm__badge">Always on</span>',
                  description: 'Needed for the site to work and to remember your choice. These cannot be switched off.',
                  linkedCategory: 'necessary',
                  cookieTable: {
                    headers: { name: 'Cookie', domain: 'Set by', desc: 'Purpose', exp: 'Expires' },
                    body: [
                      cookieRow('cc_cookie', 'ariraai.com', 'Stores your cookie choices.', '6 months'),
                      cookieRow('Form cookies', 'Zoho Forms', 'Only on Book a Showcase. Keeps the form secure and lets it submit.', 'Session')
                    ]
                  }
                },
                {
                  title: 'Analytics',
                  description: 'Counts visits and shows which pages and Agentflows people read, using PostHog on our own infrastructure. Gives your browser a random visitor ID. No advertising.',
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: { name: 'Cookie', domain: 'Set by', desc: 'Purpose', exp: 'Expires' },
                    body: [
                      cookieRow('ph_&lt;id&gt;_posthog', 'ariraai.com', 'Random visitor ID and session, so we can count unique visits.', '1 year'),
                      cookieRow('__ph_opt_in_out_&lt;id&gt;', 'ariraai.com', 'Remembers whether analytics is on or off.', '1 year')
                    ]
                  }
                },
                {
                  title: 'Personalisation',
                  description: 'If you give us your details, for example in a Showcase request, we may link them to your visits so we can tailor what you see and follow up on what interested you. Works only when Analytics is also on. Sets no extra cookie.',
                  linkedCategory: 'personalisation'
                },
                {
                  title: 'More information',
                  description: 'Read our <a href="' + POLICY_URL + '">Cookie policy</a> and <a href="/legal/privacy/">Privacy policy</a>. To delete data we already hold, see <a href="' + REQUESTS_URL + '">Data deletion</a>.'
                }
              ]
            }
          }
        }
      }
    }).then(function () {
      startConsent(forceShow);
      applyConsent();
      paintVisitorId();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
