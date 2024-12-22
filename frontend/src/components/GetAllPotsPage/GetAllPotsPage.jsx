import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne } from "react-icons/md";
import { NavLink, useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots'
import "./GetAllPotsPage.css";


const GetAllPotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user)
    const allPots = useSelector(state => state.pots)

    useEffect(() => {
        dispatch(potsActions.getPots());
        if (!allPots) {
            return <div>...Loading Pots</div>
        }
    }, [dispatch])

    //format dates helper
    const formatDate = (dateStr) => {
        const dateObject = new Date(dateStr);
        const month = dateObject.getMonth() + 1
        const day = dateObject.getDate();
        const year = dateObject.getFullYear();
        const result = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        return result;
    }
    const showPots = currUser && currUser.role === 'banker' ? (
        <div className="pots-container">
            <table>
                <thead >
                    <tr className="">
                        <th>Pot</th>
                        <th>Amount</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Active</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.values(allPots).map(pot => (
                        <tr key={pot.id}>
                            <td>
                                <NavLink className='pot-link' to={`/pots/${pot.id}`} >
                                    {pot.name}
                                </NavLink>
                            </td>
                            <td>{pot.amount}</td>
                            <td>{formatDate(pot.startDate)}</td>
                            <td>{formatDate(pot.endDate)}</td>
                            <td>{pot.active ? 'Yes' : 'No'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ) : (
        <>
            <p>You are not authorized to view pots</p>
        </>
    )

    return (

        <>


            <div className="all-pots-container">
                <h1>POTS</h1>
                 <button className="create-pot-button"
                 onClick={()=> navigate('/pots/create')}>  <MdPlusOne style={{ fontSize: 15, color: 'white', fontWeight: 'bold' }} /></button>
                {showPots}
            </div>
        </>
    )
};


export default GetAllPotsPage;