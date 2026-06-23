import "./styles.css";
import { DASHBOARD_URL } from "./config";

type ExtensionResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

const START_RECORDING_REQUESTED = "START_RECORDING_REQUESTED";
const START_RECORDING_SESSION = "START_RECORDING_SESSION";
const COUNTDOWN_SECONDS = 5;

const recordButton = document.querySelector<HTMLButtonElement>("#record-tab-button");
const recordButtonLabel = document.querySelector<HTMLSpanElement>("#record-button-label");
const statusMessage = document.querySelector<HTMLParagraphElement>("#status-message");
const countdownPanel = document.querySelector<HTMLDivElement>("#countdown-panel");
const countdownValue = document.querySelector<HTMLElement>("#countdown-value");
const recordAudioCheckbox = document.querySelector<HTMLInputElement>("#record-audio-checkbox");
const openDashboardButton = document.querySelector<HTMLButtonElement>("#open-dashboard-button");

recordButton?.addEventListener("click", () => {
  void requestRecordingStart();
});

openDashboardButton?.addEventListener("click", () => {
  void openDashboard();
});

async function openDashboard() {
  const [dashboardTab] = await chrome.tabs.query({
    url: `${DASHBOARD_URL}/*`,
  });

  if (dashboardTab?.id) {
    await chrome.tabs.update(dashboardTab.id, {
      active: true,
    });
    await chrome.windows.update(dashboardTab.windowId, {
      focused: true,
    });
  } else {
    await chrome.tabs.create({
      url: DASHBOARD_URL,
    });
  }

  window.close();
}

async function requestRecordingStart() {
  setStatus("Verificando a aba atual...", "pending");
  setButtonDisabled(true);
  setCountdownVisibility(false);

  try {
    const response = (await chrome.runtime.sendMessage({
      type: START_RECORDING_REQUESTED,
    })) as ExtensionResponse;

    if (response.ok) {
      setStatus("Aba verificada. Prepare-se.", "pending");
      await runCountdown();

      const sessionResponse = (await chrome.runtime.sendMessage({
        type: START_RECORDING_SESSION,
        recordAudio: shouldRecordAudio(),
      })) as ExtensionResponse;

      if (sessionResponse.ok) {
        setStatus(sessionResponse.message, "success");
        window.close();
        return;
      }

      setStatus(sessionResponse.message, "error");
      return;
    }

    setStatus(response.message, "error");
  } catch {
    setStatus("O Bugsy não conseguiu se comunicar com o processo da extensão.", "error");
  } finally {
    setCountdownVisibility(false);
    setButtonLabel("Start Recording");
    setButtonDisabled(false);
  }
}

function setButtonDisabled(disabled: boolean) {
  if (!recordButton) {
    return;
  }

  recordButton.disabled = disabled;
  recordAudioCheckbox?.toggleAttribute("disabled", disabled);
}

function shouldRecordAudio() {
  return recordAudioCheckbox?.checked ?? false;
}

async function runCountdown() {
  setCountdownVisibility(true);

  for (let remaining = COUNTDOWN_SECONDS; remaining > 0; remaining -= 1) {
    setCountdownValue(remaining);
    setButtonLabel(`Starting in ${remaining}`);
    await wait(1000);
  }
}

function setButtonLabel(label: string) {
  if (!recordButtonLabel) {
    return;
  }

  recordButtonLabel.textContent = label;
}

function setCountdownVisibility(visible: boolean) {
  if (!countdownPanel) {
    return;
  }

  countdownPanel.hidden = !visible;
}

function setCountdownValue(value: number) {
  if (!countdownValue) {
    return;
  }

  countdownValue.textContent = String(value);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function setStatus(message: string, tone: "idle" | "pending" | "success" | "error") {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}
