# Overview and dashboard library

## Overview

Overview is the application home. A personal greeting leads to four separate monitoring-summary cards (as permitted by the account), and up to four recently updated dashboards in a full-width list. Alert attention and recent activity appear below the dashboard list in two columns on desktop and one on mobile, with compact empty states. The header Quick access menu offers New dashboard and New alert rule to users who can create them. Alert creation is disabled until a source is available. There is no separate quick-actions section in the page content. Administrators without a source see a prompt to connect InfluxDB.

Counts and lists follow resource permissions. The count cards show available dashboards, enabled alert rules, Telegram destinations, and configured InfluxDB sources as permitted. Telegram counts use the destinations available to the account, without exposing saved tokens. The Needs attention list includes firing, query errors, no data, pending conditions, and rules awaiting their first evaluation. Paused rules are excluded. The page does not infer structural safety or source connection health from configuration counts.

Recent activity uses the existing permission-filtered notification stream, including firing and recovery snapshots. It continues updating when alert pop-ups are disabled. Alert definitions refresh periodically while the page is visible. Dashboard and alert load failures show retry actions rather than claiming that no data or no alerts exist. Viewers without assignments see an access prompt and can use the account menu for their profile.

## Dashboard library

Open **Dashboards** to search by text, filter by folder/tag, change sorting, and choose list or grid view. Sorting includes recently updated and name. Tags can identify structures, locations, or sensor groups.

**New dashboard** offers **Create new** and **Import JSON**. Creation is available to Admins/Editors. Administrators can also manage folders. Folders organize resources but do not provide inherited permissions.

The right-aligned vertical menu offers actions according to access, including open, duplicate, export JSON, and delete. The library shows Duplicate when the user can edit the original dashboard and create dashboards; the copy has its own ID. Delete is limited to an Administrator or the creator who still has Edit access.

Searching or filtering does not delete data. If a dashboard is missing, clear filters and ask an Administrator to check permissions. Do not recreate a dashboard merely because access has not been assigned.

Continue with [dashboard editing](dashboards.md).
