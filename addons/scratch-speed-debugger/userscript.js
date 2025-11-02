export default async function ({ addon, console, msg }) {
  const controlsContainer = await addon.tab.waitForElement(
    "[class*='controls_controls-container']",
    {
      markAsSeen: true,
      reduxEvents: [
        "scratch-gui/mode/SET_PLAYER",
        "fontsLoaded/SET_FONTS_LOADED",
      ],
    }
  );

  const sliderContainer = document.createElement("div");
  sliderContainer.className = addon.tab.scratchClass("controls_controls-container") + " sa-speed-slider-container";

  const label = document.createElement("span");
  label.className = "sa-speed-label";
  label.textContent = msg("speed");

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = addon.settings.get("minSpeed");
  slider.max = addon.settings.get("maxSpeed");
  slider.value = "100";
  slider.step = "10";
  slider.className = "sa-speed-slider";

  let valueDisplay;
  if (addon.settings.get("showPercentage")) {
    valueDisplay = document.createElement("span");
    valueDisplay.className = "sa-speed-value";
    valueDisplay.textContent = "100%";
  }

  sliderContainer.appendChild(label);
  sliderContainer.appendChild(slider);
  if (valueDisplay) {
    sliderContainer.appendChild(valueDisplay);
  }

  controlsContainer.insertBefore(sliderContainer, controlsContainer.firstChild);

  let originalStepTime = null;

  function setSpeed(speedPercent) {
    const vm = addon.tab.traps.vm;
    if (!vm || !vm.runtime) return;

    const speedMultiplier = speedPercent / 100;

    if (originalStepTime === null && vm.runtime.currentStepTime) {
      originalStepTime = vm.runtime.currentStepTime;
    }

    vm.runtime.currentStepTime = (originalStepTime || 1) / speedMultiplier;

    console.log(`Speed set to ${speedPercent}% (${speedMultiplier}x)`);
  }

  slider.addEventListener("input", (e) => {
    const speed = parseInt(e.target.value);
    if (valueDisplay) {
      valueDisplay.textContent = `${speed}%`;
    }
    setSpeed(speed);
  });

  addon.settings.addEventListener("change", () => {
    slider.min = addon.settings.get("minSpeed");
    slider.max = addon.settings.get("maxSpeed");
    
    if (addon.settings.get("showPercentage")) {
      if (!valueDisplay) {
        valueDisplay = document.createElement("span");
        valueDisplay.className = "sa-speed-value";
        valueDisplay.textContent = `${slider.value}%`;
        sliderContainer.appendChild(valueDisplay);
      }
    } else {
      if (valueDisplay) {
        valueDisplay.remove();
        valueDisplay = null;
      }
    }
  });

  while (true) {
    await addon.tab.waitForElement("[class*='controls_controls-container']", {
      markAsSeen: true,
      reduxEvents: [
        "scratch-gui/mode/SET_PLAYER",
        "fontsLoaded/SET_FONTS_LOADED",
      ],
    });
    
    if (!document.querySelector(".sa-speed-slider-container")) {
      const newControlsContainer = document.querySelector("[class*='controls_controls-container']");
      if (newControlsContainer) {
        newControlsContainer.insertBefore(sliderContainer, newControlsContainer.firstChild);
      }
    }
  }
}
