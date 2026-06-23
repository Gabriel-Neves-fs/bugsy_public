import { API_UPLOAD_URL } from "./config";

type ExtensionResponse =
  | {
      ok: true;
      message: string;
      recordingId?: string;
      sourceUrl?: string;
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

type RecordingMessage = {
  target?: string;
  type?: string;
  streamId?: string;
  tabId?: number;
  url?: string;
  recordAudio?: boolean;
  accessToken?: string;
  title?: string;
  description?: string;
};

type LocalRecording = {
  id: string;
  blob: Blob;
  duration: number;
  size: number;
  sourceUrl: string;
  createdAt: string;
};

const START_OFFSCREEN_RECORDING = "START_OFFSCREEN_RECORDING";
const PAUSE_OFFSCREEN_RECORDING = "PAUSE_OFFSCREEN_RECORDING";
const RESUME_OFFSCREEN_RECORDING = "RESUME_OFFSCREEN_RECORDING";
const STOP_OFFSCREEN_RECORDING = "STOP_OFFSCREEN_RECORDING";
const UPLOAD_OFFSCREEN_RECORDING = "UPLOAD_OFFSCREEN_RECORDING";
const GET_OFFSCREEN_RECORDING_PREVIEW = "GET_OFFSCREEN_RECORDING_PREVIEW";
const DATABASE_NAME = "bugsy-recordings";
const DATABASE_VERSION = 1;
const STORE_NAME = "recordings";
const LATEST_RECORDING_ID = "latest";
const VIDEO_BITS_PER_SECOND = 1_500_000;
const MAX_VIDEO_WIDTH = 1_920;
const MAX_VIDEO_HEIGHT = 1_080;
const MAX_VIDEO_FRAME_RATE = 30;

let mediaRecorder: MediaRecorder | undefined;
let mediaStream: MediaStream | undefined;
let audioContext: AudioContext | undefined;
let recordedChunks: Blob[] = [];
let startedAt = 0;
let sourceUrl = "";

chrome.runtime.onMessage.addListener(
  (
    message: RecordingMessage,
    _sender,
    sendResponse: (
      response: ExtensionResponse | UploadRecordingResponse | RecordingPreviewResponse,
    ) => void,
  ) => {
    if (message.target !== "offscreen") {
      return false;
    }

    if (message.type === START_OFFSCREEN_RECORDING) {
      void startRecording(message).then(sendResponse);
      return true;
    }

    if (message.type === PAUSE_OFFSCREEN_RECORDING) {
      sendResponse(pauseRecording());
      return false;
    }

    if (message.type === RESUME_OFFSCREEN_RECORDING) {
      sendResponse(resumeRecording());
      return false;
    }

    if (message.type === STOP_OFFSCREEN_RECORDING) {
      void stopRecording().then(sendResponse);
      return true;
    }

    if (message.type === UPLOAD_OFFSCREEN_RECORDING) {
      void uploadLatestRecording(message).then(sendResponse);
      return true;
    }

    if (message.type === GET_OFFSCREEN_RECORDING_PREVIEW) {
      void getLatestRecordingPreview().then(sendResponse);
      return true;
    }

    return false;
  },
);

async function startRecording(message: RecordingMessage): Promise<ExtensionResponse> {
  if (!message.streamId) {
    return {
      ok: false,
      message: "O fluxo de captura da aba não foi informado.",
    };
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    return {
      ok: false,
      message: "O Bugsy já está gravando.",
    };
  }

  try {
    mediaStream = await getTabMediaStream(message.streamId, message.recordAudio ?? false);
    preserveTabAudio(mediaStream);
    recordedChunks = [];
    startedAt = Date.now();
    sourceUrl = message.url ?? "";

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: getSupportedMimeType(),
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    });

    mediaRecorder.start(1000);

    return {
      ok: true,
      message: "Gravador iniciado.",
      tabId: message.tabId,
      url: message.url,
    };
  } catch {
    releaseMediaStream();

    return {
      ok: false,
      message: "O Bugsy não conseguiu capturar a mídia desta aba.",
    };
  }
}

function pauseRecording(): ExtensionResponse {
  if (!mediaRecorder || mediaRecorder.state !== "recording") {
    return {
      ok: false,
      message: "Não há uma gravação ativa para pausar.",
    };
  }

  mediaRecorder.pause();

  return {
    ok: true,
    message: "Gravação pausada.",
  };
}

function resumeRecording(): ExtensionResponse {
  if (!mediaRecorder || mediaRecorder.state !== "paused") {
    return {
      ok: false,
      message: "Não há uma gravação pausada para retomar.",
    };
  }

  mediaRecorder.resume();

  return {
    ok: true,
    message: "Gravação retomada.",
  };
}

async function stopRecording(): Promise<ExtensionResponse> {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return {
      ok: false,
      message: "Não há uma gravação ativa para parar.",
    };
  }

  const recorder = mediaRecorder;

  return new Promise((resolve) => {
    recorder.addEventListener(
      "stop",
      () => {
        void saveRecording().then(resolve);
      },
      { once: true },
    );

    recorder.stop();
    releaseMediaStream();
  });
}

