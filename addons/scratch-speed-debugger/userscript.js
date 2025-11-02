export default async function ({ addon, console, msg }) {
  const vm = addon.tab.traps.vm;
  
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
  sliderContainer.className = "sa-speed-slider-container";

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

  let valueDisplay = null;
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

  controlsContainer.appendChild(sliderContainer);

  let currentSpeed = 1;
  let frameCounter = 0;

  const originalStepThreads = vm.runtime.sequencer.stepThreads.bind(vm.runtime.sequencer);
  
  vm.runtime.sequencer.stepThreads = function () {
    const speed = currentSpeed;
    
    if (speed >= 1) {
      const stepsToRun = Math.floor(speed);
      for (let i = 0; i < stepsToRun; i++) {
        originalStepThreads();
      }
    } else if (speed > 0) {
      frameCounter++;
      const frameInterval = Math.round(1 / speed);
      if (frameCounter >= frameInterval) {
        originalStepThreads();
        frameCounter = 0;
      }
    } else {
      originalStepThreads();
    }
  };

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (vm.runtime.audioEngine && vm.runtime.audioEngine.audioContext) {
    const originalCreateBufferSource = vm.runtime.audioEngine.audioContext.createBufferSource.bind(
      vm.runtime.audioEngine.audioContext
    );
    
    vm.runtime.audioEngine.audioContext.createBufferSource = function () {
      const source = originalCreateBufferSource();
      const originalStart = source.start ? source.start.bind(source) : source.noteOn.bind(source);
      
      const startWrapper = function (...args) {
        if (source.playbackRate) {
          source.playbackRate.value = currentSpeed;
        }
        return originalStart(...args);
      };
      
      if (source.start) {
        source.start = startWrapper;
      } else {
        source.noteOn = startWrapper;
      }
      
      return source;
    };
  }

  function setSpeed(speedPercent) {
    currentSpeed = speedPercent / 100;
    frameCounter = 0;
    console.log(`Execution speed set to ${speedPercent}% (${currentSpeed}x)`);
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
      if (valueDisplay && valueDisplay.parentNode) {
        valueDisplay.remove();
        valueDisplay = null;
      }
    }
  });

  setSpeed(100);

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
        newControlsContainer.appendChild(sliderContainer);
      }
    }
  }
}
