"use client";

import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, ImageUp, Loader2, Radio, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

type JeffPhotoDropJobOption = {
  jobId: string;
  customerName: string;
  vehicle: string;
  serviceScope: string;
  jobStage: string;
  owner: string;
};

type JeffPhotoDropFormProps = {
  jobs: JeffPhotoDropJobOption[];
  initialJobId?: string;
  initialSession?: {
    id: string;
    status: string;
    activeJobId?: string;
    activeJobLabel?: string;
    updatedAt: string;
  } | null;
  sessionWarning?: string;
  maxPhotosPerUpload: number;
  uploadPinConfigured: boolean;
};

type UploadResult = {
  success?: boolean;
  assistantSay?: string;
  error?: string;
  data?: {
    photos?: Array<{
      id: string;
      fileName: string;
      label?: string;
      note?: string;
    }>;
    job?: {
      customerName: string;
      vehicle: string;
    };
    session?: {
      sessionId: string;
      activeJobId?: string;
      attachmentStatus?: string;
    } | null;
  };
  warnings?: string[];
};

const PHOTO_LABELS = [
  "Problem area",
  "VIN",
  "Odometer",
  "Scan tool",
  "Part label",
  "Before repair",
  "After repair",
  "Other",
];

async function resizeImage(file: File) {
  if (!file.type.toLowerCase().startsWith("image/")) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image."));
      img.src = imageUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    if (scale >= 1 && file.size < 2_500_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.78);
    });

    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "field-photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function JeffPhotoDropForm({
  jobs,
  initialJobId,
  initialSession,
  sessionWarning,
  maxPhotosPerUpload,
  uploadPinConfigured,
}: JeffPhotoDropFormProps) {
  const [selectedJobId, setSelectedJobId] = useState(
    initialJobId || initialSession?.activeJobId || "",
  );
  const [customerName, setCustomerName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [label, setLabel] = useState(PHOTO_LABELS[0]);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === selectedJobId),
    [jobs, selectedJobId],
  );

  const canSubmit =
    files.length > 0 &&
    !saving &&
    Boolean(initialSession?.id || selectedJobId || customerName.trim() || vehicle.trim()) &&
    (!uploadPinConfigured || pin.trim());

  function updateFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList || []).slice(0, maxPhotosPerUpload);
    setFiles(nextFiles);
    setResult(null);
  }

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setResult(null);

    try {
      const formData = new FormData();
      if (initialSession?.id) formData.set("sessionId", initialSession.id);
      formData.set("jobId", selectedJobId);
      formData.set("customerName", customerName);
      formData.set("vehicle", vehicle);
      formData.set("label", label);
      formData.set("note", note);
      formData.set("uploadedBy", "Simon");
      if (pin) formData.set("pin", pin);

      for (const file of files) {
        formData.append("photos", await resizeImage(file));
      }

      const response = await fetch("/api/al/wrenchready/jeff/photos/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as UploadResult | null;
      if (!response.ok || !data) {
        throw new Error(data?.error || "Photo upload failed.");
      }

      setResult(data);
      if (data.success) {
        setFiles([]);
        setNote("");
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Photo upload failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-5">
      <header className="pb-5">
        <Link href="/jeff" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Jeff
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
          <Camera className="h-3.5 w-3.5" />
          Jeff Photo Drop
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Send job photos to Jeff</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        {initialSession ? (
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {initialSession.activeJobLabel || "Current Jeff call"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Session {initialSession.status}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {sessionWarning ? (
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-foreground">Jeff session expired</p>
            <p className="mt-1 text-sm text-muted-foreground">{sessionWarning}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-border bg-card/70 p-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Active job</span>
            <select
              className="form-input"
              onChange={(event) => setSelectedJobId(event.target.value)}
              value={selectedJobId}
            >
              <option value="">
                {jobs.length > 0 ? "Choose job or identify photo" : "No active jobs loaded"}
              </option>
              {initialSession?.activeJobId &&
              !jobs.some((job) => job.jobId === initialSession.activeJobId) ? (
                <option value={initialSession.activeJobId}>
                  {initialSession.activeJobLabel || "Current Jeff job"}
                </option>
              ) : null}
              {jobs.map((job) => (
                <option key={job.jobId} value={job.jobId}>
                  {job.customerName} / {job.vehicle}
                </option>
              ))}
            </select>
          </label>

          {selectedJob ? (
            <div className="mt-3 rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{selectedJob.serviceScope}</p>
              <p className="mt-1">{selectedJob.jobStage} / {selectedJob.owner}</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Customer</span>
                <input
                  className="form-input"
                  onChange={(event) => setCustomerName(event.target.value)}
                  value={customerName}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Vehicle</span>
                <input
                  className="form-input"
                  onChange={(event) => setVehicle(event.target.value)}
                  value={vehicle}
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card/70 p-4">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-background/50 px-4 py-6 text-center transition-colors hover:border-primary/60">
            <ImageUp className="h-9 w-9 text-primary" />
            <span className="mt-3 text-sm font-semibold text-foreground">Take or choose photos</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {files.length ? `${files.length} selected` : `Up to ${maxPhotosPerUpload}`}
            </span>
            <input
              accept="image/*"
              className="sr-only"
              multiple
              onChange={(event) => updateFiles(event.target.files)}
              type="file"
            />
          </label>

          {files.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="rounded-lg border border-border bg-background/50 px-3 py-2">
                  {file.name} / {Math.round(file.size / 1024)} KB
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Label</span>
              <select
                className="form-input"
                onChange={(event) => setLabel(event.target.value)}
                value={label}
              >
                {PHOTO_LABELS.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>
            {uploadPinConfigured ? (
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">PIN</span>
                <input
                  className="form-input"
                  inputMode="numeric"
                  onChange={(event) => setPin(event.target.value)}
                  value={pin}
                />
              </label>
            ) : null}
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Note</span>
            <textarea
              className="form-textarea min-h-24"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </label>
        </section>

        {result ? (
          <section className={`rounded-2xl border p-4 ${
            result.success
              ? "border-emerald-500/25 bg-emerald-500/10"
              : "border-red-500/25 bg-red-500/10"
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
              ) : (
                <UploadCloud className="mt-0.5 h-5 w-5 text-red-300" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {result.success ? "Uploaded" : "Not uploaded"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.assistantSay || result.error}
                </p>
                {result.warnings?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">{result.warnings.join(" ")}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="sticky bottom-0 -mx-5 mt-4 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          disabled={!canSubmit}
          onClick={submit}
          type="button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {saving ? "Uploading" : "Upload to Jeff"}
        </button>
      </footer>
    </div>
  );
}
