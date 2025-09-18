import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setConnectionError(reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Reconnection event handlers
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnection attempt:', attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
        setConnectionError(error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setConnectionError('Failed to reconnect to server');
        setIsConnected(false);
      });

      setSocket(newSocket);

      // Cleanup function
      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    }
  }, [isAuthenticated, token]);

  // Join election room
  const joinElection = (electionId) => {
    if (socket && isConnected) {
      socket.emit('join-election', electionId);
    }
  };

  // Leave election room
  const leaveElection = (electionId) => {
    if (socket && isConnected) {
      socket.emit('leave-election', electionId);
    }
  };

  // Cast vote
  const castVote = (voteData) => {
    if (socket && isConnected) {
      socket.emit('cast-vote', voteData);
    }
  };

  // Request real-time results
  const requestResults = (electionId) => {
    if (socket && isConnected) {
      socket.emit('request-results', electionId);
    }
  };

  // Listen for vote updates
  const onVoteUpdate = (callback) => {
    if (socket) {
      socket.on('vote-update', callback);
      return () => socket.off('vote-update', callback);
    }
    return () => {};
  };

  // Listen for results updates
  const onResultsUpdate = (callback) => {
    if (socket) {
      socket.on('results-update', callback);
      return () => socket.off('results-update', callback);
    }
    return () => {};
  };

  // Listen for vote errors
  const onVoteError = (callback) => {
    if (socket) {
      socket.on('vote-error', callback);
      return () => socket.off('vote-error', callback);
    }
    return () => {};
  };

  // Listen for election status updates
  const onElectionStatusUpdate = (callback) => {
    if (socket) {
      socket.on('election-status-update', callback);
      return () => socket.off('election-status-update', callback);
    }
    return () => {};
  };

  // Listen for admin notifications
  const onAdminNotification = (callback) => {
    if (socket) {
      socket.on('admin-notification', callback);
      return () => socket.off('admin-notification', callback);
    }
    return () => {};
  };

  // Listen for voter notifications
  const onVoterNotification = (callback) => {
    if (socket) {
      socket.on('voter-notification', callback);
      return () => socket.off('voter-notification', callback);
    }
    return () => {};
  };

  // Get connection status
  const getConnectionStatus = () => {
    return {
      isConnected,
      connectionError,
      socketId: socket?.id || null
    };
  };

  // Reconnect manually
  const reconnect = () => {
    if (socket) {
      socket.connect();
    }
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    joinElection,
    leaveElection,
    castVote,
    requestResults,
    onVoteUpdate,
    onResultsUpdate,
    onVoteError,
    onElectionStatusUpdate,
    onAdminNotification,
    onVoterNotification,
    getConnectionStatus,
    reconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
