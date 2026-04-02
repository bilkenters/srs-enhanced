/* main.js - Ana orchestrator: Modülleri doğru sırayla başlatır ve ayarlara göre CSS yönetimi yapar. */
(function () {
  'use strict';

  var KEYS = {
    master: 'srs_masterEnabled',
    dashboard: 'srs_dashboardEnabled',
    badges: 'srs_badgesEnabled',
  };

  // Ayarlara göre body claslarını yönet
  function updateBodyClasses(settings) {
    if (settings[KEYS.master] !== false) document.body.classList.add('srs-master-active');
    else document.body.classList.remove('srs-master-active');

    if (settings[KEYS.dashboard] !== false) document.body.classList.add('srs-dashboard-active');
    else document.body.classList.remove('srs-dashboard-active');

    if (settings[KEYS.badges] !== false) document.body.classList.add('srs-badges-active');
    else document.body.classList.remove('srs-badges-active');
    
    updateNativeToggleUI(settings[KEYS.master] !== false);
  }

  // Sayfa içi natif buton
  function updateNativeToggleUI(isMasterOn) {
    var btn = document.getElementById('srs-native-toggle');
    if (!btn) return;
    btn.className = isMasterOn ? 'srs-native-btn srs-native-on' : 'srs-native-btn srs-native-off';
    btn.innerHTML = isMasterOn ? 'SRS Enhanced: Aktif' : 'SRS Enhanced: Devre Dışı';
  }

  function injectNativeToggle(initialState) {
    if (document.getElementById('srs-native-toggle')) return;

    var centerPane = document.getElementById('DHTMLSuite_pane_center');
    if (!centerPane) return; // Wait for AJAX if not there

    var btn = document.createElement('div');
    btn.id = 'srs-native-toggle';
    btn.onclick = function() {
      var newState = !btn.className.includes('srs-native-on');
      var updates = {};
      updates[KEYS.master] = newState;
      chrome.storage.sync.set(updates, function() {
         // UI will update via the storage change listener or we just update manually
         chrome.storage.sync.get([KEYS.master, KEYS.dashboard, KEYS.badges], function(res) {
             updateBodyClasses(res);
         });
      });
    };

    // Center pane'in içine (tabların sağına) hizalamaya çalışalım
    // En tepeye absolute veya floating olarak yerleştiriyoruz.
    centerPane.insertBefore(btn, centerPane.firstChild);

    updateNativeToggleUI(initialState);
  }

  // Mesaj dinleyici (Popup'tan gelen 'anında' değişiklikler için)
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'srs-settings-changed') {
      updateBodyClasses(msg.settings);
    }
  });

  // Sadece ana sayfada (veya center pane'in olduğu her yerde) aktif
  if (window.SRSUtils && window.SRSUtils.isMainPage()) {
    chrome.storage.sync.get([KEYS.master, KEYS.dashboard, KEYS.badges], function(settings) {
      updateBodyClasses(settings);

      setTimeout(function () {
        // Natif butonu zerk et
        injectNativeToggle(settings[KEYS.master] !== false);

        // Modülleri başlat (CSS onları gizleyecekse de DOM'u oluşturmalarında zarar yok)
        if (window.SRSDashboard) {
          try { window.SRSDashboard.init(); } catch (e) { console.error(e); }
        }
        if (window.SRSBadges) {
          try { window.SRSBadges.init(); } catch (e) { console.error(e); }
        }
      }, 1500); // SRS AJAX Delay
    });
  }
})();
