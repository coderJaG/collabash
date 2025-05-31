// LandingPage.jsx

import { useSelector } from "react-redux";
import UserProfilePage from "../UserProfilePage";
import OpenModalButton from "../OpenModalButton";
import SignUpFormModal from "../SignUpFormModal";
import "./LandingPage.css";





const LandingPage = () => {
    // const dispacth = useDispatch();
    const currUser = useSelector(state => state.session.user);
    // const role = currUser?.role



    const landingPage = currUser && currUser ? (

        < UserProfilePage />

    ) :  (
        <div className="landing-page-wrapper">
            <div className="landing-page-header">
                <h1> Welcome to Collabash!!!</h1>
                <div className="get-started-button">
                    <OpenModalButton
                        buttonText="Get Started"
                        modalComponent={<SignUpFormModal />}
                        modalClassName="signup-modal-button"
                    />
                </div>
            </div>
        
        </div>
    )


    return (
        <>
            {landingPage}
        </>
    )
};



export default LandingPage;