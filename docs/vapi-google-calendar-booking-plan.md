# Vapi + Google Calendar Booking Plan
### Wrench Ready Mobile dispatcher-grade scheduling system

---

## Objective

Build a voice receptionist that can:

- answer inbound calls
- understand the requested service
- determine how long the appointment should take
- account for travel time between jobs
- avoid double-booking
- offer only valid time slots
- create confirmed bookings in a shared Google Calendar

The target is not "AI that talks well."

The target is:

- a reliable booking system with a voice layer on top

---

## Core principle

Vapi should not be the scheduler.

Vapi should be the conversational front end.

The actual scheduling authority should be Wrench Ready's backend.

### Responsibilities

#### Vapi

- greet caller
- collect missing information
- ask clarifying questions
- read available slots returned by backend
- confirm selected slot

#### Wrench Ready backend

- classify job type
- estimate appointment duration
- calculate buffers
- calculate travel time
- read calendar availability
- hold valid slots
- confirm bookings

#### Google Calendar

- source of truth for technician availability
- shared operations calendar for confirmed appointments

#### Google Maps Routes API

- drive-time truth between appointments and candidate customer locations

---

## What the system must know

Before autonomous scheduling can be trusted, the booking engine needs structured business rules.

### Service durations

Initial planning estimates:

- Battery replacement: 45 minutes
- Oil change: 60 minutes
- Check-engine diagnostics: 75 minutes
- Pre-purchase inspection: 75 minutes
- Brake service: 150 minutes

These should be stored in code and tuned over time.

### Buffer rules

Base buffer:

- 15 minutes before every appointment
- 15 minutes after every appointment

Additional buffers:

- Downtown / difficult parking: +15 minutes
- Unknown diagnosis / vague symptom: +30 minutes
- Apartment / gate / garage complexity: +15 minutes
- New customer with incomplete details: +15 minutes

### Scheduling rules

- Never overlap calendar events
- Never offer a slot that cannot accommodate:
  - travel from previous appointment
  - appointment duration
  - post-appointment buffer
  - travel to next appointment if one exists
- Never promise same-day unless the route and buffer fit
- If the job fit is uncertain, do not auto-book
- If the service is outside the mobile scope, escalate instead of booking

### Territory rules

Launch territory:

- Spokane
- Spokane Valley
- Liberty Lake
- South Hill

The booking engine should reject or flag addresses outside the supported zone.

---

## Recommended system architecture

### API flow

1. Caller speaks to Vapi
2. Vapi gathers:
   - name
   - phone
   - service type or symptom
   - vehicle details
   - service address
   - timing preference
3. Vapi calls backend `availability` tool
4. Backend:
   - estimates duration
   - geocodes address
   - reads calendar events
   - computes travel feasibility
   - returns valid candidate slots
5. Vapi offers slots
6. Caller chooses one
7. Vapi calls backend `book` tool
8. Backend inserts Google Calendar event
9. Backend stores booking record
10. Vapi confirms appointment

---

## Backend tool set

These are the tool actions Vapi should eventually call.

### `estimate_job`

Inputs:

- service type
- free-text symptom
- vehicle
- parking notes

Returns:

- normalized service type
- duration estimate
- confidence score
- whether auto-booking is allowed

### `find_available_slots`

Inputs:

- normalized service type
- address
- desired date range
- duration estimate

Returns:

- valid slots only
- reasons rejected for invalid slots

### `create_booking`

Inputs:

- customer details
- normalized service type
- selected slot
- address
- vehicle
- notes

Returns:

- calendar event id
- confirmed start/end
- confirmation text

### `reschedule_booking`

Inputs:

- booking id
- requested change window

Returns:

- alternate slots
- updated booking if confirmed

### `cancel_booking`

Inputs:

- booking id

Returns:

- cancellation confirmation

---

## Data model

The system needs more than a calendar event.

Suggested booking record fields:

- id
- source (`website`, `phone`, `vapi`)
- status (`new`, `tentative`, `confirmed`, `completed`, `cancelled`)
- customer_name
- customer_phone
- customer_email
- vehicle
- service_type
- symptom_summary
- address_raw
- address_normalized
- lat
- lng
- duration_minutes
- buffer_before_minutes
- buffer_after_minutes
- route_minutes_in
- route_minutes_out
- calendar_event_id
- notes
- created_at
- updated_at

---

## Google Calendar model

Use one shared calendar to start:

- `Wrench Ready Appointments`

Each event should include:

- customer name
- phone
- service type
- vehicle
- address
- notes
- buffer assumptions
- source (`Vapi`, `website`, `manual`)

Later, if the team expands, split into:

- technician calendars
- office / admin calendar

---

## Shared Google Calendar event structure

Suggested title:

- `Brake Service - Jane Smith - Spokane Valley`

Suggested description:

- phone
- email
- full address
- vehicle
- service type
- symptom summary
- source
- booking confidence
- internal notes

---

## Travel-time engine

Travel should be calculated using Google Maps Routes API.

The scheduler should evaluate:

- current day anchor location
- previous appointment end + travel to candidate slot
- candidate slot end + travel to next appointment

The system should not assume fixed city-level travel times.

It should use real route estimates whenever possible.

---

## Confidence and fallback rules

Autonomy should depend on confidence.

### Auto-book if:

- service type is recognized
- duration estimate confidence is high
- address is in territory
- route fit is valid
- slot exists cleanly

### Escalate to human review if:

- service type is unclear
- diagnostic sounds complex
- address cannot be geocoded confidently
- route fit is borderline
- customer asks for special handling
- caller requests work outside supported lanes

Fallback response:

- "I can have the team text you the best options shortly."

That is much better than a wrong booking.

---

## Rollout plan

### Phase 1 - Scheduling foundation

- define service duration rules
- define buffer rules
- define territory rules
- build backend scheduling library
- build calendar integration

### Phase 2 - Assistant-visible slot engine

- implement availability endpoint
- implement booking endpoint
- create shared calendar event format
- store booking records

### Phase 3 - Vapi receptionist

- connect Vapi to backend tools
- tune prompt and escalation behavior
- validate call flows with test scenarios

### Phase 4 - Dispatcher-grade improvements

- travel-aware optimization
- same-day dynamic openings
- hold windows
- rescheduling
- voicemail fallback
- post-call SMS confirmation

---

## External services required

To finish this system, the project will need:

- Vapi account and API key
- Google Cloud project
- Google Calendar API enabled
- Google Maps Routes API enabled
- service account or OAuth flow with access to the shared Google Calendar

Optional but useful:

- geocoding support through Google Maps
- SMS confirmation workflow through Twilio
- booking database beyond ad hoc webhook storage

---

## Immediate build target

The first shipping milestone should be:

- a backend scheduling brain that can return valid slots from a shared Google Calendar using service durations and route-aware buffers

Once that works, connecting Vapi becomes much safer and faster.
