import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdPlusOne } from "react-icons/md";
import { ClipLoader, BarLoader, PuffLoader } from 'react-spinners';
import { NavLink, useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots'
import "./GetAllPotsPage.css";


const GetAllPotsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const isLoading = useSelector(state => state.pots.isLoadingList);
    const error = useSelector(state => state.pots.errorList);
    const allPotsMap = useSelector(state => state.pots.allById);

    useEffect(() => {
        if (!Object.keys(allPotsMap).length) {
            dispatch(potsActions.getPots());
        }
    }, [dispatch])


    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                {/* ClipLoader */}
                <ClipLoader color={"#588157"} loading={true} size={50} aria-label="Loading Spinner" />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pot Details...</p>

                {/*PuffLoader )
                <PuffLoader color={"#36D7B7"} loading={true} size={60} />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pot Details...</p>
                */}

                {/* BarLoader )
                <BarLoader color={"#588157"} loading={true} height={4} width={100} />
                <p style={{ marginTop: '10px', color: '#555' }}>Loading Pot Details...</p>
                */}
            </div>
        );
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    //convert allPotsMap to an array
    const allPotsArray = allPotsMap ? Object.values(allPotsMap) : [];

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
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {allPotsArray.map(pot => (
                        <tr key={pot.id}>
                            <td>
                                <NavLink className='pot-link' to={`/pots/${pot.id}`} >
                                    {pot.name}
                                </NavLink>
                            </td>
                            <td>{pot.amount}</td>
                            <td>{formatDate(pot.startDate)}</td>
                            <td>{formatDate(pot.endDate)}</td>
                            <td>{pot.status}</td>
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
                    onClick={() => navigate('/pots/create')}>  <MdPlusOne style={{ fontSize: 15, color: 'white', fontWeight: 'bold' }} /></button>
                {showPots}
            </div>
        </>
    )
};


export default GetAllPotsPage;