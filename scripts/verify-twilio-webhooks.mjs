import "./load-local-env.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function postForgedSms() {
  const body = new URLSearchParams({
    From: "+15095550123",
    Body: "Forged webhook probe",
    ProfileName: "Webhook Probe",
  });

  const response = await fetch(`${baseUrl}/api/twilio/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": "definitely-forged",
    },
    body,
  });

  return {
    status: response.status,
    text: await response.text(),
  };
}

const result = await postForgedSms();

assert(
  result.status === 403,
  `Forged Twilio SMS webhook should return 403 with TWILIO_AUTH_TOKEN configured; got ${result.status}. Body: ${result.text.slice(0, 200)}`,
);

console.log(JSON.stringify({
  success: true,
  baseUrl,
  forgedSmsStatus: result.status,
}, null, 2));
