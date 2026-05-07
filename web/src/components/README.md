# Components

Shared UI components for the Klockn web dashboard.

## Structure

```
components/
├── ui/           # Primitive UI elements (Button, Input, Card, Modal, Badge)
├── events/       # Event-specific components (EventCard, AvailabilityHeatmap, WindowPicker)
├── attendees/    # Attendee list, invite flow, calendar connection status
├── calendar/     # Google/Apple calendar OAuth connect flow
├── charts/       # Availability visualization (heatmap, timeline)
└── layout/       # Navbar, Sidebar, PageHeader
```

## Conventions
- One component per file
- Props interface defined at the top of each file
- No default exports on component files — use named exports
- Tailwind for all styling — no inline styles, no CSS modules
