import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";


const LandingPage = () => {
    const dispacth = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const role = currUser.role



    const landingPage = currUser ? (
        <>
            <h1> Welcome back to Collabash!!!</h1>
        </>
    ) : (
        <>
            <h1> Welcome to Collabash!!!</h1>
        </>
    )


    return (
        <>
            {landingPage}
        </>
    )
};



export default LandingPage;