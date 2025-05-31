// DraggableUserRow.jsx
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { MdDelete } from 'react-icons/md';
import { FaBars, FaCheck, FaTimes } from 'react-icons/fa';

const ItemTypes = {
    USER_ROW: 'userRow',
};

// const formatDate = (dateStr) => {
//     if (!dateStr) return 'N/A';
//     const dateObject = new Date(dateStr);
//     if (isNaN(dateObject.getTime())) return 'Invalid Date';
//     const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
//     return dateObject.toLocaleDateString(undefined, options);
// };

const DraggableUserRow = ({
    user,
    index,
    moveRow,
    canBankerEditOrder,
    currentWeek,
    weeklyStatusMap,
    handlePaymentChange,
    handleRemoveUserFromPot,
    currUser,
    potDetailsStatus,
    onDragBegin, 
    onDragOperationEnd,
    formatDate
}) => {
    const rowRef = useRef(null);
    const dragHandleRef = useRef(null);

    const [, drop] = useDrop({
        accept: ItemTypes.USER_ROW,
        hover(item, monitor) {
            if (!rowRef.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = rowRef.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            
            if (canBankerEditOrder) {
                moveRow(dragIndex, hoverIndex);
                item.index = hoverIndex;
            }
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.USER_ROW,
        item: () => {
            // This is called when a drag starts
            if (onDragBegin) onDragBegin(); // Notify parent that a drag has started
            return { id: user.id.toString(), index };
        },
        end: (item, monitor) => {
            // This is called when a drag ends (mouse up)
            if (onDragOperationEnd) {
                onDragOperationEnd(monitor.didDrop()); // Notify parent, pass if drop was successful
            }
        },
        canDrag: () => canBankerEditOrder,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    if (canBankerEditOrder) {
        drag(dragHandleRef); // Connect drag source to the handle
    }
    drop(rowRef);    // Connect drop target to the entire row
    preview(rowRef); // Connect drag preview to the entire row

    const userStatus = weeklyStatusMap[user.id] || { paidHand: false, gotDraw: false };
    const displayOrder = user.potMemberDetails?.displayOrder || index + 1;
    const userDrawDate = user.potMemberDetails?.drawDate;

    const rowStyle = {
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <tr ref={rowRef} style={rowStyle} className={`member-row ${isDragging ? 'is-dragging-react-dnd' : ''}`}>
            {canBankerEditOrder ? (
                <td ref={dragHandleRef} className="drag-handle-cell" title="Drag to reorder">
                    <FaBars />
                </td>
            ) : (
                <td>{/* Empty cell to maintain column structure */}</td>
            )}
            <td>{displayOrder}</td>
            <td>{user.firstName} {user.lastName}</td>
            <td>{formatDate(userDrawDate)}</td>
            <td>
                <input
                    type="checkbox"
                    checked={userStatus.paidHand}
                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "paidHand", e.target.checked)}
                    disabled={currUser?.role !== 'banker' || potDetailsStatus !== 'Active'}
                />
                {userStatus.paidHand ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
            </td>
            <td>
                <input
                    type="checkbox"
                    checked={userStatus.gotDraw}
                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "gotDraw", e.target.checked)}
                    disabled={currUser?.role !== 'banker' || potDetailsStatus !== 'Active' || displayOrder !== currentWeek}
                />
                {userStatus.gotDraw ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
            </td>
            <td>
                {currUser?.role === 'banker' && (potDetailsStatus === 'Not Started' || potDetailsStatus === 'Paused') && (
                    <button
                        className="finger-button-pointer"
                        onClick={() => handleRemoveUserFromPot(user.id)}
                        title="Remove User from Pot"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <MdDelete style={{ color: "#e74c3c" }} />
                    </button>
                )}
            </td>
        </tr>
    );
};

export default DraggableUserRow;
