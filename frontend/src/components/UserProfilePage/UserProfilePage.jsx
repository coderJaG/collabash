import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import * as potsActions from "../../store/pots";
import "./UserProfilePage.css";







const BankerPage = () => {

    const dispatch = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const allPots = useSelector(state => state.pots.allById);// all pots 
    const userPots = Object.values(allPots).filter(pot => pot.ownerId === currUser.id); // filter pots owned by current user by user id
    
    useEffect(() => {
        dispatch(potsActions.getPots());
    }, [dispatch]);




    return (
        <div className="user-page-wrapper">
            <div className="user-page-header"><h1> PROFILE PAGE</h1></div>
            <div className="user-info-card">
                <div className="user-name-div">
                    <p>Name: {currUser.firstName} {currUser.lastName}</p>
                </div>
                <div className="user-username-div">
                    <p>Username: {currUser.username}</p>
                </div>
                <div className="user-email-div">
                    <p>Email: {currUser.email}</p>
                </div>
                <div className="user-mobile-div">
                    <p>Mobile: {currUser.mobile}</p>
                </div>
                <div className="user-role-div">
                    <p>Role: {currUser.role}</p>
                </div>
            </div>
            <div className="user-pots-list">
                <h2>YOUR POTS</h2>
                {userPots.length > 0 ? (
                    <div className="pot-item">
                        <table>
                            <thead>
                                <tr>
                                    <th>POT</th>
                                    <th>POT VALUE</th>
                                    <th>TOTAL MEMBERS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userPots.map(pot => (
                                    <tr key={pot.id}>
                                        <td>{pot.name}</td>
                                        <td>${pot.amount.toFixed(2)}</td>
                                        <td>{pot.Users.length}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                ) : (
                    <div className="no-pots-message">   
                    <p>You have no pots.</p>
                    </div>
                )}
            </div>
        </div>
    )
};

export default BankerPage;