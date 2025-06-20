import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { MdDelete } from 'react-icons/md';
import { FaBars, FaCheck, FaTimes } from 'react-icons/fa';
import OpenModalButton from '../OpenModalButton';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import './DraggableUserRow.css'; 

const ItemTypes = {
    USER_ROW: 'userRow',
};

const DraggableUserRow = ({
    user,
    index,
    moveRow,
    canBankerEditOrder, // This prop controls the drag handle and reordering
    currentWeek,
    weeklyStatusMap,
    handlePaymentChange,
    handleRemoveUserFromPot,
    potDetailsStatus,
    onDragBegin, 
    onDragOperationEnd,
    formatDate,
    // ✅ NEW: Props for permission-based control
    canManagePayments,
    canManageMembers 
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
            if (onDragBegin) onDragBegin();
            return { id: user.id.toString(), index };
        },
        end: (item, monitor) => {
            if (onDragOperationEnd) {
                onDragOperationEnd(monitor.didDrop());
            }
        },
        canDrag: () => canBankerEditOrder,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    if (canBankerEditOrder) {
        drag(dragHandleRef);
    }
    drop(rowRef);
    preview(rowRef);

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
                    // ✅ UPDATED: Use canManagePayments prop for disabled logic
                    disabled={!canManagePayments}
                />
                {userStatus.paidHand ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
            </td>
            <td>
                <input
                    type="checkbox"
                    checked={userStatus.gotDraw}
                    onChange={(e) => handlePaymentChange(user.id, currentWeek, "gotDraw", e.target.checked)}
                    // ✅ UPDATED: Use canManagePayments prop and other conditions
                    disabled={!canManagePayments || displayOrder !== currentWeek}
                />
                {userStatus.gotDraw ? <FaCheck style={{ color: "green", marginLeft: '5px' }} /> : <FaTimes style={{ color: "red", marginLeft: '5px' }} />}
            </td>
            <td>
                {/* ✅ UPDATED: Use canManageMembers prop */}
                {canManageMembers && (potDetailsStatus === 'Not Started' || potDetailsStatus === 'Paused') && (
                    <OpenModalButton
                        buttonText={<MdDelete />}
                        className="delete-user-from-pot-button finger-button-pointer"
                        modalComponent={
                            <DeleteConfirmationModal
                                message={`Are you sure you want to remove ${user.firstName} ${user.lastName} from the pot? This action cannot be undone.`}
                                onConfirm={() => handleRemoveUserFromPot(user.id)}
                                confirmButtonText="Yes, Remove"
                                cancelButtonText="No, Cancel"
                            />
                        }
                        title="Remove User from Pot"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    />
                )}
            </td>
        </tr>
    );
};

export default DraggableUserRow;