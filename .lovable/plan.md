

# Tracklnd — Full Build Plan
"The Heart of Racing" — Premium track & field meet management and storytelling platform.

Everything will be built with real, complete content — no placeholders, no stubs, no "coming soon."

---

## Phase 1: Design System & Foundation

- **Fonts:** Import Barlow (400–700) and Barlow Condensed (700) from Google Fonts via `index.html`
- **Theme:** Light-only. Update CSS variables: primary to blue-600, set Barlow as default body font, create `.font-display` utility for Barlow Condensed 700
- **Tailwind config:** Extend with brand colors, font families, custom animations (fade-in, slide-up, pulse for live indicator)
- **Logo:** Add uploaded `tracklnd-logo.png` to `/public` for use across the app

## Phase 2: Backend — Lovable Cloud (Supabase)

### Database Schema
- **profiles** table: `id` (uuid FK → auth.users), `display_name` (text), `avatar_url` (text nullable), `role` (text, default 'viewer'), `created_at`, `updated_at`
- **works** table: `id`, `title`, `slug` (unique), `summary`, `body` (text), `cover_image_url`, `work_type` (enum: 'short', 'work', 'feature'), `status` (enum: 'draft', 'published', 'archived'), `author_id` (FK → profiles), `tags` (text[]), `published_at`, `created_at`, `updated_at`
- **meets** table: `id`, `name`, `slug` (unique), `description`, `hero_image_url`, `start_date`, `end_date`, `venue`, `location`, `status` (enum: 'draft', 'upcoming', 'live', 'archived'), `broadcast_url`, `broadcast_partner`, `cta_label`, `cta_url`, `created_at`, `updated_at`
- **events** table: `id`, `meet_id` (FK), `name`, `gender` (enum: 'men', 'women', 'mixed'), `round` (text), `scheduled_time`, `status` (enum: 'scheduled', 'in_progress', 'complete'), `sort_order`, `created_at`
- **athletes** table: `id`, `full_name`, `country_code`, `country_flag` (emoji), `team`, `created_at`
- **event_entries** table: `id`, `event_id` (FK), `athlete_id` (FK), `place` (int nullable), `result` (text nullable), `is_pb` (boolean default false)
- **banners** table: `id`, `title`, `subtitle`, `image_url`, `cta_label`, `cta_url`, `is_active` (boolean), `placement` (enum: 'homepage', 'meet'), `meet_id` (FK nullable), `created_at`
- **newsletter_subscribers** table: `id`, `email` (unique), `subscribed_at`

### Auth & Triggers
- Supabase Auth with email + password
- Database trigger: auto-create profile row on `auth.users` insert with default role `viewer`
- RLS policies on all tables (profiles read by owner, works/meets public read for published, admin write access)
- Seed first user as admin via role update

### Seed Data (Complete & Realistic)
All seed data will be fully written — real-sounding names, dates, times, and content:

**Meets:**
- "Portland Track Festival" (status: live, June 14–15 2025, Hayward Field, Eugene OR, broadcast: TrackTown TV)
- "Rose City Invitational" (status: upcoming, July 12 2025, Duniway Park, Portland OR)
- "Pacific Northwest Championships" (status: upcoming, August 2–3 2025, Husky Stadium, Seattle WA)
- "Cascade Classic" (status: archived, May 10 2025, Mt. Hood CC, Gresham OR)

**Events (Portland Track Festival — 8 events):**
- Men's 100m Final, Women's 800m Final, Men's 1500m Heat 1, Women's 200m Semifinal, Mixed 4x400m Relay, Men's 5000m Final, Women's 100m Hurdles Final, Men's High Jump Final
- Each with 4–8 athletes with realistic names, countries, teams, times/marks, PB flags, and places for completed events

