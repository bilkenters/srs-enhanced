/**
 * dashboard.js — Modül 1: Yaklaşan Sınavlar Paneli
 * Ana sayfadaki ders tablosunun ÜSTÜNE sınav paneli inject eder.
 * Veriyi /srs-v2/exams/finals endpoint'inden çeker.
 */
(function () {
  'use strict';

  var PANEL_ID = 'srs-enhanced-dashboard';

  /**
   * Exam type'a göre badge rengi
   */
  function getTypeBadgeColor(type) {
    var t = (type || '').toLowerCase();
    if (t.includes('quiz')) return '#f39c12';
    if (t.includes('midterm')) return '#e74c3c';
    if (t.includes('final')) return '#c0392b';
    return '#9b59b6'; // Other
  }

  /**
   * Kalan süreye göre urgency rengi (sol border)
   */
  function getUrgencyColor(daysRemaining) {
    if (daysRemaining <= 3) return '#e74c3c';
    if (daysRemaining <= 7) return '#f39c12';
    return '#27ae60';
  }

  /**
   * Countdown text oluştur
   */
  function formatCountdown(examDate) {
    var now = new Date();
    var diff = examDate.getTime() - now.getTime();
    if (diff <= 0) return 'Geçmiş';

    var totalHours = Math.floor(diff / (1000 * 60 * 60));
    var days = Math.floor(totalHours / 24);
    var hours = totalHours % 24;

    if (days > 0) {
      return days + ' gün ' + hours + ' saat';
    }
    return hours + ' saat';
  }

  /**
   * Sınav kartı HTML'i oluştur
   */
  function createExamCard(exam) {
    var now = new Date();
    var diff = exam.date.getTime() - now.getTime();
    var daysRemaining = diff / (1000 * 60 * 60 * 24);
    var urgencyColor = getUrgencyColor(daysRemaining);
    var typeColor = getTypeBadgeColor(exam.type);

    var card = document.createElement('div');
    card.className = 'srs-exam-card';
    card.style.borderLeftColor = urgencyColor;

    // Tarih formatlama
    var dateStr = exam.dateTimeStr || '';

    card.innerHTML =
      '<div class="srs-exam-top">' +
        '<span class="srs-exam-type-badge" style="background-color:' + typeColor + '">' +
          escapeHtml(exam.type || 'Exam') +
        '</span>' +
        '<span class="srs-exam-name" title="' + escapeHtml(exam.name) + '">' +
          escapeHtml(exam.name || 'Sınav') +
        '</span>' +
      '</div>' +
      '<div class="srs-exam-course">' + escapeHtml(exam.course) + '</div>' +
      '<table class="srs-exam-info-table">' +
        '<tr><td>Kalan:</td><td class="srs-exam-countdown">' + formatCountdown(exam.date) + '</td></tr>' +
        '<tr><td>Yer:</td><td>' + escapeHtml(exam.classroom || '—') + '</td></tr>' +
        '<tr><td>Tarih:</td><td>' + escapeHtml(dateStr) + '</td></tr>' +
      '</table>';

    return card;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  /**
   * Dashboard panelini oluştur ve inject et
   */
  function injectDashboard(exams) {
    // Duplicate prevention
    if (document.getElementById(PANEL_ID)) return;

    var courseTable = window.SRSUtils.findCourseTable();
    if (!courseTable) {
      return;
    }

    var now = new Date();
    // Sadece gelecekteki sınavları filtrele ve tarihe göre sırala
    var futureExams = exams
      .filter(function (e) {
        return e.date && e.date.getTime() > now.getTime();
      })
      .sort(function (a, b) {
        return a.date.getTime() - b.date.getTime();
      });

    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    // Header
    var header = document.createElement('div');
    header.className = 'srs-dash-header';
    header.innerHTML =
      '<span class="srs-dash-title">Yaklaşan Sınavlar</span>' +
      '<span class="srs-dash-count">(' + futureExams.length + ')</span>';
    panel.appendChild(header);

    if (futureExams.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'srs-dash-empty';
      empty.textContent = 'Yaklaşan sınav bulunmuyor.';
      panel.appendChild(empty);
    } else {
      var body = document.createElement('div');
      body.className = 'srs-dash-body';
      futureExams.forEach(function (exam) {
        body.appendChild(createExamCard(exam));
      });
      panel.appendChild(body);
    }

    // Ders tablosunun üstüne ekle (margin uyumu için küçük bir wrap)
    courseTable.parentNode.insertBefore(panel, courseTable);
  }

  /**
   * Panel yükleme durumunu göster
   */
  function showLoading() {
    if (document.getElementById(PANEL_ID)) return;

    var courseTable = window.SRSUtils.findCourseTable();
    if (!courseTable) return;

    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    var header = document.createElement('div');
    header.className = 'srs-dash-header';
    header.innerHTML = '<span class="srs-dash-title">Yaklaşan Sınavlar...</span>';
    panel.appendChild(header);

    var loading = document.createElement('div');
    loading.className = 'srs-dash-loading';
    loading.textContent = 'Sınav bilgileri yükleniyor...';
    panel.appendChild(loading);

    courseTable.parentNode.insertBefore(panel, courseTable);
  }

  /**
   * Init: Sınavları çek ve paneli oluştur
   */
  function init() {
    if (!window.SRSUtils.isMainPage()) return;

    // Loading göster
    showLoading();

    // Sınavları fetch et
    window.SRSUtils.fetchExams().then(function (exams) {
      // Eski loading panelini kaldır
      var existing = document.getElementById(PANEL_ID);
      if (existing) existing.remove();

      // Gerçek paneli inject et
      injectDashboard(exams);
    });
  }

  // Expose for main.js
  window.SRSDashboard = {
    init: init,
  };
})();
