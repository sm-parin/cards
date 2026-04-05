'use strict';

const { query } = require('../db/postgres');
const { updateCoins } = require('../store/userStore');

const WIN_DELTA  =  200;
const LOSS_DELTA = -50;

/**
 * Records a completed match in Postgres and distributes coin rewards.
 *
 * @param {object} opts
 * @param {string}   opts.roomId
 * @param {string}   opts.winnerTeam   - 'teamA' | 'teamB' | 'none'
 * @param {number}   opts.bidTarget
 * @param {string[]} opts.biddingTeam  - player IDs on the bidding team
 * @param {string[]} opts.opponentTeam - player IDs on the opposing team
 * @returns {Promise<{ matchId: string, coinDeltas: Record<string, number> }>}
 */
async function recordMatch({ roomId, winnerTeam, bidTarget, biddingTeam, opponentTeam }) {
  // Insert match header
  const { rows } = await query(
    `INSERT INTO matches (room_id, winner_team, bid_target)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [roomId, winnerTeam, bidTarget],
  );
  const matchId = rows[0].id;

  const coinDeltas = {};

  if (winnerTeam === 'none') {
    // No bids — no coin change for anyone
    return { matchId, coinDeltas };
  }

  const allPlayers = [
    ...biddingTeam.map((id) => ({ id, team: 'bidding' })),
    ...opponentTeam.map((id) => ({ id, team: 'opponent' })),
  ];

  await Promise.all(
    allPlayers.map(async ({ id, team }) => {
      const isWinner =
        (winnerTeam === 'teamA' && biddingTeam.includes(id)) ||
        (winnerTeam === 'teamB' && opponentTeam.includes(id));

      const delta = isWinner ? WIN_DELTA : LOSS_DELTA;
      coinDeltas[id] = delta;

      // Persist to match_players table
      await query(
        `INSERT INTO match_players (match_id, user_id, team, coin_delta)
         VALUES ($1, $2, $3, $4)`,
        [matchId, id, team, delta],
      ).catch(() => {}); // Skip if user is a guest (no DB row)

      // Apply coin change
      await updateCoins(id, delta, isWinner ? 'win' : 'loss', matchId).catch(() => {});
    }),
  );

  return { matchId, coinDeltas };
}

module.exports = { recordMatch };