**Works (12 pieces):**
- 4 Shorts: "Track Season Opens with a Bang," "Weekend Recap: Rain Can't Stop Portland," "Five Rookies to Watch This Summer," "The Art of the Relay Exchange"
- 4 Works: "Portland Track Festival Preview: What to Expect," "Rose City Rising: Portland's Track Renaissance," "Behind the Blocks: Race Day Rituals," "The Coaches Who Shape Champions"
- 4 Features: "Chasing Wind: The Story of Marcus Chen," "From Trails to Track: Oregon's Running DNA," "The 800 Meters: Why It's the Hardest Race," "Building a Meet from Scratch"
- Each with full title, real summary text, 3–5 paragraphs of body content, tags, author, published dates, and cover image URLs (using Unsplash track & field photos)

**Banner:** Active homepage banner with title "The Heart of Racing," subtitle about Tracklnd's mission, CTA "Explore Our Coverage"

## Phase 3: Auth Context & Guards

- `AuthContext.tsx`: Full context provider with `login()`, `signup(displayName)`, `logout()`, `user`, `profile`, `loading`, `isAuthenticated`, `isAdmin`
- `ProtectedRoute.tsx`: Redirects to `/login` if not authenticated (with loading spinner)
- `AdminRoute.tsx`: Redirects to `/dashboard/overview` if not admin
- Profile fetching with real-time subscription to auth state changes

## Phase 4: Layouts

### PublicLayout
- **Navbar:** Sticky white bar, logo image (120px wide), nav links (Meets, Works) with hover underline animation, Sign In button (or user avatar dropdown if authenticated with links to Dashboard, Account, Sign Out)
- **Footer:** Full-viewport `bg-black` breaking out of container. Logo (inverted white via CSS filter), "The Heart of Racing" tagline, Instagram link (@tracklandia), email (hello@tracklnd.com), MapPin + "Portland, OR", © 2025 Tracklnd. Single row desktop, stacked mobile.

### DashboardLayout
- **Sidebar:** Collapsible (wide with labels ↔ narrow icon-only). Items: Overview (LayoutDashboard), Meets (Calendar), Content (FileText), Users (UserCog, admin-only), Banners (Image, admin-only). Active state with blue-600 highlight. Bottom: user avatar + display name + role badge. Toggle button to collapse/expand. Mobile: hamburger overlay with backdrop.
- **Top bar:** Current page title (left). Right side: live meet indicator (pulsing red dot + "LIVE: Portland Track Festival" text, clickable → `/dashboard/meets`) + user avatar dropdown (Account, Sign Out).

## Phase 5: Public Pages (Fully Built)

### Homepage `/`
1. **Hero Banner:** Full-bleed cinematic section with gradient overlay on background image, "The Heart of Racing" display heading, subtitle about Tracklnd's mission, "Explore Our Coverage" CTA button. Pulled from banners table.
2. **Weekly Shorts Carousel:** "Weekly Shorts" section header + "View all →". Embla carousel with auto-play, cover images filling each slide, title + date overlaid with text shadow. Inline newsletter CTA: "Get Weekly Shorts in your inbox" with email input + "Subscribe" button styled in blue.
3. **Upcoming Meets:** Conditionally rendered. Cards with meet name, formatted date, venue + location, status badge (color-coded). "Upcoming Meets" header + "View all →".
4. **Recent Works Carousel:** Horizontal carousel of work/feature posts. Large cover image cards with title, summary excerpt, author name, formatted date. "Recent Works" header + "View all →".
5. **About Us:** Display font tagline "Our motley crew is creating the Modern Home of Racing" + a real paragraph about Tracklnd's mission to elevate track & field storytelling.

### Meets Listing `/meets`
- Page hero with "Meets" title and subtitle
- Filter pills: All, Upcoming, Live, Archived
- Responsive card grid (3-col desktop, 2 tablet, 1 mobile). Each card: hero image with gradient overlay, meet name, date range, venue, status badge. Links to `/meets/:slug`.

