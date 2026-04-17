import { NextResponse } from 'next/server';
import type { GameInfo } from '@cards/config';

const info: GameInfo = {
  displayName: 'Jack Thief',
  description: "A 2–13 player card game. Discard your pairs, steal cards from your opponent, and whatever you do — don't get caught holding the Jack!",
  minPlayers: 2,
  maxPlayers: 13,
  rules: [
    {
      title: 'Objective',
      content: 'Be one of the winners by getting rid of all your cards. The single loser is the player left holding the Jack of Spades when everyone else is out.',
    },
    {
      title: 'Pre-Game: Discard Pairs',
      content: "Before play begins, look at your hand and discard all matching pairs (same rank). Work fast — there's a timer! The Jack of Spades has no pair and can't be discarded.",
    },
    {
      title: 'Stealing Cards',
      content: 'On your turn, offer your face-down hand to the player on your right. They steal one card blindly. If it pairs with a card they hold, they discard the pair immediately.',
    },
    {
      title: 'Winning & Losing',
      content: "When you discard your last pair you're out — and you're a winner! Play continues until only one player remains holding the Jack. That player loses.",
    },
  ],
};

export async function GET() {
  return NextResponse.json(info, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
