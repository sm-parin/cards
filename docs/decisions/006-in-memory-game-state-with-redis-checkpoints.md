# ADR-006: In-Memory Game State with Redis Checkpoints at Transitions
Date: 2026-04-05
Status: Accepted

## Context
Active game state (current bids, played cards, turn index, partner selections) changes frequently — on every card play, every bid, every turn advance. This state must survive player disconnects (so players can rejoin) but the full game may last 20+ minutes with dozens of state changes. The design choice was how often to sync this state to Redis.

## Decision
Game state mutations happen in the in-memory `rooms` object only. Redis is written at four specific transitions: room creation, player join, game start, and room deletion. Mid-game mutations (bids, card plays, partner state, turn changes) are not written to Redis.

## Reasoning
Writing every game mutation to Redis would require converting all game service functions from synchronous to asynchronous. The existing services (`biddingService.js`, `gameplayService.js`, `partnerService.js`) directly mutate the room object returned by `getRoom()` — both the caller and the service share the same object reference. Introducing `await redis.set(...)` after every mutation would require restructuring all service function signatures and all their callers.

At current scale (free tier server, small user base), the risk of losing game state on a server restart during an active game is acceptable. Render restarts are triggered by new deployments, which happen rarely and not during active gameplay hours (since deployment requires a code push).

Redis is still written at the four transition points as a write-through cache. This means the room list (for lobby browsing) and room membership survive a server crash-and-restart between games. Only mid-game state is lost.

## Consequences

### Positive
- All game service code remains synchronous — simpler, more readable, easier to test
- No Redis latency added to the hot path (card plays, bid updates)
- Room creation and lobby browsing work correctly even after server restarts

### Negative
- A server restart (new deployment) during an active game loses all game state — players would see an empty game on reconnect
- Guest players cannot reconnect to an active game even within the same server session (different issue — guest identity is socket.id)
- The JT game's `jackThiefGames` Map is entirely in-memory with no Redis backing at all — a restart loses JT game state entirely (though the room lobby data survives)

### Neutral
- The `rooms` object in `db/roomStore.js` is the single source of truth for live game state
- Redis serves as a recovery cache for room topology (who is in what room) but not game progress

## Alternatives considered
**Full Redis sync on every mutation** — Rejected because it requires converting all game service functions to async, a significant refactor touching ~10 files with no player-visible benefit at current scale. It would also substantially increase Redis operation count and cost.

**Event sourcing to Redis** — Append each game event to a Redis list, reconstruct state on reconnect by replaying events. Rejected because it requires a replay mechanism that does not exist and adds significant complexity for a platform where server restarts mid-game are exceptional and acceptable.

**Periodic background sync** — Serialize game state to Redis every N seconds. Rejected because it adds background timer complexity and still loses up to N seconds of state on crash. Not meaningfully better than the transition-only approach for the failure scenarios that actually matter.