### Meet Detail `/meets/:slug`
1. **Hero Banner:** Full-bleed image with dark gradient overlay. Meet name in display font, date range, venue + location, status badge (with pulsing animation if live), CTA button if configured.
2. **Meet Info:** Description paragraphs. Broadcast card (if broadcast info exists): partner name, "Watch Live" button with external link icon, styled as a highlighted callout with a subtle background.
3. **Events Accordion:** Grouped list of events. Each row: event name, gender icon/label, round info, scheduled time, status badge, entry count. Expandable to reveal athlete table: columns for Place (#), Athlete, Country (flag emoji), Team, Result (monospace JetBrains Mono font), PB indicator. Gold/silver/bronze medal emoji + row highlighting for top 3 in completed events. Realistic data throughout.

### Works Gallery `/works`
- Filter bar: All / Shorts / Works / Features as toggle pills with counts
- Editorial masonry-style grid with mixed card sizes (feature cards span 2 columns, shorts are smaller). Each card: cover image filling the card, title overlaid at bottom with gradient, type badge, date. Hover effect: slight scale + shadow.
- URL query param filtering (`?type=short`)

### Work Detail `/works/:slug`
- Full-width cover image hero with gradient fade at bottom
- Content area: Type badge + formatted date + author name, title in display font, summary as lead paragraph (larger text), full body text with proper paragraph spacing, tags as pills at the bottom
- "More Works" section at bottom with 3 related cards

### Login `/login`
- Centered card on light gray background, logo at top, "Welcome back" heading, "Sign in to your account" subtext, email input, password input, blue "Sign In" button with loading spinner, "Don't have an account? Sign up" link, error toast on failure, redirect to `/dashboard` on success

### Signup `/signup`
- Same card layout: logo, "Create your account" heading, display name + email + password + confirm password inputs, validation (passwords match, all required, email format), blue "Create Account" button, "Already have an account? Sign in" link, redirect to `/dashboard` on success

### Account `/account`
- PublicLayout, auth-gated. Profile card with avatar (or initials fallback), display name, email (read-only), role badge. Edit form for display_name with save button. "Sign Out" button (destructive variant).

## Phase 6: Dashboard Pages (Fully Built)

### Overview `/dashboard/overview`
- Welcome message with user's display name
- 4 stat cards: Live Meets (1, with pulsing dot), Upcoming Meets (2), Total Events (24), Published Works (12) — real counts from seed data
- Two-column layout below: Left — "Upcoming Schedule" with next 5 events across all meets (event name, meet name, date/time). Right — "Recent Works" list with latest 5 published works (title, type badge, published date). All items clickable.

### Meets `/dashboard/meets`
- Stat cards: Total Meets (4), Live (1), Upcoming (2), Archived (1)
- Filter pills: All, Live, Upcoming, Draft, Archived
- Table/list of meets: name, dates, venue, status badge, event count, action buttons (View, Edit). Each row links to a meet detail/edit view.
- "Create Meet" button (primary, top right)

### Content `/dashboard/content`
- Stat cards: Total Works (12), Published (12), Drafts (0), by type breakdown
- Filter row: Type filter (All/Shorts/Works/Features) + Status filter (All/Published/Draft/Archived)
- Table of works: cover image thumbnail, title, type badge, status badge, author, published date, actions (View, Edit)
- "Create Work" button (primary, top right)

### Users `/dashboard/users` (admin-only)
- Stat cards: Total Users, Admins, Viewers
- User table: avatar, display name, email, role badge (admin=blue, viewer=gray), joined date, actions dropdown
- Clean and functional

### Banners `/dashboard/banners` (admin-only)
- List of banners with: thumbnail, title, placement badge (homepage/meet), active status toggle, associated meet (if any), actions
- "Create Banner" button
- Active banner highlighted

## Phase 7: Responsive & Polish

- All pages responsive: desktop (3+ columns), tablet (2 columns), mobile (single column stack)
- Sidebar collapses to hamburger on mobile with slide-over overlay
- Carousels are touch-swipeable on mobile
- Smooth page transitions, hover states on all interactive elements
- Loading skeletons for data-fetching states
- Consistent spacing, typography hierarchy, and blue accent usage throughout

