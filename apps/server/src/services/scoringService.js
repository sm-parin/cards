'use strict';

// ---------------------------------------------------------------------------
// Point values for scoring cards
// ---------------------------------------------------------------------------

/**
 * Cards that carry points.
 * Q♠ is handled separately because it is the only suit-specific point card.
 */
const VALUE_POINTS = {
  '5': 5,
  '10': 10,
  'A': 15,
};

/** Points awarded for the Queen of Spades exclusively. */
const QUEEN_SPADES_POINTS = 30;

// ---------------------------------------------------------------------------
// Per-card point lookup
// ---------------------------------------------------------------------------

/**
 * Returns the point value of a single card.
 *
 * Scoring rules:
 *  - Q♠ → 30 pts
 *  - A (any suit) → 15 pts
 *  - 10 (any suit) → 10 pts
 *  - 5 (any suit) → 5 pts
 *  - All other cards → 0 pts
 *
 * @param {string} card - Card string e.g. "Q♠", "10♥", "5♣".
 * @returns {number} Point value of the card.
 */
function getCardPoints(card) {
  if (card === 'Q♠') return QUEEN_SPADES_POINTS;
  const value = card.slice(0, -1); // strip the single-character suit symbol
  return VALUE_POINTS[value] ?? 0;
}

// ---------------------------------------------------------------------------
// Max points per deck count
// ---------------------------------------------------------------------------

/**
 * Returns the total points available in a game based on deck count.
 *
 * @param {1|2} deckCount
 * @returns {150|300}
 */
function getMaxPoints(deckCount) {
  return deckCount === 2 ? 300 : 150;
}

// ---------------------------------------------------------------------------
// Team assignment
// ---------------------------------------------------------------------------

/**
 * Splits players into bidding team and opponent team.
 *
 * Bidding team  = highestBidder + revealed partners (may be empty if solo bidder)
 * Opponent team = all remaining players
 *
 * @param {import('../rooms/roomStore').Room} room
 * @returns {{ biddingTeam: string[], opponentTeam: string[] }}
 */
function buildTeams(room) {
  const highestBidder = room.game.bidding.highestBidder;
  const revealedPartners = room.game.partner.partners; // player IDs confirmed during play

  // Deduplicate in case highestBidder somehow appears in partners
  const biddingTeamSet = new Set(
    [highestBidder, ...revealedPartners].filter(Boolean),
  );
  const biddingTeam = [...biddingTeamSet];

  const opponentTeam = room.players
    .map((p) => p.id)
    .filter((id) => !biddingTeamSet.has(id));

  return { biddingTeam, opponentTeam };
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Iterates all completed stacks in `room.game.history` and accumulates points
 * for each team based on the stack winner's team membership.
 *
 * Called once at game end — never mid-game.
 *
 * @param {import('../rooms/roomStore').Room} room
 * @returns {{
 *   biddingScore: number,
 *   opponentScore: number,
 *   biddingTeam: string[],
 *   opponentTeam: string[]
 * }}
 */
function calculateScores(room) {
  const { biddingTeam, opponentTeam } = buildTeams(room);
  const biddingTeamSet = new Set(biddingTeam);

  let biddingScore = 0;
  let opponentScore = 0;

  for (const stack of room.game.history) {
    const { winner, cards } = stack;

    const stackPoints = cards.reduce(
      (sum, entry) => sum + getCardPoints(entry.card),
      0,
    );

    if (biddingTeamSet.has(winner)) {
      biddingScore += stackPoints;
    } else {
      opponentScore += stackPoints;
    }
  }

  return { biddingScore, opponentScore, biddingTeam, opponentTeam };
}

// ---------------------------------------------------------------------------
// Winner determination
// ---------------------------------------------------------------------------

/**
 * Determines which team wins based on the final scores.
 *
 * Win conditions:
 *  - Bidding team wins if their score ≥ bidTarget.
 *  - Opponent team wins if bidding team fails (score < bidTarget).
 *    (Equivalently, opponent wins when opponent score ≥ maxPoints - bidTarget + 5)
 *
 * @param {number} biddingScore
 * @param {number} bidTarget  - The bid committed by the highestBidder.
 * @returns {'bidding'|'opponent'}
 */
function determineWinner(biddingScore, bidTarget) {
  return biddingScore >= bidTarget ? 'bidding' : 'opponent';
}

// ---------------------------------------------------------------------------
// Game-over detection
// ---------------------------------------------------------------------------

/**
 * Returns true when all players have played every card (hands all empty).
 *
 * @param {import('../rooms/roomStore').Room} room
 * @returns {boolean}
 */
function isGameOver(room) {
  return room.players.every((p) => p.hand.length === 0);
}

module.exports = {
  getCardPoints,
  getMaxPoints,
  buildTeams,
  calculateScores,
  determineWinner,
  isGameOver,
};
