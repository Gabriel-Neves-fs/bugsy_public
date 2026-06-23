type ExtensionResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

const TOOLBAR_HOST_ID = "bugsy-recording-toolbar-root";
const PREPARE_TAB_FOR_RECORDING = "PREPARE_TAB_FOR_RECORDING";
const SHOW_RECORDING_TOOLBAR = "SHOW_RECORDING_TOOLBAR";
const PAUSE_RECORDING_SESSION = "PAUSE_RECORDING_SESSION";
const RESUME_RECORDING_SESSION = "RESUME_RECORDING_SESSION";
const STOP_RECORDING_SESSION = "STOP_RECORDING_SESSION";

let timerId: number | undefined;
let startedAt = 0;
let elapsedBeforePause = 0;
let isPaused = false;

chrome.runtime.onMessage.addListener(
  (message: { type?: string }, _sender, sendResponse: (response: ExtensionResponse) => void) => {
    if (message.type === PREPARE_TAB_FOR_RECORDING) {
      console.info("[Bugsy] Content script received recording preparation request.");

      sendResponse({
        ok: true,
        message: "Esta aba está pronta para ser gravada.",
      });

      return false;
    }

    if (message.type === SHOW_RECORDING_TOOLBAR) {
      injectRecordingToolbar();

      sendResponse({
        ok: true,
        message: "Os controles flutuantes estão ativos nesta aba.",
      });

      return false;
    }

    return false;
  },
);

function injectRecordingToolbar() {
  removeRecordingToolbar();

  const host = document.createElement("div");
  host.id = TOOLBAR_HOST_ID;
  document.documentElement.append(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = getToolbarMarkup();

  const timer = shadow.querySelector<HTMLElement>("[data-bugsy-timer]");
  const state = shadow.querySelector<HTMLElement>("[data-bugsy-state]");
  const pauseButton = shadow.querySelector<HTMLButtonElement>("[data-bugsy-pause]");
  const stopButton = shadow.querySelector<HTMLButtonElement>("[data-bugsy-stop]");

  startedAt = Date.now();
  elapsedBeforePause = 0;
  isPaused = false;

  timerId = window.setInterval(() => {
    if (!timer || isPaused) {
      return;
    }

    timer.textContent = formatElapsed(getElapsedMilliseconds());
  }, 250);

  pauseButton?.addEventListener("click", () => {
    if (!pauseButton || !state) {
      return;
    }

    if (isPaused) {
      void resumeRecording(pauseButton, state);
      return;
    }

    void pauseRecording(pauseButton, state);
  });

  stopButton?.addEventListener("click", () => {
    if (!state) {
      return;
    }

    void stopRecording(state, pauseButton, stopButton);
  });
}

async function pauseRecording(pauseButton: HTMLButtonElement, state: HTMLElement) {
  const response = (await chrome.runtime.sendMessage({
    type: PAUSE_RECORDING_SESSION,
  })) as ExtensionResponse;

  if (!response.ok) {
    setToolbarError(state, response.message);
    return;
  }

  elapsedBeforePause += Date.now() - startedAt;
  isPaused = true;
  pauseButton.textContent = "Resume";
  state.textContent = "Pausada";
  state.dataset.state = "paused";
}

async function resumeRecording(pauseButton: HTMLButtonElement, state: HTMLElement) {
  const response = (await chrome.runtime.sendMessage({
    type: RESUME_RECORDING_SESSION,
  })) as ExtensionResponse;

  if (!response.ok) {
    setToolbarError(state, response.message);
    return;
  }

  startedAt = Date.now();
  isPaused = false;
  pauseButton.textContent = "Pause";
  state.textContent = "Gravando";
  state.dataset.state = "recording";
}

async function stopRecording(
  state: HTMLElement,
  pauseButton: HTMLButtonElement | null,
  stopButton: HTMLButtonElement | null,
) {
  pauseButton?.setAttribute("disabled", "true");
  stopButton?.setAttribute("disabled", "true");
  state.textContent = "Salvando";
  state.dataset.state = "saving";

  const response = (await chrome.runtime.sendMessage({
    type: STOP_RECORDING_SESSION,
  })) as ExtensionResponse;

  if (!response.ok) {
    pauseButton?.removeAttribute("disabled");
    stopButton?.removeAttribute("disabled");
    setToolbarError(state, response.message);
    return;
  }

  removeRecordingToolbar();
}

function setToolbarError(state: HTMLElement, message: string) {
  state.textContent = message;
  state.dataset.state = "error";
}

function removeRecordingToolbar() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = undefined;
  }

  document.getElementById(TOOLBAR_HOST_ID)?.remove();
}

function getElapsedMilliseconds() {
  return elapsedBeforePause + Date.now() - startedAt;
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getToolbarMarkup() {
  return `
    <style>
      :host {
        all: initial;
        position: fixed;
        bottom: 18px;
        left: 50%;
        z-index: 2147483647;
        color: #17151b;
        font-family: "Segoe UI", system-ui, sans-serif;
        transform: translateX(-50%);
      }

      * {
        box-sizing: border-box;
      }

      .bugsy-toolbar {
        display: grid;
        grid-template-columns: auto auto auto auto;
        gap: 10px;
        align-items: center;
        min-width: 342px;
        padding: 10px;
        background: #fffdf8;
        border: 1px solid rgb(23 21 27 / 14%);
        border-radius: 10px;
        box-shadow: 0 14px 38px rgb(23 21 27 / 18%);
      }

      .bugsy-brand {
        display: flex;
        gap: 8px;
        align-items: center;
        min-width: 0;
        padding-right: 4px;
      }

      .bugsy-dot {
        width: 10px;
        height: 10px;
        background: #d85a30;
        border-radius: 999px;
        box-shadow: 0 0 0 5px rgb(216 90 48 / 12%);
      }

      .bugsy-name {
        font-size: 13px;
        font-weight: 900;
      }

      .bugsy-state {
        color: #17633b;
        font-size: 12px;
        font-weight: 800;
      }

      .bugsy-state[data-state="paused"] {
        color: #9a541b;
      }

      .bugsy-state[data-state="saving"] {
        color: #714cc5;
      }

      .bugsy-state[data-state="error"] {
        color: #9b1c1c;
      }

      .bugsy-timer {
        min-width: 46px;
        color: #17151b;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        font-weight: 900;
        text-align: center;
      }

      button {
        min-height: 30px;
        padding: 0 10px;
        color: #17151b;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        background: #f6f1e8;
        border: 1px solid rgb(23 21 27 / 12%);
        border-radius: 7px;
      }

      button:hover {
        background: #efe5d7;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.58;
      }

      .bugsy-stop {
        color: #fff8f0;
        background: #d85a30;
        border-color: #bd4827;
      }

      .bugsy-stop:hover {
        background: #bd4827;
      }
    </style>

    <section class="bugsy-toolbar" role="status" aria-live="polite">
      <div class="bugsy-brand">
        <span class="bugsy-dot" aria-hidden="true"></span>
        <span class="bugsy-name">Bugsy</span>
        <span class="bugsy-state" data-bugsy-state data-state="recording">Gravando</span>
      </div>
      <span class="bugsy-timer" data-bugsy-timer>00:00</span>
      <button type="button" data-bugsy-pause>Pause</button>
      <button class="bugsy-stop" type="button" data-bugsy-stop>Stop</button>
    </section>
  `;
}
