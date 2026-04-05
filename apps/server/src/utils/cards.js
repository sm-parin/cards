'use strict';

// ---------------------------------------------------------------------------
// Card definitions
// ---------------------------------------------------------------------------

/** Ordered card values from lowest to highest rank. */
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** Unicode suit symbols. */
const SUITS = ['♥', '♣', '♦', '♠'];

/**
 * Numeric rank for each card value, used for sorting and comparison.
 * 2 = 0 (lowest), A = 12 (highest).
 *
 * @type {Object.<string, number>}
 */
const VALUE_RANK = Object.fromEntries(VALUES.map((value, index) => [value, index]));

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Creates one or more standard 52-card decks.
 *
 * Each card is represented as a string combining its value and suit symbol
 * (e.g. "Q♠", "10♥", "A♣"). When deckCount > 1, duplicate cards are allowed.
 *
 * @param {number} [deckCount=1] - Number of 52-card decks to combine.
 * @returns {string[]} Flat array of card strings.
 */
function createDeck(deckCount = 1) {
  const singleDeck = VALUES.flatMap((value) => SUITS.map((suit) => `${value}${suit}`));

  const deck = [];
  for (let i = 0; i < deckCount; i++) {
    deck.push(...singleDeck);
  }

  return deck;
}

/**
 * Returns a new array with deck cards in a randomly shuffled order.
 *
 * Uses the Fisher-Yates algorithm. The original array is never mutated.
 *
 * @param {string[]} deck - The deck to shuffle.
 * @returns {string[]} A new shuffled array.
 */
function shuffleDeck(deck) {
  const shuffled = deck.slice();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Returns the numeric rank of a card for sorting and comparison purposes.
 *
 * Rank is based on the card's value portion only (suit is ignored).
 * 2 = 0 (lowest), A = 12 (highest).
 *
 * @param {string} card - A card string (e.g. "Q♠", "10♥").
 * @returns {number} Numeric rank in the range [0, 12].
 */
function getCardValue(card) {
  const value = card.slice(0, -1); // strip the single-character suit symbol
  return VALUE_RANK[value] ?? -1;
}

/**
 * Returns a new array of cards sorted from lowest to highest rank.
 *
 * The original array is never mutated.
 *
 * @param {string[]} cards - Array of card strings to sort.
 * @returns {string[]} New array sorted ascending by rank.
 */
function sortCardsAscending(cards) {
  return cards.slice().sort((a, b) => getCardValue(a) - getCardValue(b));
}

/**
 * Returns the suit symbol of a card (the last character).
 *
 * @param {string} card - A card string (e.g. "Q♠", "10♥").
 * @returns {string} Single Unicode suit character (♥ ♣ ♦ ♠).
 */
function getSuitFromCard(card) {
  return card.slice(-1);
}

module.exports = { createDeck, shuffleDeck, getCardValue, sortCardsAscending, getSuitFromCard };