async function saveRecording(): Promise<ExtensionResponse> {
  const mimeType = getSupportedMimeType();
  const blob = new Blob(recordedChunks, {
    type: mimeType,
  });
  const duration = Math.max(0, Date.now() - startedAt);

  await saveLatestRecording({
    id: LATEST_RECORDING_ID,
    blob,
    duration,
    size: blob.size,
    sourceUrl,
    createdAt: new Date().toISOString(),
  });

  recordedChunks = [];
  mediaRecorder = undefined;

  return {
    ok: true,
    message: "Gravação salva localmente.",
    recordingId: LATEST_RECORDING_ID,
    sourceUrl,
    size: blob.size,
    duration,
  };
}

async function getTabMediaStream(streamId: string, recordAudio: boolean) {
  const constraints = {
    audio: recordAudio
      ? {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          },
        }
      : false,
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(
    constraints as unknown as MediaStreamConstraints,
  );

  await applyVideoQualityConstraints(stream);

  return stream;
}

async function applyVideoQualityConstraints(stream: MediaStream) {
  const videoTrack = stream.getVideoTracks()[0];

  if (!videoTrack) {
    return;
  }

  try {
    await videoTrack.applyConstraints({
      width: { max: MAX_VIDEO_WIDTH },
      height: { max: MAX_VIDEO_HEIGHT },
      frameRate: { max: MAX_VIDEO_FRAME_RATE },
    });
  } catch {
    // Some Chrome environments ignore capture constraints; bitrate still limits file growth.
  }
}

function getSupportedMimeType() {
  const preferredTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

  return preferredTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "video/webm";
}

function releaseMediaStream() {
  mediaStream?.getTracks().forEach((track) => {
    track.stop();
  });
  mediaStream = undefined;

  void audioContext?.close();
  audioContext = undefined;
}

function preserveTabAudio(stream: MediaStream) {
  if (stream.getAudioTracks().length === 0) {
    return;
  }

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(audioContext.destination);
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
    });

    request.addEventListener("success", () => {
      resolve(request.result);
    });

    request.addEventListener("error", () => {
      reject(request.error);
    });
  });
}

async function saveLatestRecording(recording: {
  id: string;
  blob: Blob;
  duration: number;
  size: number;
  sourceUrl: string;
  createdAt: string;
}) {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(recording);
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
  });

  database.close();
}

async function uploadLatestRecording(message: RecordingMessage): Promise<UploadRecordingResponse> {
  if (!message.accessToken) {
    return {
      ok: false,
      message: "O login expirou. Volte ao Bugsy e entre novamente com o Google.",
    };
  }

  const recording = await getLatestRecording();

  if (!recording) {
    return {
      ok: false,
      message: "Nenhuma gravação local foi encontrada para envio.",
    };
  }

  const formData = new FormData();
  formData.set("title", normalizeText(message.title) ?? "Untitled recording");

  const description = normalizeText(message.description);

  if (description) {
    formData.set("description", description);
  }

  formData.set("duration", String(recording.duration));
  formData.set("sourceUrl", recording.sourceUrl);
  formData.set("video", recording.blob, "bugsy-recording.webm");

  const response = await fetch(API_UPLOAD_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${message.accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `O envio falhou com o status ${response.status}.`,
    };
  }

  const body = (await response.json()) as {
    recording?: {
      publicId?: string;
      videoUrl?: string;
    };
  };

  if (!body.recording?.publicId || !body.recording.videoUrl) {
    return {
      ok: false,
      message: "O envio foi concluído, mas a resposta da API está incompleta.",
    };
  }

  return {
    ok: true,
    message: "Gravação enviada.",
    recording: {
      publicId: body.recording.publicId,
      videoUrl: body.recording.videoUrl,
    },
  };
}

async function getLatestRecordingPreview(): Promise<RecordingPreviewResponse> {
  const recording = await getLatestRecording();

  if (!recording) {
    return {
      ok: false,
      message: "Nenhuma gravação local foi encontrada para a prévia.",
    };
  }

  return {
    ok: true,
    message: "Prévia local da gravação carregada.",
    preview: {
      dataUrl: await blobToDataUrl(new Blob([recording.blob], { type: "video/webm" })),
      mimeType: "video/webm",
      duration: recording.duration,
      size: recording.size,
      sourceUrl: recording.sourceUrl,
    },
  };
}

async function getLatestRecording() {
  const database = await openDatabase();

  const recording = await new Promise<LocalRecording | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(LATEST_RECORDING_ID);

    request.addEventListener("success", () => {
      resolve(request.result as LocalRecording | undefined);
    });

    request.addEventListener("error", () => {
      reject(request.error);
    });
  });

  database.close();
  return recording;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(String(reader.result));
    });

    reader.addEventListener("error", () => {
      reject(reader.error);
    });

    reader.readAsDataURL(blob);
  });
}

function normalizeText(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
