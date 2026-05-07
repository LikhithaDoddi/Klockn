// Event creation wizard — Step 1 of the Klockn core flow
// Organizer fills in event details and uploads attendee list
// On submit → POST /api/events → redirects to /events/[id]/waiting

export default function CreateEventPage() {
  return (
    <div>
      <h1>Create Event</h1>
      {/* Step 1: Event name, description, rough date range */}
      {/* Step 2: Upload attendee list (CSV or manual email entry) */}
      {/* Step 3: Review and send invites */}
    </div>
  )
}
