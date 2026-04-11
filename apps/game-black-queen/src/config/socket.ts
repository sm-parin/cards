import { createGameSocket } from '@cards/game-sdk';
import { appConfig } from '@/config';

const socket = createGameSocket('bq_token', appConfig.socketUrl);

export default socket;
