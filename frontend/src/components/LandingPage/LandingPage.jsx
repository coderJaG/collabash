import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom"; // Import the Navigate component
import OpenModalButton from "../OpenModalButton";
import LoginFormModal from "../LoginFormModal";
import "./LandingPage.css";

const LandingPage = () => {
    const currUser = useSelector(state => state.session.user);

    // If the user is logged in, immediately navigate to the dashboard.
    if (currUser) {
        return <Navigate to="/dashboard" replace />;
    }

    // If no user is logged in, display the public landing page.
    return (
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
                        modalComponent={<LoginFormModal />}
                    />
                </div>
            </div>
        </div>
    );
};

export default LandingPage;