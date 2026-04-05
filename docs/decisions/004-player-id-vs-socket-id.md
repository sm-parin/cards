# ADR-004: player.id vs player.socketId Separation
Date: 2026-04-05
Status: Accepted

## Context
Socket.IO assigns a new `socket.id` to every connection. When a player disconnects and reconnects — due to a tab refresh, network blip, or phone screen lock — they get a new socket.id. In the original implementation, socket.id was used as the player identifier throughout: in turn order arrays, bid records, partner selection, and as the key for emitting events. Any disconnect broke game state because the player's new socket.id did not match any record.

## Decision
Every player has two identity fields: `player.id` (stable UUID from the database, never changes) and `player.socketId` (current connection's socket.id, changes on reconnect). All game logic uses `player.id`. All socket emissions use `player.socketId`. `updatePlayerId()` patches only `player.socketId` on reconnect.

## Reasoning
The root of the reconnect bug was using an ephemeral connection identifier for permanent game state. Turn order must survive a disconnect — it references who plays next in a game that may last 20+ minutes. Replacing socket.id with a stable UUID as the canonical player identifier fixes reconnect at the source rather than patching around it.

The naming `updatePlayerId` is slightly misleading — it updates the socket ID, not the player ID. This is a known quirk; it was not renamed to avoid breaking all call sites.

## Consequences

### Positive
- Players can disconnect and reconnect without losing their game position
- Turn order, bid records, and partner assignments survive disconnects
- `findRoomByUserId(userId)` can locate a player's room on reconnect

### Negative
- `updatePlayerId()` function name is confusing — it updates `socketId` not `id`
- All server code must remember to emit to `player.socketId`, never to `player.id`
- Guest players use `socket.id` as their `player.id` (assigned at join time), so their "stable" ID changes on reconnect anyway — guests cannot rejoin

### Neutral
- The distinction requires discipline: one bad emit to `player.id` silently fails (no socket with that ID exists)
- The AGENTS.md explicitly lists this as a rule under "What NOT to do"

## Alternatives considered
**Use socket.id for everything, re-emit game state on reconnect** — Would require the server to detect a returning player by username or some other identifier, re-associate their state, and re-emit all current game state. Complex and fragile — requires identifying the "same person" across different socket connections without a stable ID.

**Store turn order by username** — Usernames are unique but could theoretically change (not currently supported but future-possible). UUIDs are immutable by design.

**Do nothing (no reconnect support)** — A player who loses connection during a 5–10 player game effectively removes that seat from the game. With 5+ players this is a significant quality-of-life problem. Reconnect support was prioritized early.
