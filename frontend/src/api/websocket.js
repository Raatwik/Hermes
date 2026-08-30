const WS_URL = "ws://localhost:8000/ws";

let socket = null;
let reconnectTimer = null;

export function connectWebSocket(onMessage) {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("[ws] connected to", WS_URL);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("[ws] parse error:", e);
    }
  };

  socket.onclose = () => {
    console.log("[ws] disconnected, reconnecting in 3s...");
    reconnectTimer = setTimeout(() => connectWebSocket(onMessage), 3000);
  };

  socket.onerror = (err) => {
    console.error("[ws] error:", err);
    socket.close();
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
