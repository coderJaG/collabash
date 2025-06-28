import { useSelector } from "react-redux";
import UserProfilePage from "../UserProfilePage";
import OpenModalButton from "../OpenModalButton";
import SignUpFormModal from "../SignUpFormModal";
import "./LandingPage.css";

const LandingPage = () => {
    const currUser = useSelector(state => state.session.user);

    const landingPage = currUser ? (
        <UserProfilePage />
    ) : (
        <div className="landing-page-wrapper">
            <div className="landing-page-content">
                <div className="landing-page-header">
                    <h1>Welcome to Collabash!</h1>
                    <p>
                        A collaborative way to save and manage money with friends and family.
                    </p>
                </div>

                <div className="get-started-button">
                    <OpenModalButton
                        buttonText="Get Started"
                        modalComponent={<SignUpFormModal />}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <>
            {landingPage}
        </>
    );
};

export default LandingPage;
