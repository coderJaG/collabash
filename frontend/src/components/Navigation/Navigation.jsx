import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

import ProfileButton from "../ProfileButton";
import OpenModalButton from "../OpenModalButton";
import LoginFormModal from "../LoginFormModal";
import SignUpFormModal from "../SignUpFormModal";




const Navigation = ({ isLoaded }) => {

    const currUser = useSelector(state => state.session.user);

    const sessionNavLinks = currUser ? (
        <>
            <li><ProfileButton user={currUser} /></li>

        </>
    ) : (
        <>
            <li className="login"><OpenModalButton
                buttonText="Log In"
                modalComponent={<LoginFormModal />}
            /></li>
            <li><OpenModalButton
                buttonText="Sign Up"
                modalComponent={<SignUpFormModal />}
            /></li>
        </>
    )


    return (
        <>
            <h1>NAVIGATION</h1>
            <ul>
                <li><NavLink to={'/'}>Home</NavLink></li>
                {isLoaded && sessionNavLinks}
            </ul>
        </>
    )
};


export default Navigation;