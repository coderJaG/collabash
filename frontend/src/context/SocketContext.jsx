import { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';

// Create the context
export const SocketContext = createContext();

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext);

// Provider component to wrap your application
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const sessionUser = useSelector(state => state.session.user);

    useEffect(() => {
        let newSocket;

        if (sessionUser) {
            // Establish connection only when a user is logged in.
            // The URL point to backend. In development, it connects directly.
            // In production, your server setup handles the routing.
            const socketURL = import.meta.env.MODE === 'production'
                ? window.location.origin
                : 'http://localhost:8000';

            newSocket = io(socketURL);

            // When the connection is established, emit a 'join' event with the userId.
            // The backend will use this to map the userId to their unique socket.id.
            newSocket.on('connect', () => {
                console.log("Socket connected, joining room with user ID:", sessionUser.id);
                newSocket.emit('join', sessionUser.id);
            });

            setSocket(newSocket);
        }

        // Cleanup function to disconnect the socket when the user logs out or the component unmounts.
        return () => {
            if (newSocket) {
                console.log("Disconnecting socket.");
                newSocket.disconnect();
            }
        };
    }, [sessionUser]); // This effect re-runs when the user logs in or out.

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};