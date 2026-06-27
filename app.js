/**
 * Placar de Vôlei — app principal
 * Vanilla JS, compatível com engines antigas (sem optional chaining).
 */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Constantes e estado
     -------------------------------------------------------------------------- */
  var STORAGE_KEY = 'volleyball-scoreboard-v1';
  var INSTALL_BANNER_KEY = 'volleyball-install-banner-dismissed';
  var SWIPE_THRESHOLD = 70; /* px — distância mínima para desfazer ponto */
  var TAP_MAX_MOVE = 12;     /* px — movimento máximo para considerar tap */
  var TAP_MAX_DURATION = 350; /* ms */

  var state = {
    scoreA: 0,
    scoreB: 0,
    nameA: 'Time A',
    nameB: 'Time B',
    colorA: '#1673e0',
    colorB: '#e63946',
    scoreLimit: 25,       /* 0 = sem limite */
    winByTwo: false,
    celebration: true,
    gameOver: false,
    winner: null,         /* 'a' | 'b' | null */
    gameOverOverlayDismissed: false
  };

  var confettiTimer = null;
  var deferredInstallPrompt = null;
  var qrcodeInstance = null;
  var renameTarget = null;
  var gameOverShownAt = 0;

  /* --------------------------------------------------------------------------
     Referências DOM
     -------------------------------------------------------------------------- */
  var el = {
    teamA: document.getElementById('team-a'),
    teamB: document.getElementById('team-b'),
    scoreA: document.getElementById('score-a'),
    scoreB: document.getElementById('score-b'),
    nameA: document.getElementById('name-a'),
    nameB: document.getElementById('name-b'),
    trophyA: document.getElementById('trophy-a'),
    trophyB: document.getElementById('trophy-b'),
    gameOver: document.getElementById('game-over'),
    gameOverText: document.getElementById('game-over-text'),
    btnReset: document.getElementById('btn-reset'),
    btnShare: document.getElementById('btn-share'),
    btnSettings: document.getElementById('btn-settings'),
    btnInstall: document.getElementById('btn-install'),
    btnInstallNative: document.getElementById('btn-install-native'),
    btnBannerInstall: document.getElementById('btn-banner-install'),
    btnBannerDismiss: document.getElementById('btn-banner-dismiss'),
    installBanner: document.getElementById('install-banner'),
    installAlready: document.getElementById('install-already'),
    installStepsIos: document.getElementById('install-steps-ios'),
    installStepsAndroid: document.getElementById('install-steps-android'),
    installNoteDesktop: document.getElementById('install-note-desktop'),
    installIntro: document.getElementById('install-intro'),
    shareQrSection: document.getElementById('share-qr-section'),
    shareInstallSection: document.getElementById('share-install-section'),
    modalSettings: document.getElementById('modal-settings'),
    modalShare: document.getElementById('modal-share'),
    modalRename: document.getElementById('modal-rename'),
    inputNameA: document.getElementById('input-name-a'),
    inputNameB: document.getElementById('input-name-b'),
    inputColorA: document.getElementById('input-color-a'),
    inputColorB: document.getElementById('input-color-b'),
    toggleWinByTwo: document.getElementById('toggle-win-by-two'),
    toggleWinByTwoWrap: document.getElementById('toggle-win-by-two-wrap'),
    toggleCelebration: document.getElementById('toggle-celebration'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    qrcode: document.getElementById('qrcode'),
    shareUrl: document.getElementById('share-url'),
    shareUrlMobile: document.getElementById('share-url-mobile'),
    btnCopyUrl: document.getElementById('btn-copy-url'),
    btnCopyUrlMobile: document.getElementById('btn-copy-url-mobile'),
    btnWhatsapp: document.getElementById('btn-whatsapp'),
    btnWhatsappMobile: document.getElementById('btn-whatsapp-mobile'),
    btnShareImage: document.getElementById('btn-share-image'),
    btnShareImageWin: document.getElementById('btn-share-image-win'),
    btnResetWin: document.getElementById('btn-reset-win'),
    scoreboard: document.getElementById('scoreboard'),
    inputRename: document.getElementById('input-rename'),
    btnSaveRename: document.getElementById('btn-save-rename')
  };

  /* --------------------------------------------------------------------------
     Persistência (localStorage)
     -------------------------------------------------------------------------- */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        nameA: state.nameA,
        nameB: state.nameB,
        colorA: state.colorA,
        colorB: state.colorB,
        scoreLimit: state.scoreLimit,
        winByTwo: state.winByTwo,
        celebration: state.celebration,
        gameOver: state.gameOver,
        winner: state.winner
      }));
    } catch (e) { /* quota excedida ou modo privado */ }
  }

  var DEFAULT_COLOR_A = '#1673e0';
  var DEFAULT_COLOR_B = '#e63946';
  var LEGACY_COLORS = [
    ['#1e3a5f', '#7c2d12'],
    ['#1e88e5', '#e53935']
  ];

  function normalizeHex(color) {
    return (color || '').toLowerCase();
  }

  function migrateLegacyColors() {
    var a = normalizeHex(state.colorA);
    var b = normalizeHex(state.colorB);
    var i;

    for (i = 0; i < LEGACY_COLORS.length; i++) {
      if (a === LEGACY_COLORS[i][0] && b === LEGACY_COLORS[i][1]) {
        state.colorA = DEFAULT_COLOR_A;
        state.colorB = DEFAULT_COLOR_B;
        return;
      }
    }
  }

  function normalizeSettings() {
    state.scoreLimit = parseInt(state.scoreLimit, 10);
    if (isNaN(state.scoreLimit) || state.scoreLimit < 0) {
      state.scoreLimit = 0;
    }
    state.winByTwo = state.winByTwo === true;
    if (state.scoreLimit === 0) {
      state.winByTwo = false;
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (typeof data.scoreA === 'number') state.scoreA = data.scoreA;
      if (typeof data.scoreB === 'number') state.scoreB = data.scoreB;
      if (data.nameA) state.nameA = data.nameA;
      if (data.nameB) state.nameB = data.nameB;
      if (data.colorA) state.colorA = data.colorA;
      if (data.colorB) state.colorB = data.colorB;
      if (data.scoreLimit !== undefined && data.scoreLimit !== null) {
        state.scoreLimit = parseInt(data.scoreLimit, 10);
      }
      if (data.winByTwo === true || data.winByTwo === false) {
        state.winByTwo = data.winByTwo;
      }
      if (typeof data.celebration === 'boolean') state.celebration = data.celebration;
      if (typeof data.gameOver === 'boolean') state.gameOver = data.gameOver;
      if (data.winner === 'a' || data.winner === 'b') state.winner = data.winner;

      normalizeSettings();

      var prevA = state.colorA;
      var prevB = state.colorB;
      migrateLegacyColors();
      if (state.colorA !== prevA || state.colorB !== prevB) {
        saveState();
      }
    } catch (e) { /* JSON inválido */ }
  }

  /* --------------------------------------------------------------------------
     Renderização
     -------------------------------------------------------------------------- */
  function applyColors() {
    document.documentElement.style.setProperty('--color-a', state.colorA);
    document.documentElement.style.setProperty('--color-b', state.colorB);
  }

  function renderScores() {
    el.scoreA.textContent = String(state.scoreA);
    el.scoreB.textContent = String(state.scoreB);
    el.nameA.textContent = state.nameA;
    el.nameB.textContent = state.nameB;
    applyColors();
    renderGameOverState();
  }

  function renderGameOverState() {
    var teams = { a: el.teamA, b: el.teamB };
    var trophies = { a: el.trophyA, b: el.trophyB };

    el.teamA.classList.remove('is-winner', 'is-loser', 'is-frozen');
    el.teamB.classList.remove('is-winner', 'is-loser', 'is-frozen');
    el.trophyA.classList.add('hidden');
    el.trophyB.classList.add('hidden');

    if (state.gameOver && state.winner) {
      teams[state.winner].classList.add('is-winner', 'is-frozen');
      trophies[state.winner].classList.remove('hidden');
      var loser = state.winner === 'a' ? 'b' : 'a';
      teams[loser].classList.add('is-loser', 'is-frozen');

      var winnerName = state.winner === 'a' ? state.nameA : state.nameB;
      el.gameOverText.textContent = winnerName + ' venceu!';
      if (state.gameOverOverlayDismissed) {
        el.gameOver.classList.add('hidden');
      } else {
        el.gameOver.classList.remove('hidden');
      }
    } else {
      el.gameOver.classList.add('hidden');
    }
  }

  function dismissGameOverOverlay() {
    if (!state.gameOver || state.gameOverOverlayDismissed) return;
    state.gameOverOverlayDismissed = true;
    el.gameOver.classList.add('hidden');
  }

  function pulseScore(team) {
    var scoreEl = team === 'a' ? el.scoreA : el.scoreB;
    scoreEl.classList.remove('pulse');
    /* força reflow para reiniciar animação */
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pulse');
  }

  function vibrateShort() {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }

  /* --------------------------------------------------------------------------
     Lógica de pontuação e fim de partida
     
     Sem limite (scoreLimit === 0): contagem livre, nunca há vencedor.
     
     Com limite, winByTwo OFF: ao atingir o limite, vitória imediata.
     
     Com limite, winByTwo ON (regra deuce do vôlei):
       vitória só quando score >= limite E diferença >= 2.
       Ex.: 24x24 → continua; 25x24 → continua; 26x24 → time A vence.
     -------------------------------------------------------------------------- */
  function checkWinner(silent) {
    var limit = parseInt(state.scoreLimit, 10);
    if (!limit || limit <= 0 || state.gameOver) return;

    var a = state.scoreA;
    var b = state.scoreB;
    var winByTwo = state.winByTwo === true;

    function teamWins(score, opponent) {
      if (score < limit) return false;
      if (winByTwo) {
        return (score - opponent) >= 2;
      }
      return true;
    }

    if (teamWins(a, b)) {
      declareWinner('a', silent);
    } else if (teamWins(b, a)) {
      declareWinner('b', silent);
    }
  }

  function declareWinner(team, silent) {
    state.gameOver = true;
    state.winner = team;
    state.gameOverOverlayDismissed = false;
    gameOverShownAt = Date.now();
    saveState();
    renderGameOverState();

    if (state.celebration && !silent) {
      launchConfetti(team);
    }
  }

  function incrementScore(team) {
    if (state.gameOver) return;

    if (team === 'a') {
      state.scoreA += 1;
      pulseScore('a');
    } else {
      state.scoreB += 1;
      pulseScore('b');
    }

    vibrateShort();
    saveState();
    renderScores();
    checkWinner();
  }

  function decrementScore(team) {
    var current = team === 'a' ? state.scoreA : state.scoreB;
    if (current <= 0) return;

    if (team === 'a') {
      state.scoreA -= 1;
    } else {
      state.scoreB -= 1;
    }

    /* Se estava em game over, reavaliar — pode reverter vitória por engano */
    if (state.gameOver) {
      state.gameOver = false;
      state.winner = null;
      state.gameOverOverlayDismissed = false;
      stopConfetti();
      el.gameOver.classList.add('hidden');
    }

    vibrateShort();
    saveState();
    renderScores();
    checkWinner();
  }

  function resetMatch(skipConfirm) {
    if (!skipConfirm && !confirm('Reiniciar a partida? Os placares serão zerados.')) return;

    state.scoreA = 0;
    state.scoreB = 0;
    state.gameOver = false;
    state.winner = null;
    state.gameOverOverlayDismissed = false;
    stopConfetti();
    saveState();
    renderScores();
  }

  /* --------------------------------------------------------------------------
     Gestos: tap (+1) e swipe down (−1)
     Touch Events + Mouse Events como fallback (sem Pointer Events)
     -------------------------------------------------------------------------- */
  function setupTeamGestures(teamEl, teamKey) {
    var startY = 0;
    var startX = 0;
    var startTime = 0;
    var isDragging = false;
    var activePointer = false;

    function onStart(clientX, clientY) {
      startX = clientX;
      startY = clientY;
      startTime = Date.now();
      isDragging = false;
      activePointer = true;
    }

    function onMove(clientX, clientY) {
      if (!activePointer) return;
      var dy = clientY - startY;
      var dx = clientX - startX;

      if (Math.abs(dy) > TAP_MAX_MOVE || Math.abs(dx) > TAP_MAX_MOVE) {
        isDragging = true;
      }

      if (dy > 20) {
        teamEl.classList.add('is-dragging');
      } else {
        teamEl.classList.remove('is-dragging');
      }
    }

    function onEnd(clientX, clientY) {
      if (!activePointer) return;
      activePointer = false;
      teamEl.classList.remove('is-dragging');

      var dy = clientY - startY;
      var dx = clientX - startX;
      var duration = Date.now() - startTime;

      /* Swipe para baixo: desfazer ponto (funciona mesmo com game over) */
      if (dy >= SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        decrementScore(teamKey);
        return;
      }

      /* Tap: incrementar (bloqueado se game over) */
      if (!isDragging && duration < TAP_MAX_DURATION &&
          Math.abs(dx) < TAP_MAX_MOVE && Math.abs(dy) < TAP_MAX_MOVE) {
        incrementScore(teamKey);
      }
    }

    /* Touch */
    teamEl.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });

    teamEl.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });

    teamEl.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    });

    teamEl.addEventListener('touchcancel', function () {
      activePointer = false;
      teamEl.classList.remove('is-dragging');
    });

    /* Mouse (desktop) */
    teamEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      onStart(e.clientX, e.clientY);

      function onMouseMove(ev) {
        onMove(ev.clientX, ev.clientY);
      }

      function onMouseUp(ev) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        onEnd(ev.clientX, ev.clientY);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  /* --------------------------------------------------------------------------
     Animação de vitória (canvas-confetti via CDN)
     Degrada graciosamente se a lib não carregar
     -------------------------------------------------------------------------- */
  function launchConfetti(team) {
    if (typeof confetti !== 'function') return;

    stopConfetti();

    var color = team === 'a' ? state.colorA : state.colorB;
    var isLeft = team === 'a';

    var end = Date.now() + 3500;

    function frame() {
      confetti({
        particleCount: 3,
        angle: isLeft ? 60 : 120,
        spread: 55,
        origin: { x: isLeft ? 0.15 : 0.85, y: 0.6 },
        colors: [color, '#facc15', '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: isLeft ? 120 : 60,
        spread: 55,
        origin: { x: isLeft ? 0.35 : 0.65, y: 0.4 },
        colors: [color, '#facc15', '#ffffff']
      });

      if (Date.now() < end) {
        confettiTimer = requestAnimationFrame(frame);
      }
    }

    frame();

    /* Para ao toque em qualquer lugar */
    function stopOnTouch() {
      stopConfetti();
      document.removeEventListener('touchstart', stopOnTouch);
      document.removeEventListener('click', stopOnTouch);
    }
    document.addEventListener('touchstart', stopOnTouch, { once: true, passive: true });
    document.addEventListener('click', stopOnTouch, { once: true });
  }

  function stopConfetti() {
    if (confettiTimer) {
      cancelAnimationFrame(confettiTimer);
      confettiTimer = null;
    }
    if (typeof confetti === 'function' && confetti.reset) {
      confetti.reset();
    }
  }

  /* --------------------------------------------------------------------------
     Configurações (modal)
     -------------------------------------------------------------------------- */
  function syncSettingsForm() {
    el.inputNameA.value = state.nameA;
    el.inputNameB.value = state.nameB;
    el.inputColorA.value = state.colorA;
    el.inputColorB.value = state.colorB;
    el.toggleCelebration.checked = state.celebration;
    el.toggleWinByTwo.checked = state.winByTwo;

    var radios = document.querySelectorAll('input[name="limit"]');
    for (var i = 0; i < radios.length; i++) {
      var val = parseInt(radios[i].value, 10);
      radios[i].checked = val === state.scoreLimit;
      updateChipSelected(radios[i]);
    }

    updateWinByTwoVisibility();
  }

  function updateChipSelected(radio) {
    var label = radio.parentElement;
    if (label && label.classList) {
      if (radio.checked) {
        label.classList.add('is-selected');
      } else {
        label.classList.remove('is-selected');
      }
    }
  }

  function updateWinByTwoVisibility() {
    var hasLimit = state.scoreLimit > 0;
    if (hasLimit) {
      el.toggleWinByTwoWrap.classList.remove('is-disabled', 'hidden');
    } else {
      el.toggleWinByTwoWrap.classList.add('is-disabled');
      el.toggleWinByTwo.checked = false;
    }
  }

  function applyGameRulesFromForm() {
    var prevLimit = state.scoreLimit;
    var radios = document.querySelectorAll('input[name="limit"]');
    var i;
    var found = false;

    for (i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        state.scoreLimit = parseInt(radios[i].value, 10);
        found = true;
        break;
      }
    }

    if (!found || isNaN(state.scoreLimit)) {
      state.scoreLimit = 0;
    }

    /* Ao definir limite vindo de "sem limite", ativa vitória por 2 por padrão */
    if (state.scoreLimit > 0 && prevLimit === 0) {
      el.toggleWinByTwo.checked = true;
    }

    if (state.scoreLimit > 0) {
      state.winByTwo = el.toggleWinByTwo.checked;
    } else {
      state.winByTwo = false;
      el.toggleWinByTwo.checked = false;
    }

    normalizeSettings();
    updateWinByTwoVisibility();
    saveState();
    checkWinner();
    renderGameOverState();
  }

  function readSettingsForm() {
    state.nameA = el.inputNameA.value.trim() || 'Time A';
    state.nameB = el.inputNameB.value.trim() || 'Time B';
    state.colorA = el.inputColorA.value;
    state.colorB = el.inputColorB.value;
    state.celebration = el.toggleCelebration.checked;
    applyGameRulesFromForm();
    renderScores();
  }

  function openModal(dialog) {
    if (dialog && dialog.showModal) {
      dialog.showModal();
    }
  }

  function closeModal(dialog) {
    if (dialog && dialog.close) {
      dialog.close();
    }
  }

  /* --------------------------------------------------------------------------
     QR Code (qrcodejs via CDN)
     -------------------------------------------------------------------------- */
  function renderQRCode() {
    setShareUrls();

    if (typeof QRCode === 'undefined') {
      el.qrcode.innerHTML = '<p style="color:#333;padding:1rem;font-size:0.85rem">QR Code indisponível offline.</p>';
      return;
    }

    el.qrcode.innerHTML = '';
    qrcodeInstance = new QRCode(el.qrcode, {
      text: window.location.origin + '/',
      width: 200,
      height: 200,
      colorDark: '#0d1117',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function getShareUrl() {
    return window.location.origin + '/';
  }

  function shareOnWhatsApp() {
    var url = getShareUrl();
    var text = 'Placar de Vôlei — acesse e instale no celular: ' + url;
    var waUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  function getScoreboardShareText() {
    return state.nameA + ' ' + state.scoreA + ' x ' + state.scoreB + ' ' + state.nameB + ' — Placar de Vôlei';
  }

  function downloadImageBlob(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'placar-volei-' + state.scoreA + 'x' + state.scoreB + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function shareImageBlob(blob) {
    var fileName = 'placar-volei-' + state.scoreA + 'x' + state.scoreB + '.png';
    var file;

    try {
      file = new File([blob], fileName, { type: 'image/png' });
    } catch (e) {
      downloadImageBlob(blob);
      return Promise.resolve();
    }

    var shareData = {
      title: 'Placar de Vôlei',
      text: getScoreboardShareText(),
      files: [file]
    };

    if (navigator.share) {
      var canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
      if (canShareFiles) {
        return navigator.share(shareData).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          downloadImageBlob(blob);
        });
      }
    }

    downloadImageBlob(blob);
    return Promise.resolve();
  }

  function captureScoreboardImage() {
    if (typeof html2canvas !== 'function') {
      alert('Captura de imagem indisponível. Verifique sua conexão e tente novamente.');
      return Promise.reject();
    }

    document.body.classList.add('is-capturing');

    return html2canvas(el.scoreboard, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      ignoreElements: function (node) {
        return node.classList && node.classList.contains('team-hint');
      },
      onclone: function (doc) {
        if (!state.gameOver || !state.winner) return;

        var winnerEl = doc.getElementById('team-' + state.winner);
        var loserKey = state.winner === 'a' ? 'b' : 'a';
        var loserEl = doc.getElementById('team-' + loserKey);
        var trophyEl = doc.getElementById('trophy-' + state.winner);

        if (winnerEl) {
          winnerEl.style.overflow = 'visible';
          winnerEl.style.boxShadow = 'none';
          winnerEl.style.outline = '4px solid #facc15';
          winnerEl.style.outlineOffset = '-4px';
        }
        if (loserEl) {
          loserEl.style.filter = 'brightness(0.65) saturate(0.7)';
        }
        if (trophyEl) {
          trophyEl.classList.remove('hidden');
        }
      }
    }).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('blob vazio'));
        }, 'image/png', 0.92);
      });
    }).finally(function () {
      document.body.classList.remove('is-capturing');
    });
  }

  function shareScoreboardAsImage(triggerBtn) {
    var btn = triggerBtn || el.btnShareImage;
    if (!btn) return;

    var originalHtml = btn.innerHTML;
    var hideGameOver = el.gameOver && !el.gameOver.classList.contains('hidden');

    closeModal(el.modalShare);
    btn.classList.add('is-loading');
    btn.disabled = true;

    if (hideGameOver) {
      el.gameOver.classList.add('hidden');
    }

    setTimeout(function () {
      captureScoreboardImage()
        .then(function (blob) {
          return shareImageBlob(blob);
        })
        .catch(function () {
          alert('Não foi possível gerar a imagem do placar.');
        })
        .then(function () {
          if (hideGameOver && state.gameOver) {
            el.gameOver.classList.remove('hidden');
          }
          btn.classList.remove('is-loading');
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        });
    }, 200);
  }

  function copyShareUrl(feedbackEl) {
    var url = getShareUrl();
    var btn = feedbackEl || el.btnCopyUrl;

    function showCopied() {
      var original = btn.textContent;
      btn.textContent = 'Copiado!';
      setTimeout(function () { btn.textContent = original; }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showCopied);
    } else {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopied();
      } catch (e) { /* silencioso */ }
      document.body.removeChild(ta);
    }
  }

  function setShareUrls() {
    var url = getShareUrl();
    el.shareUrl.textContent = url;
    if (el.shareUrlMobile) el.shareUrlMobile.textContent = url;
  }

  /* --------------------------------------------------------------------------
     PWA: Service Worker e instalação
     -------------------------------------------------------------------------- */
  /* --------------------------------------------------------------------------
     PWA: detecção de plataforma e instalação
     -------------------------------------------------------------------------- */
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isMobile() {
    return isIOS() || isAndroid() ||
      (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }

  function isInstalled() {
    if (window.navigator.standalone === true) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
    return false;
  }

  function canNativeInstall() {
    return !!deferredInstallPrompt;
  }

  function updateInstallSection() {
    var installed = isInstalled();
    var mobile = isMobile();
    var native = canNativeInstall();

    el.installAlready.classList.toggle('hidden', !installed);
    el.btnInstallNative.classList.toggle('hidden', installed || !native);
    el.installStepsIos.classList.add('hidden');
    el.installStepsAndroid.classList.add('hidden');
    el.installNoteDesktop.classList.add('hidden');

    if (installed) {
      el.installIntro.classList.add('hidden');
      return;
    }

    el.installIntro.classList.remove('hidden');

    if (mobile && native) {
      el.installIntro.textContent = 'Toque no botão abaixo para instalar o placar na tela inicial.';
    } else if (mobile && isIOS()) {
      el.installIntro.textContent = 'Siga os passos para adicionar o placar à tela inicial do iPhone:';
      el.installStepsIos.classList.remove('hidden');
    } else if (mobile && isAndroid()) {
      el.installIntro.textContent = 'Siga os passos para instalar o placar no Android:';
      el.installStepsAndroid.classList.remove('hidden');
    } else {
      el.installIntro.textContent = 'Abra o link no celular e instale para usar em tela cheia e offline.';
      el.installNoteDesktop.classList.remove('hidden');
    }
  }

  function updateInstallUI() {
    var installed = isInstalled();
    var showShortcut = !installed && (isMobile() || canNativeInstall());

    el.btnInstall.classList.toggle('hidden', !showShortcut);
    updateInstallSection();
    updateInstallBanner();
  }

  function updateInstallBanner() {
    if (!el.installBanner) return;

    var dismissed = false;
    try {
      dismissed = localStorage.getItem(INSTALL_BANNER_KEY) === '1';
    } catch (e) { /* modo privado */ }

    var show = isMobile() && !isInstalled() && !dismissed;
    el.installBanner.classList.toggle('hidden', !show);
  }

  function dismissInstallBanner() {
    try {
      localStorage.setItem(INSTALL_BANNER_KEY, '1');
    } catch (e) { /* silencioso */ }
    el.installBanner.classList.add('hidden');
  }

  function triggerNativeInstall() {
    if (!deferredInstallPrompt) return false;

    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function (choice) {
      deferredInstallPrompt = null;
      if (choice.outcome === 'accepted') {
        updateInstallUI();
      }
    });
    return true;
  }

  function handleInstallClick() {
    if (isInstalled()) {
      openShareModal();
      return;
    }

    if (triggerNativeInstall()) return;

    /* iOS / Android sem prompt nativo: abre modal com instruções */
    openShareModal(true);
  }

  function openShareModal(focusInstall) {
    var title = document.getElementById('share-title');
    if (title) {
      if (focusInstall) {
        title.textContent = 'Instalar app';
      } else if (isMobile()) {
        title.textContent = 'Compartilhar e instalar';
      } else {
        title.textContent = 'Compartilhar';
      }
    }

    setShareUrls();
    if (!isMobile()) {
      renderQRCode();
    }
    updateInstallSection();
    openModal(el.modalShare);

    if (focusInstall && el.shareInstallSection) {
      setTimeout(function () {
        el.shareInstallSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {
        /* Falha silenciosa — app funciona sem SW */
      });
    });
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      updateInstallUI();
    });

    window.addEventListener('appinstalled', function () {
      deferredInstallPrompt = null;
      dismissInstallBanner();
      updateInstallUI();
    });

    el.btnInstall.addEventListener('click', handleInstallClick);

    if (el.btnInstallNative) {
      el.btnInstallNative.addEventListener('click', handleInstallClick);
    }

    if (el.btnBannerInstall) {
      el.btnBannerInstall.addEventListener('click', handleInstallClick);
    }

    if (el.btnBannerDismiss) {
      el.btnBannerDismiss.addEventListener('click', dismissInstallBanner);
    }

    updateInstallUI();
  }

  /* --------------------------------------------------------------------------
     Event listeners da UI
     -------------------------------------------------------------------------- */
  function bindUI() {
    setupTeamGestures(el.teamA, 'a');
    setupTeamGestures(el.teamB, 'b');

    el.btnReset.addEventListener('click', function () { resetMatch(); });

    el.btnSettings.addEventListener('click', function () {
      syncSettingsForm();
      openModal(el.modalSettings);
    });

    el.btnSaveSettings.addEventListener('click', function () {
      readSettingsForm();
      closeModal(el.modalSettings);
    });

    el.btnShare.addEventListener('click', function () {
      openShareModal(false);
    });

    el.btnCopyUrl.addEventListener('click', function () { copyShareUrl(el.btnCopyUrl); });

    if (el.btnCopyUrlMobile) {
      el.btnCopyUrlMobile.addEventListener('click', function () { copyShareUrl(el.btnCopyUrlMobile); });
    }

    if (el.btnWhatsapp) {
      el.btnWhatsapp.addEventListener('click', shareOnWhatsApp);
    }

    if (el.btnWhatsappMobile) {
      el.btnWhatsappMobile.addEventListener('click', shareOnWhatsApp);
    }

    if (el.btnShareImage) {
      el.btnShareImage.addEventListener('click', function () {
        shareScoreboardAsImage(el.btnShareImage);
      });
    }

    if (el.btnShareImageWin) {
      el.btnShareImageWin.addEventListener('click', function () {
        shareScoreboardAsImage(el.btnShareImageWin);
      });
    }

    if (el.btnResetWin) {
      el.btnResetWin.addEventListener('click', function () {
        resetMatch(true);
      });
    }

    /* Fecha o banner de vitória ao tocar/clicar fora dele */
    document.addEventListener('click', function (e) {
      if (!state.gameOver || state.gameOverOverlayDismissed) return;
      if (el.gameOver.classList.contains('hidden')) return;
      if (Date.now() - gameOverShownAt < 400) return;
      if (el.gameOver.contains(e.target)) return;
      if (e.target.closest('.toolbar') || e.target.closest('.fab-bar')) return;
      dismissGameOverOverlay();
    });

    /* Impede que toque no nome dispare incremento de ponto */
    function blockGestureBubble(btn) {
      btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
      btn.addEventListener('touchend', function (e) { e.stopPropagation(); });
      btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    }
    blockGestureBubble(el.nameA);
    blockGestureBubble(el.nameB);

    /* Editar nome pelo botão no placar */
    el.nameA.addEventListener('click', function (e) {
      e.stopPropagation();
      renameTarget = 'a';
      el.inputRename.value = state.nameA;
      openModal(el.modalRename);
      setTimeout(function () { el.inputRename.focus(); el.inputRename.select(); }, 100);
    });

    el.nameB.addEventListener('click', function (e) {
      e.stopPropagation();
      renameTarget = 'b';
      el.inputRename.value = state.nameB;
      openModal(el.modalRename);
      setTimeout(function () { el.inputRename.focus(); el.inputRename.select(); }, 100);
    });

    el.btnSaveRename.addEventListener('click', function () {
      var val = el.inputRename.value.trim();
      if (renameTarget === 'a') {
        state.nameA = val || 'Time A';
      } else if (renameTarget === 'b') {
        state.nameB = val || 'Time B';
      }
      saveState();
      renderScores();
      closeModal(el.modalRename);
    });

    /* Fechar modais */
    var closeButtons = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closeButtons.length; i++) {
      closeButtons[i].addEventListener('click', function () {
        var id = this.getAttribute('data-close');
        var dialog = document.getElementById(id);
        closeModal(dialog);
      });
    }

    /* Aplica limite e vitória por 2 imediatamente ao alterar nas configurações */
    var limitRadios = document.querySelectorAll('input[name="limit"]');
    var j;
    for (j = 0; j < limitRadios.length; j++) {
      limitRadios[j].addEventListener('change', function () {
        var k;
        for (k = 0; k < limitRadios.length; k++) {
          updateChipSelected(limitRadios[k]);
        }
        applyGameRulesFromForm();
      });
    }

    el.toggleWinByTwo.addEventListener('change', function () {
      applyGameRulesFromForm();
    });

    /* Fechar modal ao clicar fora (backdrop) */
    var modals = [el.modalSettings, el.modalShare, el.modalRename];
    for (var m = 0; m < modals.length; m++) {
      modals[m].addEventListener('click', function (e) {
        if (e.target === this) closeModal(this);
      });
    }
  }

  /* --------------------------------------------------------------------------
     Inicialização
     -------------------------------------------------------------------------- */
  function init() {
    loadState();
    normalizeSettings();
    renderScores();
    checkWinner(true);
    bindUI();
    registerServiceWorker();
    setupInstallPrompt();

    /* Se partida já estava encerrada ao reabrir, não repetir confete */
    if (state.gameOver && state.winner && state.celebration) {
      /* Apenas destaque visual, sem animação automática */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
