/**
 * server.ts - WebSocket proxy/mock server for mope.io archive
 *
 * Listens on port 3000 (matching the orchids tunnel).
 * - /ws/:port/ping  → accepts the liveness test connection
 * - /ws/:port       → handles the actual game binary protocol
 *
 * Since this is a static archive without the real game server,
 * this server accepts WebSocket connections and responds to the
 * mope.io binary handshake so the client gets past "Connecting..."
 */

const PORT = 3000;
const GAME_VERSION = 0x128; // matches client.js $config.gameVersion

// ── Binary protocol helpers (mirrors client.js _0x2293a6 / _0x4dbf94) ──

class BinaryWriter {
  private buffer: ArrayBuffer;
  private dv: DataView;
  private len = 0;

  constructor(size: number) {
    this.buffer = new ArrayBuffer(size);
    this.dv = new DataView(this.buffer);
  }

  writeUInt8(v: number) {
    this.dv.setUint8(this.len, v);
    this.len += 1;
  }
  writeUInt16(v: number) {
    this.dv.setUint16(this.len, v, false); // big-endian
    this.len += 2;
  }
  writeInt16(v: number) {
    this.dv.setInt16(this.len, v, false);
    this.len += 2;
  }
  writeUInt32(v: number) {
    this.dv.setUint32(this.len, v, false);
    this.len += 4;
  }
  writeString(s: string) {
    const encoded = s;
    this.writeUInt16(encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      this.writeUInt8(encoded.charCodeAt(i));
    }
  }
  getBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.len);
  }
}

// ── WebSocket server ──

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Match /ws/:port or /ws/:port/ping
    const match = path.match(/^\/ws\/(\d+)(\/ping)?$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const port = parseInt(match[1], 10);
    const isPing = !!match[2];

    const success = server.upgrade(req, {
      data: {
        port,
        isPing,
        difficulty: url.searchParams.get("difficulty") || "normal",
      },
    });

    if (success) {
      return undefined; // upgraded
    }

    return new Response("WebSocket upgrade failed", { status: 400 });
  },
  websocket: {
    message(ws, message) {
      const data = ws.data as any;

      // If this is a ping test, just echo back a simple acknowledgment
      if (data.isPing) {
        // Send a minimal response to satisfy the ping
        const buf = Buffer.from("pong");
        ws.send(buf);
        return;
      }

      // Handle binary game protocol messages
      if (message instanceof ArrayBuffer || message instanceof Buffer) {
        const buf = message instanceof Buffer ? message : Buffer.from(message);

        if (buf.length < 1) return;

        const msgType = buf.readUInt8(0);

        switch (msgType) {
          case 0x01: {
            // Client handshake (type 0x01 = _0x256e73)
            // Parse the client's session ID from the message
            // Format: type(1) + u16(2) + u16(2) + u16(2) + string(n)
            let offset = 1 + 2 + 2 + 2; // skip type + 3 x u16 fields
            const strLen = buf.readUInt16BE(offset);
            offset += 2;
            let sessionId = "";
            // readString skips the last byte (null terminator)
            for (let i = 0; i < strLen - 1; i++) {
              sessionId += String.fromCharCode(buf.readUInt8(offset++));
            }

            // Build handshake response (type 0x02 = _0x461fd4)
            const writer = new BinaryWriter(256);
            writer.writeUInt8(0x02); // message type: handshake response
            writer.writeString(sessionId || "mock-session");
            writer.writeUInt16(GAME_VERSION);
            writer.writeUInt8(0); // gameMode
            writer.writeUInt8(0); // season
            writer.writeString("mock-server-1");
            writer.writeUInt8(0); // isAliveInGame = false
            writer.writeUInt16(0); // static object count = 0

            ws.send(writer.getBuffer());
            console.log(`[Server] Handshake complete for session: ${sessionId}`);
            break;
          }

          case 0x11: {
            // Game dimensions request (type 0x11 = _0x276a1c)
            // Respond with game dimensions
            const writer = new BinaryWriter(16);
            writer.writeUInt8(0x11); // message type
            writer.writeUInt16(4000); // gameWidth
            writer.writeUInt16(4000); // gameHeight
            writer.writeUInt16(2000); // camX
            writer.writeUInt16(2000); // camY
            writer.writeUInt16(1000); // camZoom (in units of 1/1000)

            ws.send(writer.getBuffer());
            console.log(`[Server] Sent game dimensions`);
            break;
          }

          default: {
            // Unknown message type - echo back for debugging
            console.log(`[Server] Unknown message type: 0x${msgType.toString(16)}`);
            break;
          }
        }
      }
    },
    open(ws) {
      const data = ws.data as any;
      console.log(
        `[Server] WebSocket opened: port=${data.port}, ping=${data.isPing}, difficulty=${data.difficulty}`
      );

      // For ping tests, the test is just "can we open a WS" - already succeeded
      if (data.isPing) {
        // Send a simple acknowledgment and close after a brief moment
        setTimeout(() => {
          try { ws.close(); } catch {}
        }, 100);
      }
    },
    close(ws, code, reason) {
      const data = ws.data as any;
      console.log(
        `[Server] WebSocket closed: port=${data?.port}, code=${code}, reason=${reason || "none"}`
      );
    },
    error(ws, error) {
      console.log(`[Server] WebSocket error:`, error);
    },
    drain(ws) {
      // no-op
    },
  },
});

console.log(`[Server] Listening on http://localhost:${PORT}`);
console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}/ws/:port`);