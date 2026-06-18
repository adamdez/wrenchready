"use client";

import { KeyRound, LocateFixed, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fieldSafeJeffNotice } from "@/lib/jeff-field-assistant/conversation-filters";

export const JEFF_FIELD_APP_PIN_STORAGE_KEY = "wrenchready.jeff.fieldAppPin";

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

type JeffShareLocationButtonProps = {
  allowPinEntry?: boolean;
  buttonClassName?: string;
  jobId?: string;
  jobLabel?: string;
  label?: string;
  pin?: string;
  pinRequired?: boolean;
  sharingLabel?: string;
  source?: string;
};

const DEFAULT_BUTTON_CLASS = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#1677ff] disabled:text-black/35";

function pinHeaders(pin?: string): Record<string, string> {
  return pin ? { "X-Jeff-App-Pin": pin } : {};
}

export function JeffShareLocationButton({
  allowPinEntry = false,
  buttonClassName = DEFAULT_BUTTON_CLASS,
  jobId,
  jobLabel,
  label = "Share Location",
  pin,
  pinRequired = false,
  sharingLabel = "Sharing location",
  source = "jeff-app",
}: JeffShareLocationButtonProps) {
  const [savedPin, setSavedPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [needsPin, setNeedsPin] = useState(false);
  const [notice, setNotice] = useState("");
  const [sharingLocation, setSharingLocation] = useState(false);
  const effectivePin = pin || savedPin;
  const displayNotice = fieldSafeJeffNotice(notice);
  const headers = useMemo(() => pinHeaders(pinRequired ? effectivePin : undefined), [effectivePin, pinRequired]);

  useEffect(() => {
    if (!pinRequired || pin) return;
    const storedPin = window.localStorage.getItem(JEFF_FIELD_APP_PIN_STORAGE_KEY);
    if (storedPin) setSavedPin(storedPin);
  }, [pin, pinRequired]);

  function saveInlinePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = pinInput.trim();
    if (!trimmed) return;

    setSavedPin(trimmed);
    window.localStorage.setItem(JEFF_FIELD_APP_PIN_STORAGE_KEY, trimmed);
    setPinInput("");
    setNeedsPin(false);
    setNotice("PIN saved. Tap Share Location.");
  }

  async function shareLocation() {
    if (pinRequired && !effectivePin) {
      setNeedsPin(true);
      setNotice("Enter the field app PIN to share location.");
      return;
    }

    if (!navigator.geolocation) {
      setNotice("This phone/browser does not support location sharing.");
      return;
    }

    setSharingLocation(true);
    setNotice("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...headers,
          };
          const response = await fetch("/api/al/wrenchready/jeff/location/check-in", {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              jobId,
              jobLabel,
              source,
            }),
          });
          const data = (await response.json().catch(() => null)) as LocationResult | null;
          if (!response.ok || !data?.success) {
            if (response.status === 401) {
              window.localStorage.removeItem(JEFF_FIELD_APP_PIN_STORAGE_KEY);
              setSavedPin("");
              setNeedsPin(true);
            }
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
    <div className="grid gap-2">
      {pinRequired && allowPinEntry && !effectivePin && needsPin ? (
        <form className="flex gap-2" onSubmit={saveInlinePin}>
          <input
            autoComplete="current-password"
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm text-foreground outline-none"
            inputMode="numeric"
            onChange={(event) => setPinInput(event.target.value)}
            placeholder="PIN"
            type="password"
            value={pinInput}
          />
          <button
            aria-label="Save Jeff PIN"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:bg-black/15"
            disabled={!pinInput.trim()}
            title="Save Jeff PIN"
            type="submit"
          >
            <KeyRound className="h-4 w-4" />
          </button>
        </form>
      ) : null}

      <button
        aria-label={label}
        className={buttonClassName}
        disabled={sharingLocation}
        onClick={shareLocation}
        type="button"
      >
        {sharingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        {sharingLocation ? sharingLabel : label}
      </button>

      {displayNotice ? (
        <p aria-live="polite" className="text-center text-[11px] text-muted-foreground">
          {displayNotice}
        </p>
      ) : null}
    </div>
  );
}
