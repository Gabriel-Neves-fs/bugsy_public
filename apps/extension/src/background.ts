import { WEB_NEW_RECORDING_URL } from "./config";

type ExtensionResponse =
  | {
      ok: true;
      message: string;
      sourceUrl?: string;
      recordingId?: string;
      size?: number;
      duration?: number;
      tabId?: number;
      url?: string;
    }
  | {
      ok: false;
      message: string;
    };

type UploadRecordingResponse =
  | {
      ok: true;
      message: string;
      recording: {
        publicId: string;
        videoUrl: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

type RecordingPreviewResponse =
  | {
      ok: true;
      message: string;
      preview: {
        dataUrl: string;
        mimeType: string;
        duration: number;
        size: number;
        sourceUrl: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const START_RECORDING_REQUESTED = "START_RECORDING_REQUESTED";
const START_RECORDING_SESSION = "START_RECORDING_SESSION";
const PREPARE_TAB_FOR_RECORDING = "PREPARE_TAB_FOR_RECORDING";
const SHOW_RECORDING_TOOLBAR = "SHOW_RECORDING_TOOLBAR";
const PAUSE_RECORDING_SESSION = "PAUSE_RECORDING_SESSION";
const RESUME_RECORDING_SESSION = "RESUME_RECORDING_SESSION";
const STOP_RECORDING_SESSION = "STOP_RECORDING_SESSION";
const START_OFFSCREEN_RECORDING = "START_OFFSCREEN_RECORDING";
const PAUSE_OFFSCREEN_RECORDING = "PAUSE_OFFSCREEN_RECORDING";
const RESUME_OFFSCREEN_RECORDING = "RESUME_OFFSCREEN_RECORDING";
const STOP_OFFSCREEN_RECORDING = "STOP_OFFSCREEN_RECORDING";
const UPLOAD_LATEST_RECORDING = "UPLOAD_LATEST_RECORDING";
const UPLOAD_OFFSCREEN_RECORDING = "UPLOAD_OFFSCREEN_RECORDING";
const GET_LATEST_RECORDING_PREVIEW = "GET_LATEST_RECORDING_PREVIEW";
const GET_OFFSCREEN_RECORDING_PREVIEW = "GET_OFFSCREEN_RECORDING_PREVIEW";

let creatingOffscreenDocument: Promise<void> | undefined;

chrome.runtime.onInstalled.addListener(() => {
  console.info("[Bugsy] Extension installed.");
});

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; recordAudio?: boolean },
    _sender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    if (message.type === START_RECORDING_REQUESTED) {
      void handleStartRecordingRequest().then(sendResponse);
      return true;
    }

    if (message.type === START_RECORDING_SESSION) {
      void handleStartRecordingSession({
        recordAudio: message.recordAudio ?? false,
      }).then(sendResponse);
      return true;
    }

    if (message.type === PAUSE_RECORDING_SESSION) {
      void sendOffscreenCommand(PAUSE_OFFSCREEN_RECORDING).then(sendResponse);
      return true;
    }

    if (message.type === RESUME_RECORDING_SESSION) {
      void sendOffscreenCommand(RESUME_OFFSCREEN_RECORDING).then(sendResponse);
      return true;
    }

    if (message.type === STOP_RECORDING_SESSION) {
      void handleStopRecordingSession().then(sendResponse);
      return true;
    }

    return false;
  },
);

chrome.runtime.onMessageExternal.addListener(
  (
    message: { type?: string; title?: string; description?: string; accessToken?: string },
    sender,
    sendResponse: (response: UploadRecordingResponse | RecordingPreviewResponse) => void,
  ) => {
    if (![UPLOAD_LATEST_RECORDING, GET_LATEST_RECORDING_PREVIEW].includes(message.type ?? "")) {
      return false;
    }

    if (!sender.url?.startsWith(WEB_NEW_RECORDING_URL)) {
      sendResponse({
        ok: false,
        message: "O Bugsy rejeitou a origem desta solicitação.",
      });
      return false;
    }

    if (message.type === GET_LATEST_RECORDING_PREVIEW) {
      void handleExternalPreviewRequest().then(sendResponse);
      return true;
    }

    void handleExternalUploadRequest({
      accessToken: message.accessToken,
      title: message.title,
      description: message.description,
    }).then(sendResponse);
    return true;
  },
);

async function handleStartRecordingRequest(): Promise<ExtensionResponse> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id) {
    return {
      ok: false,
      message: "Nenhuma aba ativa foi encontrada.",
    };
  }

  if (!isRecordableTab(activeTab.url)) {
    return {
      ok: false,
      message: "Por enquanto, o Bugsy funciona apenas em abas HTTP ou HTTPS comuns.",
    };
  }

  const response = await sendMessageToTab(activeTab.id, {
    type: PREPARE_TAB_FOR_RECORDING,
  });

  if (!response.ok) {
    return response;
  }

  return {
    ok: true,
    message: "Esta aba está pronta para ser gravada.",
    tabId: activeTab.id,
    url: activeTab.url,
  };
}

