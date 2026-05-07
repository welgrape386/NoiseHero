function goMeasure() {
  window.location.href = "measure.html";
}

function countUp(el, target, duration) {
  const start = performance.now();

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

window.onload = () => {
  const dbEl = document.getElementById("main-db");
  if (dbEl) countUp(dbEl, 58, 1500);
};