const WS_URL = "ws://localhost:8000/ws";

let socket = null;
let reconnectTimer = null;

export function connectWebSocket(onMessage) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  const ws = new WebSocket(WS_URL);
  socket = ws;

  ws.onopen = () => {
    console.log("[ws] connected to", WS_URL);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("[ws] parse error:", e);
    }
  };

  ws.onclose = () => {
    if (socket === ws) {
      socket = null;
    }
    reconnectTimer = setTimeout(() => connectWebSocket(onMessage), 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
}
