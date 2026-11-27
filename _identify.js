(function(){
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
