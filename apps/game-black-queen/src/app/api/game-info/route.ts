import { NextResponse } from 'next/server';
import type { GameInfo } from '@cards/config';

const info: GameInfo = {
  displayName: 'Black Queen',
  description: 'A 5–10 player trick-taking card game. Bid high, choose your partner wisely, and avoid being caught with the Black Queen.',
  minPlayers: 5,
  maxPlayers: 10,
  rules: [
    {
      title: 'Objective',
      content: 'Win tricks to help your team reach the bid target. Avoid being caught with the Black Queen (Queen of Spades) — it costs your team dearly.',
    },
    {
      title: 'Bidding',
      content: 'Players bid for the right to choose the master suit and partner cards. The highest bidder sets the target your team must hit. Bid wisely — you must deliver!',
    },
    {
      title: 'Master Suit & Partner',
      content: 'The winning bidder picks a master suit that beats all others, and secretly selects partner cards. Holders of those cards are on your team — revealed as play unfolds.',
    },
    {
      title: 'Playing Tricks',
      content: 'Follow the suit led if you can. If not, play any card. The highest card of the led suit wins — unless a master suit card is played, then the highest master suit wins the trick.',
    },
    {
      title: 'Scoring',
      content: 'The bidding team scores points for tricks won. Hit the bid target and your team wins the round. Fall short and the opponents win. Most wins overall takes the game.',
    },
  ],
};

export async function GET() {
  return NextResponse.json(info, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
