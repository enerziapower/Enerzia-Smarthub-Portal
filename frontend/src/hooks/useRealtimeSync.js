import { useEffect, useCallback, useRef, useState } from 'react';
import wsService from '../services/websocket';

/**
 * Custom hook for real-time data synchronization
 * @param {string} entityType - The type of entity to listen for (e.g., 'project', 'user', '*' for all)
 * @param {function} onUpdate - Callback function when an update is received
 * @param {function} refreshData - Function to refresh the data (optional)
 */
export const useRealtimeSync = (entityType, onUpdate, refreshData = null) => {
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleUpdate = useCallback((message) => {
    console.log('Real-time update received:', message);
    
    // Call the onUpdate callback
    if (onUpdate) {
      onUpdate(message);
    }

    // Optionally refresh the data
    if (refreshData) {
      refreshData();
    }
  }, [onUpdate, refreshData]);

  useEffect(() => {
    // Connect to WebSocket if not already connected
    if (!isConnectedRef.current) {
      wsService.connect();
      isConnectedRef.current = true;
      setIsConnected(true);
    }

    // Subscribe to updates
    const unsubscribe = wsService.subscribe(entityType, handleUpdate);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [entityType, handleUpdate]);

  return {
    isConnected
  };
};

/**
 * Hook to connect WebSocket on app load
 */
export const useWebSocketConnection = () => {
  useEffect(() => {
    wsService.connect();

    return () => {
      // Don't disconnect on component unmount as we want persistent connection
      // wsService.disconnect();
    };
  }, []);
};

export default useRealtimeSync;
