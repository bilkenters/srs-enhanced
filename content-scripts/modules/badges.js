/**
 * badges.js — Modül 2: Inline Course Badges
 * Her dersin course name hücresinin altına attendance ve grade badge'leri ekler.
 * MutationObserver ile AJAX panel yüklemelerini takip eder.
 */
(function () {
  'use strict';

  var BADGE_ATTR = 'data-srs-badges-injected';

  /**
   * Attendance badge renk seçimi
   */
  function getAttendanceClass(pct) {
    if (pct < 70) return 'srs-badge-attendance-danger';
    if (pct < 80) return 'srs-badge-attendance-warn';
    return 'srs-badge-attendance-ok';
  }

  /**
   * Bir ders satırına badge'leri inject et
   */
  function injectBadgesForCourse(course, semesterCode) {
    var nameCell = course.nameCell;
    if (!nameCell) return;

    // Duplicate prevention
    if (nameCell.getAttribute(BADGE_ATTR)) return;
    nameCell.setAttribute(BADGE_ATTR, 'true');

    // Badge container oluştur
    var container = document.createElement('div');
    container.className = 'srs-badge-container';

    // Loading badge'leri
    var loadingBadge = document.createElement('span');
    loadingBadge.className = 'srs-badge srs-badge-loading';
    loadingBadge.textContent = 'Yükleniyor...';
    container.appendChild(loadingBadge);
    nameCell.appendChild(container);

    // Paralel olarak grade ve attendance çek
    var gradePromise = window.SRSUtils.fetchGrades(course.code, semesterCode);
    var attendancePromise = window.SRSUtils.fetchAttendance(
      course.code,
      semesterCode
    );

    Promise.all([gradePromise, attendancePromise]).then(function (results) {
      var grades = results[0];
      var attendancePct = results[1];

      // Loading badge'i temizle
      container.innerHTML = '';

      // Attendance badge
      if (attendancePct !== null) {
        var attBadge = document.createElement('span');
        attBadge.className = 'srs-badge ' + getAttendanceClass(attendancePct);
        attBadge.textContent = 'Devam: %' + attendancePct.toFixed(1);
        attBadge.title = 'Devam oranı: ' + attendancePct.toFixed(1) + '%';
        container.appendChild(attBadge);
      }

      // Grade badge'leri
      if (grades.length > 0) {
        grades.forEach(function (g) {
          var gradeBadge = document.createElement('span');
          gradeBadge.className = 'srs-badge srs-badge-grade';
          // Grade title'ını kısalt
          var shortTitle = g.title;
          if (shortTitle.length > 20) {
            shortTitle = shortTitle.substring(0, 18) + '…';
          }
          gradeBadge.textContent = shortTitle + ': ' + g.grade;
          gradeBadge.title = g.title + ' (' + g.type + '): ' + g.grade;
          container.appendChild(gradeBadge);
        });
      }

      // Eğer hiçbir veri yoksa container'ı gizle
      if (!container.hasChildNodes()) {
        var noBadge = document.createElement('span');
        noBadge.className = 'srs-badge srs-badge-loading';
        noBadge.textContent = 'Veri yok';
        noBadge.style.opacity = '0.6';
        container.appendChild(noBadge);
      }
    });
  }

  /**
   * Tüm derslere badge inject et
   */
  function injectAllBadges() {
    var semesterCode = window.SRSUtils.getSemesterCode();
    if (!semesterCode) {
      return;
    }

    var courses = window.SRSUtils.parseCourseRows();
    if (!courses.length) return;

    courses.forEach(function (course) {
      injectBadgesForCourse(course, semesterCode);
    });
  }

  /**
   * MutationObserver ile AJAX panel değişikliklerini takip et
   */
  function setupObserver() {
    var target = document.getElementById('DHTMLSuite_pane_center');
    if (!target) {
      // Panel henüz yoksa, body'yi gözlemle
      target = document.body;
    }

    var observer = new MutationObserver(function (mutations) {
      // Yeni content yüklendiğinde badge kontrolü yap
      var shouldCheck = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) {
        // Debounce: Kısa bir gecikme ile sadece bir kez çalıştır
        clearTimeout(window._srsBadgeDebounce);
        window._srsBadgeDebounce = setTimeout(function () {
          injectAllBadges();
        }, 500);
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Init
   */
  function init() {
    if (!window.SRSUtils.isMainPage()) return;

    // İlk badge injection
    injectAllBadges();

    // MutationObserver ile AJAX güncellemelerini takip et
    setupObserver();
  }

  // Expose for main.js
  window.SRSBadges = {
    init: init,
    injectAll: injectAllBadges,
  };
})();
