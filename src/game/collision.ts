import {
  BALL_RADIUS,
  BOUNCE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  GOAL_DEPTH,
  GOAL_POST_THICKNESS,
  GOAL_WIDTH,
  PLAYER_RADIUS,
  WALL_THICKNESS,
} from './constants'
import type { BallState, PlayerState } from '../types'

export interface GoalMouth {
  top: number
  bottom: number
}

export function getGoalMouth(): GoalMouth {
  const mid = FIELD_HEIGHT / 2
  const half = GOAL_WIDTH / 2
  return { top: mid - half, bottom: mid + half }
}

export function clampPlayer(player: PlayerState) {
  const minX = WALL_THICKNESS + player.radius
  const maxX = FIELD_WIDTH - WALL_THICKNESS - player.radius
  const minY = WALL_THICKNESS + player.radius
  const maxY = FIELD_HEIGHT - WALL_THICKNESS - player.radius
  player.x = Math.min(maxX, Math.max(minX, player.x))
  player.y = Math.min(maxY, Math.max(minY, player.y))
}

export function resolvePlayerPlayer(a: PlayerState, b: PlayerState) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  const minDist = a.radius + b.radius
  if (dist === 0 || dist >= minDist) return

  const nx = dx / dist
  const ny = dy / dist
  const overlap = (minDist - dist) / 2
  a.x -= nx * overlap
  a.y -= ny * overlap
  b.x += nx * overlap
  b.y += ny * overlap

  const rvx = b.vx - a.vx
  const rvy = b.vy - a.vy
  const velAlong = rvx * nx + rvy * ny
  if (velAlong > 0) return

  const impulse = (-velAlong * 0.8) / 2
  a.vx -= impulse * nx
  a.vy -= impulse * ny
  b.vx += impulse * nx
  b.vy += impulse * ny
}

export function resolveBallPlayer(
  ball: BallState,
  player: PlayerState,
  strength: number,
): boolean {
  const dx = ball.x - player.x
  const dy = ball.y - player.y
  const dist = Math.hypot(dx, dy)
  const minDist = ball.radius + player.radius
  if (dist === 0 || dist >= minDist) return false

  const nx = dx / dist
  const ny = dy / dist
  const overlap = minDist - dist
  ball.x += nx * overlap
  ball.y += ny * overlap

  const relVx = ball.vx - player.vx
  const relVy = ball.vy - player.vy
  const velAlong = relVx * nx + relVy * ny

  if (velAlong < 0) {
    ball.vx -= (1 + BOUNCE) * velAlong * nx
    ball.vy -= (1 + BOUNCE) * velAlong * ny
  }

  const push = strength * 0.015
  ball.vx += (nx * strength + player.vx * 0.35) * push
  ball.vy += (ny * strength + player.vy * 0.35) * push
  ball.squash = 0.7
  return true
}

export type WallHitResult = {
  hit: boolean
  nearMiss: boolean
  goal: 1 | 2 | null
}

