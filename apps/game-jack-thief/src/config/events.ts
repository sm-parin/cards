/**
 * Jack-Thief socket event name constants.
 * Re-exported from @cards/types for type-safe usage throughout the app.
 */
export { JT_CLIENT_EVENTS, JT_SERVER_EVENTS } from "@cards/types";
export type { JtClientEvent, JtServerEvent } from "@cards/types";

// Also re-export shared lobby/room events from Black Queen's constants
// (JT reuses the same room infrastructure)
export { CLIENT_EVENTS, SERVER_EVENTS } from "@cards/types";
export type { ClientEvent, ServerEvent } from "@cards/types";
