

# Add Events & Athletes to All Meets

The Meet Detail page code is complete and functional. The issue is that only the "Portland Track Festival" has seed data for events and athletes. The other three meets show an empty Events section.

## What needs to happen

Insert seed data for the remaining 3 meets so every meet detail page has a fully populated events accordion:

### Rose City Invitational (upcoming — July 12, 2025)
Since this meet is "upcoming," all events will have status `scheduled` with athlete entries but no results yet (no places, no times). This demonstrates the "entry list" view.

- Women's 100m — Heat 1 (scheduled, 5 athletes)
- Men's 400m — Heat 1 (scheduled, 5 athletes)
- Women's 1500m — Final (scheduled, 6 athletes)
- Men's 110m Hurdles — Final (scheduled, 5 athletes)
- Mixed 4x100m Relay — Final (scheduled, 4 athletes)

### Pacific Northwest Championships (upcoming — Aug 2-3, 2025)
Also "upcoming," so all events are `scheduled` with entry lists only.

- Men's 200m — Semifinal (scheduled, 6 athletes)
- Women's 400m Hurdles — Final (scheduled, 5 athletes)
- Men's 800m — Heat 1 (scheduled, 6 athletes)
- Women's Long Jump — Final (scheduled, 5 athletes)
- Men's Shot Put — Final (scheduled, 5 athletes)
- Women's 5000m — Final (scheduled, 6 athletes)

### Cascade Classic (archived — May 10, 2025)
This meet is "archived/complete," so all events will have status `complete` with full results: places, times/marks, and some PB flags. This demonstrates the completed results view with medal styling.

- Men's 100m — Final (complete, 6 athletes with places and times)
- Women's 200m — Final (complete, 6 athletes with places and times)
- Men's 1500m — Final (complete, 5 athletes with places and times)
- Women's 100m Hurdles — Final (complete, 5 athletes with places and times)
- Men's Long Jump — Final (complete, 5 athletes with places and marks)

### Additional athletes
Create ~15 new athletes to populate these events alongside reusing some existing ones. This ensures variety across meets.

## Technical details

- Insert new athletes into the `athletes` table
- Insert new events into the `events` table linked to each meet's ID
- Insert `event_entries` linking athletes to events, with results data for completed meets and NULL results for upcoming meets
- No code changes needed — the MeetDetailPage component already handles all states (scheduled entries without results, completed results with medals, in-progress events)
- All meet IDs are already in the database and will be referenced by slug lookup