export function resolveBallWalls(ball: BallState): WallHitResult {
  const mouth = getGoalMouth()
  let hit = false
  let nearMiss = false
  let goal: 1 | 2 | null = null

  const top = WALL_THICKNESS + ball.radius
  const bottom = FIELD_HEIGHT - WALL_THICKNESS - ball.radius

  if (ball.y < top) {
    ball.y = top
    ball.vy = Math.abs(ball.vy) * BOUNCE
    hit = true
  } else if (ball.y > bottom) {
    ball.y = bottom
    ball.vy = -Math.abs(ball.vy) * BOUNCE
    hit = true
  }

  const inMouthY = ball.y > mouth.top + BALL_RADIUS * 0.2 && ball.y < mouth.bottom - BALL_RADIUS * 0.2
  const leftLine = WALL_THICKNESS
  const rightLine = FIELD_WIDTH - WALL_THICKNESS

  // Left side
  if (ball.x - ball.radius < leftLine) {
    if (inMouthY) {
      if (ball.x + ball.radius < leftLine - GOAL_DEPTH * 0.15) {
        goal = 2
      } else {
        // Still in mouth tunnel — keep inside tunnel bounds vertically via posts
        constrainToMouth(ball, mouth, 'left')
        if (ball.x - ball.radius < leftLine - GOAL_DEPTH) {
          goal = 2
        }
      }
    } else {
      // Bounce on wall beside goal / posts
      const postHit = hitGoalPost(ball, mouth, 'left')
      if (!postHit) {
        ball.x = leftLine + ball.radius
        ball.vx = Math.abs(ball.vx) * BOUNCE
        hit = true
        if (Math.abs(ball.y - mouth.top) < 40 || Math.abs(ball.y - mouth.bottom) < 40) {
          nearMiss = Math.abs(ball.vx) > 180
        }
      } else {
        hit = true
        nearMiss = Math.abs(ball.vx) > 200
      }
    }
  }

  // Right side
  if (ball.x + ball.radius > rightLine) {
    if (inMouthY) {
      if (ball.x - ball.radius > rightLine + GOAL_DEPTH * 0.15) {
        goal = 1
      } else {
        constrainToMouth(ball, mouth, 'right')
        if (ball.x + ball.radius > rightLine + GOAL_DEPTH) {
          goal = 1
        }
      }
    } else {
      const postHit = hitGoalPost(ball, mouth, 'right')
      if (!postHit) {
        ball.x = rightLine - ball.radius
        ball.vx = -Math.abs(ball.vx) * BOUNCE
        hit = true
        if (Math.abs(ball.y - mouth.top) < 40 || Math.abs(ball.y - mouth.bottom) < 40) {
          nearMiss = Math.abs(ball.vx) > 180
        }
      } else {
        hit = true
        nearMiss = Math.abs(ball.vx) > 200
      }
    }
  }

  return { hit, nearMiss, goal }
}

function constrainToMouth(ball: BallState, mouth: GoalMouth, side: 'left' | 'right') {
  if (ball.y - ball.radius < mouth.top) {
    ball.y = mouth.top + ball.radius
    ball.vy = Math.abs(ball.vy) * BOUNCE
  } else if (ball.y + ball.radius > mouth.bottom) {
    ball.y = mouth.bottom - ball.radius
    ball.vy = -Math.abs(ball.vy) * BOUNCE
  }

  if (side === 'left') {
    const back = WALL_THICKNESS - GOAL_DEPTH + ball.radius
    if (ball.x < back) ball.x = back
  } else {
    const back = FIELD_WIDTH - WALL_THICKNESS + GOAL_DEPTH - ball.radius
    if (ball.x > back) ball.x = back
  }
}

function hitGoalPost(ball: BallState, mouth: GoalMouth, side: 'left' | 'right'): boolean {
  const postX = side === 'left' ? WALL_THICKNESS : FIELD_WIDTH - WALL_THICKNESS
  const posts = [mouth.top, mouth.bottom]
  let collided = false

  for (const py of posts) {
    const dx = ball.x - postX
    const dy = ball.y - py
    const dist = Math.hypot(dx, dy)
    const minDist = ball.radius + GOAL_POST_THICKNESS * 0.55
    if (dist > 0 && dist < minDist) {
      const nx = dx / dist
      const ny = dy / dist
      const overlap = minDist - dist
      ball.x += nx * overlap
      ball.y += ny * overlap
      const velAlong = ball.vx * nx + ball.vy * ny
      if (velAlong < 0) {
        ball.vx -= (1 + BOUNCE) * velAlong * nx
        ball.vy -= (1 + BOUNCE) * velAlong * ny
      }
      collided = true
    }
  }

  // Vertical post bodies outside mouth
  if (ball.y < mouth.top || ball.y > mouth.bottom) {
    if (side === 'left' && ball.x - ball.radius < postX) {
      ball.x = postX + ball.radius
      ball.vx = Math.abs(ball.vx) * BOUNCE
      collided = true
    }
    if (side === 'right' && ball.x + ball.radius > postX) {
      ball.x = postX - ball.radius
      ball.vx = -Math.abs(ball.vx) * BOUNCE
      collided = true
    }
  }

  return collided
}

export function fullyCrossedGoalLine(ball: BallState, side: 'left' | 'right'): boolean {
  if (side === 'left') {
    return ball.x + ball.radius < WALL_THICKNESS
  }
  return ball.x - ball.radius > FIELD_WIDTH - WALL_THICKNESS
}

export function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

export { PLAYER_RADIUS }
