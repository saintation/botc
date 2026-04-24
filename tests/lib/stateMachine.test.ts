import { describe, it, expect } from 'vitest';
import { transitionState } from '../../src/lib/stateMachine';
import type { GamePhase } from '../../src/types/game';

describe('Game State Machine', () => {
  it('should transition from lobby to setup', () => {
    const currentState: GamePhase = 'lobby';
    const newState = transitionState(currentState, 'START_SETUP');
    expect(newState).toBe('setup');
  });

  it('should transition from setup to night 1', () => {
    const currentState: GamePhase = 'setup';
    const newState = transitionState(currentState, 'START_GAME');
    expect(newState).toBe('night');
  });

  it('should transition from night to day', () => {
    const currentState: GamePhase = 'night';
    const newState = transitionState(currentState, 'END_NIGHT');
    expect(newState).toBe('day');
  });

  it('should not allow invalid transitions (lobby -> day)', () => {
    const currentState: GamePhase = 'lobby';
    const newState = transitionState(currentState, 'END_NIGHT');
    expect(newState).toBe('lobby'); // Invalid transition returns original state
  });
});
