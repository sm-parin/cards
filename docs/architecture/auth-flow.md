# Auth Flow

## The problem this solves

The shell and game frontends are on different origins (different Vercel deployments, different domains). Browser security prevents one origin from reading another's localStorage. A user who logs in at the shell cannot have their token automatically available in a game app opened at a different URL.

## Complete token lifecycle

### Step 1 — Registration / Login
User submits credentials to the shell's login page. The shell calls `@cards/auth`'s `login()` or `register()`, which POST to `{NEXT_PUBLIC_API_URL}/auth/register` or `/auth/login` on the server. The server returns `{ token, user }`. The shell calls `setShellToken(token)` which writes to `localStorage['cards_token']`.

JWT payload contains: `{ userId, username, iat, exp }`. Signed with `JWT_SECRET`, expires in 7 days.

### Step 2 — Shell hydration on page load
On mount, `AuthContext` reads `cards_token` from localStorage. If found and not expired (`isTokenExpired()`), it decodes the JWT client-side (`decodeToken()`) and optimistically sets user state. It then fires `GET /auth/me` with a Bearer header to fetch fresh coins from the server. This two-step approach means the UI renders instantly with username/id while coins update asynchronously.

Cross-tab sync: `AuthContext` listens to the `storage` event. When `cards_token` changes in another tab (login or logout), all tabs update their state in real time.

### Step 3 — Launching a game
The shell's `/launch/[gameType]` route:
1. Reads the current token from `AuthContext`
2. Looks up the game URL from `GAME_CONFIG[gameType].url`
3. If logged in, appends `?token={JWT}` to the URL
4. Calls `window.location.replace(gameUrl)` — `replace` not `push`, so the `/launch` page is not in browser history. The back button skips it.

Guest users land on the game with no token parameter.

### Step 4 — Game receives the token
On the game's root `page.tsx` (both BQ and JT):
1. `useSearchParams()` reads `?token=`
2. If present, calls `setToken(urlToken)` — writes to localStorage under the game-specific key (`bq_token` or `jt_token`)
3. Removes the token from the URL via `window.history.replaceState()` so it does not persist in browser history or appear in server logs
4. Decodes the JWT client-side to populate `authUser` state (id, username, coins: 0)
5. If no token anywhere: sets `authUser = { id: '', username: 'Guest', coins: 0 }`

### Step 5 — Socket connection
Each game's `config/socket.ts` creates a single socket.io-client instance. The `auth` option uses a **dynamic callback**, not a static value:

```js
auth: (cb) => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('bq_token') ?? '')
    : '';
  cb({ token });
}
```

This is critical. A static `auth: { token }` would capture the token value at module load time. The callback runs at each connection attempt, so reconnects after a page refresh still send the current token.

### Step 6 — Server verifies the token
In `sockets/index.js` `onConnection()`:
1. Reads `socket.handshake.auth?.token`
2. If present and valid: calls `getUserById(payload.userId)` to fetch fresh user data including current coins
3. If absent or invalid: creates a guest identity `{ id: socket.id, username: 'Guest_XXXX', coins: 0, isGuest: true }`
4. Sets `socket.authUser` — all subsequent handlers read from `socket.authUser`, never from the handshake directly

## Why URL param over alternatives

**Shared subdomain cookies** — would require all apps on the same registered domain (e.g. `*.cards.com`). The project uses Vercel's default `*.vercel.app` domains which are different second-level domains. Third-party cookie restrictions would block this even on a custom domain in most browsers.

**postMessage** — would require the shell to keep a window reference to the game. `window.location.replace()` means the shell window becomes the game window; there is no parent/child relationship to message across.

**Shared backend session** — would require the server to issue session cookies with `SameSite=None; Secure` and proper CORS credentials handling. Adds complexity, requires HTTPS everywhere including local dev, and ties auth to specific server infrastructure.

**URL param** — works across all origins with zero infrastructure changes, is invisible to the user (removed immediately after use), and is stateless. The only risk is token leakage in server access logs, mitigated by HTTPS in production.

## Token storage key reference
| App          | localStorage key |
|--------------|-----------------|
| Shell        | `cards_token`    |
| Black Queen  | `bq_token`       |
| Jack Thief   | `jt_token`       |

## What the server's /auth/me endpoint does
`GET /auth/me` with `Authorization: Bearer {token}` returns `{ user: { id, username, coins } }`. Used by `AuthContext` to get fresh coin balances after login or on page load. Does not issue new tokens — it reads the existing one.
