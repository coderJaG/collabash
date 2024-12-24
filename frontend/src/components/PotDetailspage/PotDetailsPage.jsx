import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import * as potsActions from '../../store/pots'
import { useParams } from "react-router-dom";
import './PotDetailsPage.css'



const PotDetailsPage = () => {
    const dispatch = useDispatch();
    const { potId } = useParams();
    const potDetails = useSelector(state => state.pots.pot);
    const [errors, setErrors] = useState({})

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/pots/${potId}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "An error occurred");
                }
                dispatch(potsActions.getAPotById(potId));
            } catch (error) {
                setErrors({ message: error.message });
            }
        };
        fetchData();
    }, [dispatch, potId]);

    const formatDate = (dateStr) => {
        const dateObject = new Date(dateStr);
        const month = dateObject.getMonth() + 1
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        const result = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        return result;
    }



    return (
        <>

            <h1 className="pot-header">Pot Details</h1>
            <div className="error">
                {errors && <p>{errors.message}</p>}
            </div>
            {potDetails && <div className="pot-container">
                <div className='banker-div'>
                    <div className="banker">Banker</div>
                    <div className="banker-name">{potDetails.ownerName}</div>
                </div>
                <div className="pot-name-div">
                    <div className="pot-name-header">  Pot Name</div>
                    <div className="pot-name">{potDetails.name}</div>
                </div>
                <div className="pot-dates-div">
                    <div>Start Date</div>
                    <div className="pot-date-start">{formatDate(potDetails.startDate)}</div>
                    <div>End Date</div>
                    <div className="pot-date-end">{formatDate(potDetails.endDate)}</div>
                </div>
                <div className="pot-amount-div">
                    <div>Pot Amount</div>
                    <div className="pot-amount">{`$${Number.parseFloat(potDetails.amount).toFixed(2)}`}</div>
                </div>
                <div className="active-div">
                    <div>Active</div>
                    <div className="active">{potDetails.active ? 'Yes' : 'No'}</div>
                </div>
                <div className="members-div">
                    <div>Members</div>
                    <div className="members">
                        <ul>
                            <li>Total Members: {potDetails.Users.length}</li>
                            {potDetails.Users.map(user => (
                                <li key={user.id}>{user.firstName} {user.lastName}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>}
        </>
    )
};


export default PotDetailsPage;