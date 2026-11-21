export type GameKind = 'soccer' | 'fight' | 'tennis' | 'spear' | 'tanks' | 'bombs'
export type Seat = 1 | 2

export interface NetInputFrame {
  move: { x: number; y: number }
  /** Held jump (fight) */
  jump?: boolean
  /** Edge: soccer kick / fight punch / tennis swing / spear throw */
  a?: boolean
  /** Edge: fight kick */
  b?: boolean
}

export type ClientMessage =
  | {
      type: 'createRoom'
      game: GameKind
      settings: Record<string, unknown>
      playerName: string
    }
  | {
      type: 'joinRoom'
      roomCode: string
      playerName: string
    }
  | { type: 'startMatch' }
  | { type: 'rematch' }
  | { type: 'input'; input: NetInputFrame }
  | { type: 'state'; state: unknown; seq: number }
  | { type: 'ping'; t: number }

export type ServerMessage =
  | {
      type: 'roomCreated'
      roomCode: string
      seat: Seat
      game: GameKind
      settings: Record<string, unknown>
      playerName: string
    }
  | {
      type: 'roomJoined'
      roomCode: string
      seat: Seat
      game: GameKind
      settings: Record<string, unknown>
      hostName: string
      playerName: string
    }
  | {
      type: 'peerJoined'
      guestName: string
      settings: Record<string, unknown>
    }
  | { type: 'peerLeft' }
  | {
      type: 'matchStart'
      settings: Record<string, unknown>
      game: GameKind
    }
  | {
      type: 'rematch'
      settings: Record<string, unknown>
      game: GameKind
    }
  | { type: 'peerInput'; seat: Seat; input: NetInputFrame }
  | { type: 'peerState'; state: unknown; seq?: number }
  | { type: 'pong'; t?: number }
  | { type: 'error'; message: string }
