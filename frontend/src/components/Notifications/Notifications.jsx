import { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/SocketContext';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { fetchReceivedRequests, fetchSentRequests, respondToRequest } from '../../store/requests';
import './Notifications.css';

// ✅ NEW: A key to use for saving dismissed notifications in localStorage
const DISMISSED_NOTIFICATIONS_KEY = 'dismissedNotifications';

const Notifications = () => {
    const socket = useSocket();
    const dispatch = useDispatch();
    
    const sessionUser = useSelector(state => state.session.user);
    const receivedRequests = useSelector(state => Object.values(state.requests.receivedRequests), shallowEqual);
    const sentRequests = useSelector(state => Object.values(state.requests.sentRequests), shallowEqual);
    
    const [isOpen, setIsOpen] = useState(false);
    
    // ✅ UPDATED: Initialize dismissedRequests state from localStorage
    const [dismissedRequests, setDismissedRequests] = useState(() => {
        const savedDismissed = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
        try {
            const parsed = savedDismissed ? JSON.parse(savedDismissed) : [];
            return new Set(parsed);
        } catch (e) {
            return new Set();
        }
    });
    
    const notificationsRef = useRef(null);

    // const notificationsToDisplayForBanker = receivedRequests;
    const notificationsToDisplayForStandard = sentRequests.filter(req => !dismissedRequests.has(req.id));
    
    const unreadCount = sessionUser?.role === 'banker' 
        ? receivedRequests.length 
        : sentRequests.filter(req => req.status !== 'pending' && !dismissedRequests.has(req.id)).length;

    useEffect(() => {
        if (sessionUser?.role === 'banker') {
            dispatch(fetchReceivedRequests());
        } else if (sessionUser?.role === 'standard') {
            dispatch(fetchSentRequests());
        }
    }, [dispatch, sessionUser]);

    useEffect(() => {
        if (!socket || !sessionUser) return;

        const handleNewRequest = () => {
            if (sessionUser.role === 'banker') {
                toast.info(`🔔 You have a new join request!`);
                dispatch(fetchReceivedRequests());
            }
        };

        const handleRequestResponse = (data) => {
             if (sessionUser.role === 'standard') {
                const toastMessage = `🔔 ${data.message}`;
                if (data.status === 'approved') toast.success(toastMessage);
                else toast.error(toastMessage);
                dispatch(fetchSentRequests());
                // ✅ When a response comes in, undismiss it so the user sees it again
                setDismissedRequests(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.potId); // Assuming data contains the request ID or a related ID
                    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newSet)));
                    return newSet;
                });
            }
        };

        socket.on('new_join_request', handleNewRequest);
        socket.on('join_request_response', handleRequestResponse);

        return () => {
            socket.off('new_join_request', handleNewRequest);
            socket.off('join_request_response', handleRequestResponse);
        };
    }, [socket, dispatch, sessionUser]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleBellClick = () => setIsOpen(prev => !prev);
    const handleApprove = (e, requestId) => { e.stopPropagation(); dispatch(respondToRequest(requestId, 'approved')); };
    const handleDeny = (e, requestId) => { e.stopPropagation(); dispatch(respondToRequest(requestId, 'denied')); };
    
    const handleDismiss = (e, requestId) => {
        e.stopPropagation();
        const newDismissedSet = new Set(dismissedRequests).add(requestId);
        setDismissedRequests(newDismissedSet);
        // ✅ UPDATED: Save the new set to localStorage
        localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newDismissedSet)));
    };

    if (!sessionUser) return null;
    
    const renderBankerNotifications = () => (
        receivedRequests.map((req) => (
            <div key={req.id} className="notification-item">
                <p><strong>{req.requester.firstName} {req.requester.lastName}</strong> wants to join <strong>{req.Pot.name}</strong>.</p>
                <div className="notification-actions">
                    <button className="approve-button" onClick={(e) => handleApprove(e, req.id)}>Approve</button>
                    <button className="deny-button" onClick={(e) => handleDeny(e, req.id)}>Deny</button>
                </div>
            </div>
        ))
    );
    
    const renderStandardUserNotifications = () => (
        notificationsToDisplayForStandard.map((req) => (
            <div key={req.id} className={`notification-item status-${req.status}`}>
                <div className="notification-content">
                    <p>Your request to join <strong>{req.Pot.name}</strong> is <strong>{req.status}</strong>.</p>
                </div>
                {req.status !== 'pending' && (
                     <button className="dismiss-button" title="Dismiss" onClick={(e) => handleDismiss(e, req.id)}>
                        <FaTimes />
                    </button>
                )}
            </div>
        ))
    );

    return (
        <div className="notifications-container" ref={notificationsRef}>
            <button onClick={handleBellClick} className="notification-bell-button">
                <FaBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        {sessionUser.role === 'banker' ? "Pending Join Requests" : "My Requests"}
                    </div>
                    <div className="notifications-list">
                        {(sessionUser.role === 'banker' && receivedRequests.length === 0) || (sessionUser.role === 'standard' && notificationsToDisplayForStandard.length === 0) ? (
                            <div className="notification-item">No notifications.</div>
                        ) : (
                            sessionUser.role === 'banker' ? renderBankerNotifications() : renderStandardUserNotifications()
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;