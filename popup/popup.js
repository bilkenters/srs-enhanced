/* Popup JS - Eklenti ayarları */
(function () {
  'use strict';

  var KEYS = {
    master: 'srs_masterEnabled',
    dashboard: 'srs_dashboardEnabled',
    badges: 'srs_badgesEnabled',
  };

  var els = {
    master: document.getElementById('toggle-master'),
    dashboard: document.getElementById('toggle-dashboard'),
    badges: document.getElementById('toggle-badges'),
  };

  if (!els.master || !els.dashboard || !els.badges) return;

  // Default values: All true
  chrome.storage.sync.get([KEYS.master, KEYS.dashboard, KEYS.badges], function(res) {
    if (chrome.runtime.lastError) return;
    
    // Eğer undefined ise true say (ilk kurulum)
    els.master.checked = res[KEYS.master] !== false;
    els.dashboard.checked = res[KEYS.dashboard] !== false;
    els.badges.checked = res[KEYS.badges] !== false;

    updateUIState();
  });

  function updateUIState() {
    // Master kapalıysa diğerleri tıklanamasın
    var isMaster = els.master.checked;
    els.dashboard.disabled = !isMaster;
    els.badges.disabled = !isMaster;
    
    if (!isMaster) {
      els.dashboard.parentElement.style.opacity = '0.5';
      els.badges.parentElement.style.opacity = '0.5';
    } else {
      els.dashboard.parentElement.style.opacity = '1';
      els.badges.parentElement.style.opacity = '1';
    }
  }

  function saveAndNotify() {
    var state = {};
    state[KEYS.master] = els.master.checked;
    state[KEYS.dashboard] = els.dashboard.checked;
    state[KEYS.badges] = els.badges.checked;

    chrome.storage.sync.set(state, function () {
      updateUIState();
      
      // Notify active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'srs-settings-changed',
            settings: state,
          }).catch(function() {});
        }
      });
    });
  }

  els.master.addEventListener('change', saveAndNotify);
  els.dashboard.addEventListener('change', saveAndNotify);
  els.badges.addEventListener('change', saveAndNotify);

})();
