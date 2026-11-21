import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyWebsocketHandlerV2,
} from 'aws-lambda'

const TABLE = process.env.TABLE_NAME!
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})

const ROOM_TTL_SECONDS = 60 * 60 * 3
const CONN_TTL_SECONDS = 60 * 60 * 3

type GameKind =
  | 'soccer'
  | 'fight'
  | 'tennis'
  | 'spear'
  | 'tanks'
  | 'bombs'
  | 'snake'
  | 'rumble'
type Seat = 1 | 2

interface RoomItem {
  pk: string
  sk: string
  roomCode: string
  game: GameKind
  settings: Record<string, unknown>
  hostConnectionId: string
  guestConnectionId?: string
  hostName: string
  guestName?: string
  status: 'waiting' | 'ready' | 'playing'
  ttl: number
}

interface ConnItem {
  pk: string
  sk: string
  connectionId: string
  roomCode?: string
  seat?: Seat
  ttl: number
}

function ok(body: unknown = { ok: true }): APIGatewayProxyResultV2 {
  return { statusCode: 200, body: JSON.stringify(body) }
}

function ttl(seconds: number) {
  return Math.floor(Date.now() / 1000) + seconds
}

function roomPk(code: string) {
  return `ROOM#${code}`
}

function connPk(id: string) {
  return `CONN#${id}`
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function parseBody(raw?: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function getConn(connectionId: string): Promise<ConnItem | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk: connPk(connectionId), sk: 'META' },
    }),
  )
  return (res.Item as ConnItem | undefined) ?? null
}

async function getRoom(roomCode: string): Promise<RoomItem | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk: roomPk(roomCode), sk: 'META' },
    }),
  )
  return (res.Item as RoomItem | undefined) ?? null
}

async function putConn(item: ConnItem) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }))
}

async function putRoom(item: RoomItem) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }))
}

async function deleteKey(pk: string, sk: string) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }))
}

