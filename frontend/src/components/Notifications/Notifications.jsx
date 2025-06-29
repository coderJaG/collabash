import { useState, useEffect, useRef, useMemo } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/SocketContext';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { fetchReceivedRequests, fetchSentRequests, respondToRequest } from '../../store/requests';
import './Notifications.css';

const DISMISSED_NOTIFICATIONS_KEY = 'dismissedNotifications';

const Notifications = () => {
    const socket = useSocket();
    const dispatch = useDispatch();

    const currUser = useSelector(state => state.session.user);
    const receivedRequests = useSelector(state => Object.values(state.requests.receivedRequests), shallowEqual);
    const sentRequests = useSelector(state => Object.values(state.requests.sentRequests), shallowEqual);

    const [isOpen, setIsOpen] = useState(false);
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

    // Check for permissions from the user object
    const userPermissions = useMemo(() => new Set(currUser?.permissions || []), [currUser]);
    const canRespondToRequests = userPermissions.has('request:respond');

    const notificationsToDisplay = canRespondToRequests ? receivedRequests : sentRequests.filter(req => !dismissedRequests.has(req.id));
    const unreadCount = canRespondToRequests
        ? receivedRequests.length
        : sentRequests.filter(req => req.status !== 'pending' && !dismissedRequests.has(req.id)).length;

    // Fetch initial data based on user permissions
    useEffect(() => {
        if (canRespondToRequests) {
            dispatch(fetchReceivedRequests());
        } else if (currUser) { // Any other logged-in user
            dispatch(fetchSentRequests());
        }
    }, [dispatch, currUser, canRespondToRequests]);

    // Set up socket listeners
    useEffect(() => {
        if (!socket || !currUser) return;

        const handleNewRequest = (data) => {
            if (canRespondToRequests) {
                toast.info(`🔔 ${data.message}`);
                dispatch(fetchReceivedRequests());
            }
        };

        const handleRequestResponse = (data) => {
            if (!canRespondToRequests) { // Only standard users should get these toasts
                const toastMessage = `🔔 ${data.message}`;
                if (data.status === 'approved') toast.success(toastMessage);
                else toast.error(toastMessage);
                dispatch(fetchSentRequests());

                setDismissedRequests(prev => {
                    const newSet = new Set(prev);
                    // The server should send back the request ID to make this reliable.
                    // Assuming the response data contains the original request id as `requestId`
                    if (data.requestId) newSet.delete(data.requestId);
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
    }, [socket, dispatch, currUser, canRespondToRequests]);

    // Effect to handle closing the dropdown when clicking outside
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
        localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(newDismissedSet)));
    };

    if (!currUser) return null;

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
        notificationsToDisplay.map((req) => (
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
                        {canRespondToRequests ? "Pending Join Requests" : "My Requests"}
                    </div>
                    <div className="notifications-list">
                        {notificationsToDisplay.length === 0 ? (
                            <div className="notification-item">No notifications.</div>
                        ) : (
                            canRespondToRequests ? renderBankerNotifications() : renderStandardUserNotifications()
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
