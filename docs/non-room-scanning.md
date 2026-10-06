# Directory-page tracking guard — 3.23.2-beta.1

TierScope starts minimized and leaves live tracking inactive on the Chaturbate homepage, Followed cams, Female cams, Male cams, Couple cams and Trans cams. The existing room-route parser also excludes other recognized directories.

These pages show **No room / Open a room**, with tracking and Reset controls disabled. They do not start API acquisition, DOM fallback, tracking clocks or DOM health checks, even when a Users-tab element is present. Manual expansion, Library and saved-file Replay remain available. Opening a broadcast room restores its normal tracking behavior.

In 3.23.1, a directory with a Users-tab element could enter acquisition with an unknown room. That failed before fetching and increased the origin’s shared retry counter, potentially delaying other room tabs. The new scan-entry guard prevents that path. Directory Resume also cannot clear another room’s access-denial restriction. Existing genuine server restrictions remain shared and protected.

Review:
- Open each listed directory: TierScope is minimized and shows Open a room.
- Wait or expand the panel: no live scans start and tracking controls stay disabled.
- Open Library or a saved file: those tools remain usable.
- Open a broadcast room in another tab: it scans normally when no genuine request restriction is active.
