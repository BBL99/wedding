(function () {
  var header = document.querySelector('.site-header');
  var nav    = header && header.querySelector('.nav');
  if (!nav) return;

  var allNavLinks = Array.from(nav.querySelectorAll('.nav__links li a'));

  // RSVP button
  var rsvpSrc = allNavLinks.find(function (a) {
    return a.getAttribute('href').indexOf('rsvp') !== -1;
  });
  var rsvpA = document.createElement('a');
  rsvpA.href = 'rsvp.html';
  rsvpA.className = 'nav__mobile-rsvp';
  rsvpA.textContent = 'RSVP';
  if (rsvpSrc && rsvpSrc.getAttribute('aria-current')) {
    rsvpA.setAttribute('aria-current', 'page');
  }

  // Menu button
  var menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'nav__menu-btn';
  menuBtn.setAttribute('aria-label', 'Open navigation menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML =
    '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<line x1="0" y1="1" x2="18" y2="1"/>' +
    '<line x1="0" y1="7" x2="18" y2="7"/>' +
    '<line x1="0" y1="13" x2="18" y2="13"/>' +
    '</svg><span>Menu</span>';

  var mobileDiv = document.createElement('div');
  mobileDiv.className = 'nav__mobile';
  mobileDiv.appendChild(rsvpA);
  mobileDiv.appendChild(menuBtn);
  nav.appendChild(mobileDiv);

  // Dropdown — all links except RSVP
  var dropdown = document.createElement('div');
  dropdown.className = 'nav__dropdown';
  dropdown.hidden = true;

  allNavLinks
    .filter(function (a) { return a.getAttribute('href').indexOf('rsvp') === -1; })
    .forEach(function (src) {
      var a = document.createElement('a');
      a.href = src.getAttribute('href');
      a.textContent = src.textContent.trim();
      if (src.getAttribute('aria-current')) a.setAttribute('aria-current', 'page');
      dropdown.appendChild(a);
    });

  header.appendChild(dropdown);

  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = !dropdown.hidden;
    dropdown.hidden = open;
    menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('click', function () {
    if (!dropdown.hidden) {
      dropdown.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
})();
