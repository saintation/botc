import type { GamePhase } from '../types/game';

export type GameAction = 
  | 'START_SETUP'
  | 'START_GAME'
  | 'END_NIGHT'
  | 'START_VOTING'
  | 'END_VOTING_CONTINUE_DAY'
  | 'END_VOTING_AND_EXECUTE'
  | 'END_DAY'
  | 'END_GAME';

export function transitionState(currentState: GamePhase, action: GameAction): GamePhase {
  switch (currentState) {
    case 'lobby':
      if (action === 'START_SETUP') return 'setup';
      break;
    case 'setup':
      if (action === 'START_GAME') return 'night';
      break;
    case 'night':
      if (action === 'END_NIGHT') return 'day';
      if (action === 'END_GAME') return 'end';
      break;
    case 'day':
      if (action === 'START_VOTING') return 'voting';
      if (action === 'END_DAY') return 'night';
      if (action === 'END_GAME') return 'end';
      break;
    case 'voting':
      if (action === 'END_VOTING_CONTINUE_DAY') return 'day';
      if (action === 'END_VOTING_AND_EXECUTE') return 'night';
      if (action === 'END_GAME') return 'end';
      break;
    case 'end':
      // Cannot transition out of end state
      break;
  }
  
  // Return original state if action is invalid for current phase
  return currentState;
}
