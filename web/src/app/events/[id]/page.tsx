export const dynamic = 'force-dynamic'

export default function EventPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Event {params.id}</h1>
      {/* TODO: AvailabilityHeatmap — visual grid of attendee availability */}
      {/* TODO: TopWindowCards — top 3 suggested time windows from AI */}
      {/* TODO: AttendeeList — who has/hasn't connected their calendar */}
    </div>
  )
}
