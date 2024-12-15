import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

import ProfileButton from "../ProfileButton";



const Navigation = ({ isLoaded }) => {

    const currUser = useSelector(state => state.session.user);

    const sessionNavLinks = currUser ? (
        <>
            <li><ProfileButton user={currUser} /></li>

        </>
    ) : (
        <>
            <li><NavLink to={'/login'}>Log In</NavLink></li>
            <li><NavLink to={'/signup'}>Sign Up</NavLink></li>
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