async function handleStartRecordingSession(options: { recordAudio: boolean }): Promise<ExtensionResponse> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id) {
    return {
      ok: false,
      message: "Nenhuma aba ativa foi encontrada.",
    };
  }

  if (!isRecordableTab(activeTab.url)) {
    return {
      ok: false,
      message: "Por enquanto, o Bugsy funciona apenas em abas HTTP ou HTTPS comuns.",
    };
  }

  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: activeTab.id,
    });

    await setupOffscreenDocument();

    const recordingResponse = (await chrome.runtime.sendMessage({
      target: "offscreen",
      type: START_OFFSCREEN_RECORDING,
      streamId,
      tabId: activeTab.id,
      url: activeTab.url,
      recordAudio: options.recordAudio,
    })) as ExtensionResponse;

    if (!recordingResponse.ok) {
      return recordingResponse;
    }

    const toolbarResponse = await sendMessageToTab(activeTab.id, {
      type: SHOW_RECORDING_TOOLBAR,
    });

    if (!toolbarResponse.ok) {
      await sendOffscreenCommand(STOP_OFFSCREEN_RECORDING);
      return toolbarResponse;
    }

    return {
      ok: true,
      message: "Gravação iniciada. Use os controles flutuantes para pausar ou parar.",
    };
  } catch {
    return {
      ok: false,
      message: "O Bugsy não conseguiu iniciar a gravação desta aba.",
    };
  }
}

async function sendMessageToTab(tabId: number, message: { type: string }): Promise<ExtensionResponse> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as ExtensionResponse;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: {
          tabId,
        },
        files: ["content.js"],
      });

      return (await chrome.tabs.sendMessage(tabId, message)) as ExtensionResponse;
    } catch {
      return {
        ok: false,
        message: "O Bugsy não conseguiu acessar esta aba. Recarregue a página e tente novamente.",
      };
    }
  }
}

function isRecordableTab(url: string | undefined) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

async function handleStopRecordingSession(): Promise<ExtensionResponse> {
  const response = await sendOffscreenCommand(STOP_OFFSCREEN_RECORDING);

  if (response.ok) {
    await chrome.tabs.create({
      url: buildWebPreviewUrl(response),
    });
  }

  return response;
}

function buildWebPreviewUrl(response: Extract<ExtensionResponse, { ok: true }>) {
  const url = new URL(WEB_NEW_RECORDING_URL);

  url.searchParams.set("source", "extension");

  if (response.recordingId) {
    url.searchParams.set("recordingId", response.recordingId);
  }

  url.searchParams.set("extensionId", chrome.runtime.id);

  if (response.sourceUrl) {
    url.searchParams.set("sourceUrl", response.sourceUrl);
  }

  if (typeof response.duration === "number") {
    url.searchParams.set("duration", String(response.duration));
  }

  if (typeof response.size === "number") {
    url.searchParams.set("size", String(response.size));
  }

  return url.toString();
}

async function handleExternalPreviewRequest(): Promise<RecordingPreviewResponse> {
  await setupOffscreenDocument();

  try {
    const response = (await chrome.runtime.sendMessage({
      target: "offscreen",
      type: GET_OFFSCREEN_RECORDING_PREVIEW,
    })) as RecordingPreviewResponse;

    return response;
  } catch {
    return {
      ok: false,
      message: "O Bugsy não conseguiu carregar a prévia local da gravação.",
    };
  }
}

async function handleExternalUploadRequest(input: {
  accessToken?: string;
  title?: string;
  description?: string;
}): Promise<UploadRecordingResponse> {
  await setupOffscreenDocument();

  try {
    const response = (await chrome.runtime.sendMessage({
      target: "offscreen",
      type: UPLOAD_OFFSCREEN_RECORDING,
      accessToken: input.accessToken,
      title: input.title,
      description: input.description,
    })) as UploadRecordingResponse;

    return response;
  } catch {
    return {
      ok: false,
      message: "O Bugsy não conseguiu acessar o armazenamento local da gravação.",
    };
  }
}

async function sendOffscreenCommand(type: string): Promise<ExtensionResponse> {
  try {
    const response = (await chrome.runtime.sendMessage({
      target: "offscreen",
      type,
    })) as ExtensionResponse;

    return response;
  } catch {
    return {
      ok: false,
      message: "O Bugsy não conseguiu se comunicar com o gravador.",
    };
  }
}

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["USER_MEDIA", "BLOBS"],
      justification: "Gravar a aba ativa e armazenar temporariamente a prévia do vídeo.",
    });
  }

  await creatingOffscreenDocument;
  creatingOffscreenDocument = undefined;
}
