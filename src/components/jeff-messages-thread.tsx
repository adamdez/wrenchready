"use client";

import {
  ArrowLeft,
  FileDown,
  KeyRound,
  LocateFixed,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Phone,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JeffAppThreadMessage } from "@/lib/jeff-field-assistant/app-chat";
import { fieldSafeJeffNotice } from "@/lib/jeff-field-assistant/conversation-filters";

type JobOption = {
  jobId: string;
  customerName: string;
  vehicle: string;
  serviceScope: string;
  jobStage: string;
  owner: string;
};

type JeffMessageAttachment = {
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  url?: string;
};

type SendResult = {
  success?: boolean;
  message?: JeffAppThreadMessage[];
  messages?: JeffAppThreadMessage[];
  jobs?: JobOption[];
  activeJobId?: string;
  activeJobNotice?: string;
  warning?: string;
  warnings?: string[];
  error?: string;
  pinRequired?: boolean;
};

type LocationResult = {
  success?: boolean;
  error?: string;
  location?: {
    checkedInAt: string;
    staleAfterMinutes: number;
    accuracyMeters?: number;
  };
  warning?: string;
};

type JeffMessagesThreadProps = {
  initialMessages: JeffAppThreadMessage[];
  jobs: JobOption[];
  phoneHref: string;
  phoneNumber: string;
  initialWarning?: string;
  initialSelectedJobId?: string;
  pinRequired?: boolean;
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
};

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
};

type SpeechRecognitionErrorLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 2_500_000;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function fileSizeLabel(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function appendDictationText(current: string, next: string) {
  const trimmed = next.trim();
  if (!trimmed) return current;
  const separator = current.trim() ? " " : "";

  return `${current}${separator}${trimmed}`;
}

async function fileToAttachment(file: File): Promise<JeffMessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is too large for Jeff message upload v1.`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });

  return {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    url: dataUrl,
  };
}

export function JeffMessagesThread({
  initialMessages,
  jobs,
  phoneHref,
  phoneNumber,
  initialWarning,
  initialSelectedJobId,
  pinRequired = false,
}: JeffMessagesThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [jobOptions, setJobOptions] = useState(jobs);
  const [selectedJobId, setSelectedJobId] = useState(initialSelectedJobId || "");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<JeffMessageAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [appPin, setAppPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinUnlocked, setPinUnlocked] = useState(!pinRequired);
  const [loadingThread, setLoadingThread] = useState(false);
  const [notice, setNotice] = useState(initialWarning || "");
  const [listening, setListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedJob = useMemo(
    () => jobOptions.find((job) => job.jobId === selectedJobId),
    [jobOptions, selectedJobId],
  );
  const visibleMessages = useMemo(
    () => selectedJobId
      ? messages.filter((message) => message.jobId === selectedJobId)
      : messages,
    [messages, selectedJobId],
  );
  const canSend = !sending && Boolean(text.trim() || attachments.length);
  const displayNotice = fieldSafeJeffNotice(notice);
  const appPinHeaders = useMemo<Record<string, string>>(
    () => {
      const headers: Record<string, string> = {};
      if (pinRequired && appPin) headers["X-Jeff-App-Pin"] = appPin;
      return headers;
    },
    [appPin, pinRequired],
  );

  const resizeComposer = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 96), 160)}px`;
  }, []);

  const loadThread = useCallback(async (pin: string) => {
    setLoadingThread(true);
    setNotice("");
    try {
      const response = await fetch("/api/al/wrenchready/jeff/messages", {
        headers: pinRequired ? { "X-Jeff-App-Pin": pin } : {},
      });
      const data = (await response.json().catch(() => null)) as SendResult | null;
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Jeff PIN failed.");
      }

      setMessages(data.messages || []);
      setJobOptions(data.jobs || []);
      if (data.activeJobId) setSelectedJobId(data.activeJobId);
      setAppPin(pin);
      setPinInput("");
      setPinUnlocked(true);
      setNotice("");
      window.localStorage.setItem("wrenchready.jeff.fieldAppPin", pin);
    } catch (error) {
      window.localStorage.removeItem("wrenchready.jeff.fieldAppPin");
      setAppPin("");
      setPinUnlocked(false);
      setNotice(error instanceof Error ? error.message : "Jeff PIN failed.");
    } finally {
      setLoadingThread(false);
    }
  }, [pinRequired]);

  useEffect(() => {
    if (!pinRequired) return;
    const storedPin = window.localStorage.getItem("wrenchready.jeff.fieldAppPin");
    if (storedPin) void loadThread(storedPin);
  }, [loadThread, pinRequired]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    if (!pinUnlocked) return;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [pinUnlocked, selectedJobId, visibleMessages.length]);

  useEffect(() => {
    resizeComposer(textareaRef.current);
  }, [resizeComposer, text]);

  async function addFiles(files: FileList | null) {
    setNotice("");
    const selected = Array.from(files || []).slice(0, MAX_ATTACHMENTS - attachments.length);
    try {
      const nextAttachments = await Promise.all(selected.map(fileToAttachment));
      setAttachments((current) => [...current, ...nextAttachments].slice(0, MAX_ATTACHMENTS));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach that file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleDictation() {
    if (typeof window === "undefined") return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("This browser does not support mic dictation for Jeff messages.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      const startIndex = event.resultIndex || 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript;
        if (result?.isFinal && transcript) {
          finalText = appendDictationText(finalText, transcript);
        }
      }

      if (finalText) {
        setText((current) => appendDictationText(current, finalText));
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.message || event.error || "Mic dictation stopped.");
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setNotice("");
    setListening(true);

    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      setNotice(error instanceof Error ? error.message : "Mic dictation could not start.");
    }
  }

  async function sendMessage() {
    if (!canSend) return;
    const pendingText = text.trim();
    const pendingAttachments = attachments;
    const timestamp = new Date().toISOString();
    const optimistic: JeffAppThreadMessage = {
      id: `pending-${Date.now()}`,
      role: "simon",
      channel: pendingAttachments.length ? "mms" : "sms",
      text: pendingText || "Sent file attachment",
      timestamp,
      jobId: selectedJob?.jobId,
      jobLabel: selectedJob ? `${selectedJob.customerName} / ${selectedJob.vehicle}` : undefined,
      attachments: pendingAttachments,
    };

    setMessages((current) => [...current, optimistic]);
    setText("");
    setAttachments([]);
    setSending(true);
    setNotice("");

    try {
      const response = await fetch("/api/al/wrenchready/jeff/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...appPinHeaders },
        body: JSON.stringify({
          text: pendingText,
          jobId: selectedJob?.jobId,
          jobLabel: selectedJob ? `${selectedJob.customerName} / ${selectedJob.vehicle}` : undefined,
          attachments: pendingAttachments,
        }),
      });
      const data = (await response.json().catch(() => null)) as SendResult | null;
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Jeff message failed.");
      }

      setMessages((current) => [
        ...current.filter((message) => message.id !== optimistic.id),
        ...(data.message || []),
      ]);
      if (data.warning || data.warnings?.length) setNotice(data.warning || data.warnings?.[0] || "");
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setText(pendingText);
      setAttachments(pendingAttachments);
      setNotice(error instanceof Error ? error.message : "Jeff message failed.");
    } finally {
      setSending(false);
    }
  }

  async function shareLocation() {
    if (!navigator.geolocation) {
      setNotice("This phone/browser does not support location sharing.");
      return;
    }

    setSharingLocation(true);
    setNotice("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/al/wrenchready/jeff/location/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...appPinHeaders },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              jobId: selectedJob?.jobId,
              jobLabel: selectedJob ? `${selectedJob.customerName} / ${selectedJob.vehicle}` : undefined,
              source: "jeff-mobile-thread",
            }),
          });
          const data = (await response.json().catch(() => null)) as LocationResult | null;
          if (!response.ok || !data?.success) {
            throw new Error(data?.error || "Location check-in failed.");
          }

          setNotice(
            `Location shared. Jeff will treat it as fresh for ${data.location?.staleAfterMinutes || 15} minutes.`,
          );
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Location check-in failed.");
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        setNotice(error.message || "Location permission was not granted.");
        setSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  }

  return (
    <main className="min-h-dvh bg-[#f4f4f6] text-[#101114]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f7f7fa] shadow-2xl shadow-black/10">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f7f7fa]/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <a
              aria-label="Back to Jeff"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1677ff]"
              href="/jeff"
              title="Back to Jeff"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div className="min-w-0 text-center">
              <p className="truncate text-base font-semibold">Jeff</p>
              <p className="truncate text-xs text-black/50">phone, messages, files</p>
            </div>
            <a
              aria-label="Call Jeff"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1677ff]"
              href={phoneHref}
              title="Call Jeff"
            >
              <Phone className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-3 grid gap-2">
            <select
              aria-label="Jeff job file"
              className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none"
              onChange={(event) => setSelectedJobId(event.target.value)}
              value={selectedJobId}
            >
              <option value="">No job selected</option>
              {jobOptions.map((job) => (
                <option key={job.jobId} value={job.jobId}>
                  {job.customerName} / {job.vehicle}
                </option>
              ))}
            </select>
            <p className={`text-center text-[11px] ${selectedJob ? "text-emerald-700" : "text-amber-700"}`}>
              {selectedJob
                ? `Job file: ${selectedJob.customerName} / ${selectedJob.vehicle}`
                : "Choose a job when this belongs in a customer file."}
            </p>
            <p className="text-center text-[11px] text-black/45">{phoneNumber}</p>
            <button
              aria-label="Share Simon location"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#1677ff] disabled:text-black/35"
              disabled={sharingLocation}
              onClick={shareLocation}
              type="button"
            >
              {sharingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {sharingLocation ? "Sharing location" : "Share Location"}
            </button>
          </div>
        </header>

        {pinRequired && !pinUnlocked ? (
          <section className="flex flex-1 items-center px-6">
            <form
              className="w-full space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (pinInput.trim()) void loadThread(pinInput.trim());
              }}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1677ff] shadow-sm">
                <KeyRound className="h-6 w-6" />
              </div>
              <div className="space-y-2 text-center">
                <h1 className="text-xl font-semibold">Jeff PIN</h1>
                <p className="text-sm text-black/50">Use the WrenchReady field app PIN.</p>
              </div>
              {displayNotice ? (
                <p
                  aria-live="polite"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
                >
                  {displayNotice}
                </p>
              ) : null}
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-center text-lg outline-none"
                inputMode="numeric"
                onChange={(event) => setPinInput(event.target.value)}
                placeholder="PIN"
                type="password"
                value={pinInput}
              />
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1677ff] text-sm font-semibold text-white disabled:bg-black/15"
                disabled={loadingThread || !pinInput.trim()}
                type="submit"
              >
                {loadingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Open Jeff
              </button>
            </form>
          </section>
        ) : (
          <>
        <section className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {visibleMessages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-[18rem] rounded-2xl bg-white px-4 py-3 text-center text-sm text-black/55 shadow-sm">
              {selectedJob
                ? "No messages are saved in this job file yet. Type below to start."
                : "Message Jeff, attach a scan report, or send photos from the job."}
            </div>
          ) : null}

          {visibleMessages.map((message) => {
            const isSimon = message.role === "simon";
            const isSystem = message.role === "system";
            return (
              <article
                className={`flex ${isSimon ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                <div
                  className={`max-w-[82%] rounded-[1.25rem] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isSimon
                      ? "rounded-br-md bg-[#1683ff] text-white"
                      : isSystem
                        ? "bg-white text-black/60"
                        : "rounded-bl-md bg-[#e9e9ee] text-[#111]"
                  }`}
                >
                  {message.jobLabel ? (
                    <p className={`mb-1 text-[11px] ${isSimon ? "text-white/75" : "text-black/45"}`}>
                      {message.jobLabel}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.attachments?.length ? (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment) => (
                        <a
                          className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs ${
                            isSimon ? "bg-white/15 text-white" : "bg-white text-[#1677ff]"
                          }`}
                          download={attachment.fileName}
                          href={attachment.url || "#"}
                          key={`${message.id}-${attachment.fileName}`}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
                          <span>{fileSizeLabel(attachment.sizeBytes)}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className={`mt-1 text-right text-[10px] ${isSimon ? "text-white/65" : "text-black/40"}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </article>
            );
          })}
          {sending ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[1.25rem] rounded-bl-md bg-[#e9e9ee] px-4 py-2.5 text-sm text-black/55">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Jeff is typing
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </section>

        {displayNotice ? (
          <div className="border-t border-black/10 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {displayNotice}
          </div>
        ) : null}

        {attachments.length > 0 ? (
          <div className="border-t border-black/10 bg-white px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <span
                  className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65"
                  key={attachment.fileName}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span className="truncate">{attachment.fileName}</span>
                  <button
                    className="text-black/45"
                    onClick={() => setAttachments((current) => current.filter((entry) => entry.fileName !== attachment.fileName))}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <footer className="sticky bottom-0 border-t border-black/10 bg-white px-3 py-3">
          <div className="flex items-end gap-2">
            <button
              aria-label="Attach photo or file"
              className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-[#1677ff]"
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo or file"
              type="button"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              accept="image/*,application/pdf,text/plain,.csv,.txt,.pdf"
              hidden
              multiple
              onChange={(event) => addFiles(event.target.files)}
              ref={fileInputRef}
              tabIndex={-1}
              type="file"
            />
            <button
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              className={`mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                listening ? "bg-red-500 text-white" : "bg-black/5 text-[#1677ff]"
              }`}
              onClick={toggleDictation}
              title={listening ? "Stop dictation" : "Start dictation"}
              type="button"
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <textarea
              className="max-h-40 min-h-24 flex-1 resize-none overflow-y-auto rounded-[1.25rem] border border-black/10 bg-[#f7f7fa] px-4 py-3 text-sm leading-5 outline-none"
              onChange={(event) => {
                setText(event.target.value);
                resizeComposer(event.target);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={listening ? "Listening..." : "Message Jeff"}
              ref={textareaRef}
              rows={3}
              value={text}
            />
            <button
              aria-label="Send message"
              className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1677ff] text-white disabled:bg-black/15"
              disabled={!canSend}
              onClick={sendMessage}
              title="Send message"
              type="button"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </footer>
          </>
        )}
      </div>
    </main>
  );
}
