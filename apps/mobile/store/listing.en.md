# Store listing — English (en)

Draft for the App Store and Google Play. The domain `tenapp.vn` and bundle id `vn.tenapp.app` are temporary; replace them before submitting.

## Title (≤ 30 characters)

Người Dung Quất: Sell & Rooms

## App Store subtitle (≤ 30 characters)

Jobs, ride sharing, lost items

## Google Play short description (≤ 80 characters)

Sell items, find rooms, jobs, rides and sports games around Dung Quất.

## Full description (≤ 4000 characters)

Người Dung Quất is a community app, not affiliated with Hoa Phat Group (ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát). It is an independent, personal project for people who live and work around the Dung Quất area.

One app for everyday needs:

SELL & BUY
Post electronics, vehicles, safety gear and household items. Quick post only needs a photo, a title and a price.

FIND A ROOM
Browse rooms for rent and room shares, and filter by distance to your work site.

FIND A JOB
Main jobs and part-time work outside your shift.

LOST & FOUND
Post what you lost or found. The app suggests listings that may match and lets you know.

RIDE SHARING
Create or join a shared trip to the city or back home. The host can approve members and the group can chat together.

SPORTS GAMES
Find players for football, badminton and pickleball, pick a venue and settle the game in the group.

Simple and safe:
- Browse and search without signing in
- Message the poster directly, with safe-trading tips
- Listings are moderated; Report and Block are always available
- Verification badges once your documents are approved
- Save listings and get notified about messages and group updates
- Translate listings into your language
- Tiếng Việt, English, 中文
- Delete your account inside the app

The app only connects people and takes no part in any transaction. Meet in a public place and check items before you pay.

A community app, not affiliated with Hoa Phat Group.

## App Store keywords (≤ 100 characters, comma separated)

secondhand,used items,room rent,room share,jobs,part-time,carpool,lost and found,football,Dung Quat

Do not use "Hoa Phat" as a keyword: it suggests an affiliation and breaks store trademark rules.

## What's new (version 1.0.0)

First release: sell and buy, rooms, jobs, lost and found, ride sharing, sports games, messaging, notifications and verification badges.

## Screenshot shot list

Capture from the real app on a device or simulator once a build exists. No mock-ups and no made-up numbers.

Rules for capturing:
- Use demo data you created: fake names, no real phone numbers, plates, faces or documents. Do not use `supabase/seed` as is: some listings and pick-up points mention Hoa Phat
- No Hoa Phat logo, uniform, factory gate or brand name in listing photos, site names or banners
- Captions describe features only; no user counts, ratings or testimonials
- Capture with the app set to English, light mode; hide personal notifications in the status bar

| # | Screen | Route | Caption |
|---|---|---|---|
| 1 | Home: 6 services, listings near you | `(tabs)/index` | Everything around Dung Quất |
| 2 | Sell & buy list | `listings/[feature]` | Sell quickly, close to work |
| 3 | Listing detail with photos, Message button | `listing/[id]` | See it, ask right away |
| 4 | Rooms list with distance filter | `listings/[feature]` | Find rooms by distance |
| 5 | Ride detail | `group/[id]` | Share a ride home |
| 6 | Sports games list | `groups/[kind]` | Find players, settle the game |
| 7 | Chat conversation | `chat/[conversationId]` | Message directly |
| 8 | Listing posted | `listing/new/[category]` | Post a listing fast |

Follow each store's current size requirements (re-check when submitting). Google Play also needs a 1024×500 feature graphic: use the app name and the app's own colours, never a Hoa Phat logo.