function managementClient(event: APIGatewayProxyWebsocketEventV2) {
  const callbackUrl =
    process.env.CALLBACK_URL ||
    `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  return new ApiGatewayManagementApiClient({ endpoint: callbackUrl })
}

/** Returns false when the connection is gone (410). */
async function send(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      }),
    )
    return true
  } catch (err: unknown) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (status === 410) {
      await deleteKey(connPk(connectionId), 'META')
      return false
    }
    throw err
  }
}

/** Drop a stale guest seat so a new player can join. */
async function clearStaleGuest(room: RoomItem, client: ApiGatewayManagementApiClient) {
  if (!room.guestConnectionId) return room
  const alive = await send(client, room.guestConnectionId, { type: 'ping', t: Date.now() })
  if (alive) return room
  room.guestConnectionId = undefined
  room.guestName = undefined
  room.status = 'waiting'
  await putRoom(room)
  return room
}

async function peerId(room: RoomItem, connectionId: string): Promise<string | null> {
  if (room.hostConnectionId === connectionId) return room.guestConnectionId ?? null
  if (room.guestConnectionId === connectionId) return room.hostConnectionId
  return null
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const route = event.requestContext.routeKey
  const connectionId = event.requestContext.connectionId

  if (route === '$connect') {
    await putConn({
      pk: connPk(connectionId),
      sk: 'META',
      connectionId,
      ttl: ttl(CONN_TTL_SECONDS),
    })
    return ok()
  }

  if (route === '$disconnect') {
    const conn = await getConn(connectionId)
    if (conn?.roomCode) {
      const room = await getRoom(conn.roomCode)
      if (room) {
        const client = managementClient(event)
        const other = await peerId(room, connectionId)
        if (other) {
          await send(client, other, { type: 'peerLeft' })
        }
        if (room.hostConnectionId === connectionId) {
          if (room.guestConnectionId) {
            await deleteKey(connPk(room.guestConnectionId), 'META')
          }
          await deleteKey(roomPk(room.roomCode), 'META')
        } else if (room.guestConnectionId === connectionId) {
          room.guestConnectionId = undefined
          room.guestName = undefined
          room.status = 'waiting'
          await putRoom(room)
        }
      }
    }
    await deleteKey(connPk(connectionId), 'META')
    return ok()
  }

  const body = parseBody(event.body)
  const type = String(body.type ?? '')
  const client = managementClient(event)

  try {
    if (type === 'createRoom') {
      const game = body.game as GameKind
      const settings = (body.settings as Record<string, unknown>) ?? {}
      const playerName = String(body.playerName ?? 'Player 1').slice(0, 16)

      let roomCode = ''
      for (let i = 0; i < 8; i++) {
        const code = makeRoomCode()
        const existing = await getRoom(code)
        if (!existing) {
          roomCode = code
          break
        }
      }
      if (!roomCode) {
        await send(client, connectionId, { type: 'error', message: 'Could not create room' })
        return ok()
      }

      const room: RoomItem = {
        pk: roomPk(roomCode),
        sk: 'META',
        roomCode,
        game,
        settings,
        hostConnectionId: connectionId,
        hostName: playerName,
        status: 'waiting',
        ttl: ttl(ROOM_TTL_SECONDS),
      }
      await putRoom(room)
      await putConn({
        pk: connPk(connectionId),
        sk: 'META',
        connectionId,
        roomCode,
        seat: 1,
        ttl: ttl(CONN_TTL_SECONDS),
      })
      await send(client, connectionId, {
        type: 'roomCreated',
        roomCode,
        seat: 1,
        game,
        settings,
        playerName,
      })
      return ok()
    }

    if (type === 'joinRoom') {
      const roomCode = String(body.roomCode ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8)
      const playerName = String(body.playerName ?? 'Player 2').slice(0, 16)
      let room = await getRoom(roomCode)
      if (!room) {
        await send(client, connectionId, { type: 'error', message: 'Room not found' })
        return ok()
      }
      if (room.hostConnectionId === connectionId) {
        await send(client, connectionId, {
          type: 'error',
          message: 'You are already the host of this room',
        })
        return ok()
      }
      if (room.guestConnectionId) {
        room = await clearStaleGuest(room, client)
      }
      if (room.guestConnectionId) {
        await send(client, connectionId, { type: 'error', message: 'Room is full' })
        return ok()
      }

      // Host socket may be dead after a bad match — reject early with a clear error.
      const hostAlive = await send(client, room.hostConnectionId, { type: 'ping', t: Date.now() })
      if (!hostAlive) {
        await deleteKey(roomPk(room.roomCode), 'META')
        await send(client, connectionId, {
          type: 'error',
          message: 'Host disconnected — ask them to create a new room',
        })
        return ok()
      }

      room.guestConnectionId = connectionId
      room.guestName = playerName
      room.status = 'ready'
      room.settings = { ...room.settings, player2Name: playerName }
      await putRoom(room)
      await putConn({
        pk: connPk(connectionId),
        sk: 'META',
        connectionId,
        roomCode,
        seat: 2,
        ttl: ttl(CONN_TTL_SECONDS),
      })

      await send(client, connectionId, {
        type: 'roomJoined',
        roomCode,
        seat: 2,
        game: room.game,
        settings: room.settings,
        hostName: room.hostName,
        playerName,
      })
      await send(client, room.hostConnectionId, {
        type: 'peerJoined',
        guestName: playerName,
        settings: room.settings,
      })
      return ok()
    }

    if (type === 'startMatch' || type === 'rematch' || type === 'input' || type === 'state') {
      const conn = await getConn(connectionId)
      if (!conn?.roomCode) {
        await send(client, connectionId, { type: 'error', message: 'Not in a room' })
        return ok()
      }
      const room = await getRoom(conn.roomCode)
      if (!room) {
        await send(client, connectionId, { type: 'error', message: 'Room expired' })
        return ok()
      }

      if (type === 'startMatch' || type === 'rematch') {
        if (room.hostConnectionId !== connectionId) {
          await send(client, connectionId, { type: 'error', message: 'Only host can start' })
          return ok()
        }
        room.status = 'playing'
        await putRoom(room)
        const payload = {
          type: type === 'rematch' ? 'rematch' : 'matchStart',
          settings: room.settings,
          game: room.game,
        }
        await send(client, room.hostConnectionId, payload)
        if (room.guestConnectionId) await send(client, room.guestConnectionId, payload)
        return ok()
      }

      const other = await peerId(room, connectionId)
      if (!other) return ok()

      if (type === 'input') {
        await send(client, other, {
          type: 'peerInput',
          seat: conn.seat,
          input: body.input,
        })
        return ok()
      }

      if (type === 'state') {
        if (room.hostConnectionId !== connectionId) return ok()
        await send(client, other, {
          type: 'peerState',
          state: body.state,
          seq: body.seq,
        })
        return ok()
      }
    }

    if (type === 'ping') {
      await send(client, connectionId, { type: 'pong', t: body.t })
      return ok()
    }

    await send(client, connectionId, { type: 'error', message: `Unknown type: ${type}` })
    return ok()
  } catch (err) {
    console.error(err)
    try {
      await send(client, connectionId, { type: 'error', message: 'Server error' })
    } catch {
      /* ignore */
    }
    return ok()
  }
}
