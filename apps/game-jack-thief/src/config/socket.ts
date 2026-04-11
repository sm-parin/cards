import { createGameSocket } from '@cards/game-sdk';
import { appConfig } from '@/config';

const socket = createGameSocket('jt_token', appConfig.socketUrl);

export default socket;
