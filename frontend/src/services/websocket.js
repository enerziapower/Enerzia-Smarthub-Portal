// WebSocket service for real-time data synchronization

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnecting = false;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Determine WebSocket URL based on environment
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/sync`;

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            // Heartbeat response, ignore
            return;
          }

          if (message.type === 'data_update') {
            // Notify all listeners about the update
            this.notifyListeners(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        clearInterval(this.pingInterval);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    clearInterval(this.pingInterval);
  }

  // Subscribe to updates for a specific entity type
  subscribe(entityType, callback) {
    if (!this.listeners.has(entityType)) {
      this.listeners.set(entityType, new Set());
    }
    this.listeners.get(entityType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(entityType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Subscribe to all updates
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  notifyListeners(message) {
    const { entity } = message;

    // Notify specific entity listeners
    const entityListeners = this.listeners.get(entity);
    if (entityListeners) {
      entityListeners.forEach(callback => callback(message));
    }

    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => callback(message));
    }
  }
}

// Create singleton instance
const wsService = new WebSocketService();

export default wsService;
