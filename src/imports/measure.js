// Count Up Animation

function countUp(el, target, duration) {

  const start = performance.now();

  const update = (now) => {

    const progress = Math.min((now - start) / duration, 1);

    const ease = 1 - Math.pow(1 - progress, 3);

    el.textContent = Math.round(ease * target);

    if (progress < 1) {
      requestAnimationFrame(update);
    }

  };

  requestAnimationFrame(update);

}

window.addEventListener("load", () => {

  const gaugeValue = document.getElementById("gauge-val");

  countUp(gaugeValue, 62, 2000);

});

// Toggle Interaction

const pills = document.querySelectorAll(".toggle-pill");

pills.forEach((pill) => {

  pill.addEventListener("click", () => {

    pills.forEach((item) => {
      item.classList.remove("active");
      item.classList.add("inactive");
    });

    pill.classList.remove("inactive");
    pill.classList.add("active");

  });

});