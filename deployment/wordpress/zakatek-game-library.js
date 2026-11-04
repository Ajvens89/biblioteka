(() => {
  'use strict';
  const frame = document.getElementById('zakatek-game-library');
  if (!frame) return;
  const appOrigin = 'https://biblioteka-seven.vercel.app';
  let pending = 0;
  const publishViewport = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      const rect = frame.getBoundingClientRect();
      const viewportTop = window.visualViewport?.offsetTop || 0;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const top = Math.max(rect.top, viewportTop);
      const bottom = Math.min(rect.bottom, viewportTop + viewportHeight);
      const height = Math.min(4000, Math.round(bottom - top));
      if (height < 100 || !frame.contentWindow) return;
      frame.contentWindow.postMessage({
        type: 'zakatek-library:viewport',
        top: Math.max(0, Math.round(top - rect.top)),
        height,
      }, appOrigin);
    });
  };
  window.addEventListener('message', (event) => {
    if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'zakatek-library:resize') return;
    if (!Number.isInteger(data.height) || data.height < 100 || data.height > 40000) return;
    frame.style.height = `${data.height + 2}px`;
    publishViewport();
  });
  frame.addEventListener('load', publishViewport);
  window.addEventListener('resize', publishViewport, {passive: true});
  window.addEventListener('scroll', publishViewport, {passive: true});
  window.visualViewport?.addEventListener('resize', publishViewport, {passive: true});
  window.visualViewport?.addEventListener('scroll', publishViewport, {passive: true});
  publishViewport();
})();
