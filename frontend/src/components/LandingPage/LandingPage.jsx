import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import BankerPage from "../BankerPage";
import StandardUserPage from "./StandardUserPage";


const LandingPage = () => {
    const dispacth = useDispatch();
    const currUser = useSelector(state => state.session.user);
    const role = currUser?.role



    const landingPage = currUser && role === 'banker' ? (
        
            < BankerPage />
        
    ) : currUser && role === 'standard' ? (
    
            < StandardUserPage />
        
    ) : (
        
            <h1> Welcome to Collabash!!!</h1>
        
    )


    return (
        <>
            {landingPage}
        </>
    )
};



export default LandingPage;