import type { Expression, PlayerId } from '../types'

export interface ExpressionEvent {
  player1: Expression
  player2: Expression
  holdSeconds?: number
  followUp?: {
    player1: Expression
    player2: Expression
    afterSeconds: number
  }
}

export function expressionsForKickoff(): ExpressionEvent {
  return { player1: 'happy', player2: 'happy' }
}

export function expressionsForGoal(scorer: PlayerId, spectacular: boolean): ExpressionEvent {
  if (spectacular) {
    return {
      player1: 'amazed',
      player2: 'amazed',
      holdSeconds: 0.9,
      followUp: {
        player1: scorer === 1 ? 'happy' : 'sad',
        player2: scorer === 2 ? 'happy' : 'sad',
        afterSeconds: 0.9,
      },
    }
  }

  return {
    player1: scorer === 1 ? 'happy' : 'sad',
    player2: scorer === 2 ? 'happy' : 'sad',
  }
}

export function expressionsForNearMiss(): ExpressionEvent {
  return { player1: 'amazed', player2: 'amazed', holdSeconds: 1.2 }
}

export function expressionsForSave(saver: PlayerId): ExpressionEvent {
  return {
    player1: saver === 1 ? 'happy' : 'angry',
    player2: saver === 2 ? 'happy' : 'angry',
    holdSeconds: 1.4,
  }
}

export function expressionsForMatchEnd(winner: PlayerId): ExpressionEvent {
  return {
    player1: winner === 1 ? 'happy' : 'sad',
    player2: winner === 2 ? 'happy' : 'sad',
  }
}
