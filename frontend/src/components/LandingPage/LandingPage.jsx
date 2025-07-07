// LandingPage.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
    MdAccountBalance, 
    MdGroups, 
    MdSavings, 
    MdTrendingUp,
    MdArrowForward,
    MdSecurity,
    // MdMobile,
    MdAnalytics
} from "react-icons/md";
import OpenModalButton from "../OpenModalButton";
import LoginFormModal from "../LoginFormModal";
import SignUpFormModal from "../SignUpFormModal";
import "./LandingPage.css";

const LandingPage = () => {
    const currUser = useSelector(state => state.session.user);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    // If the user is logged in, immediately navigate to the dashboard.
    if (currUser) {
        return <Navigate to="/dashboard" replace />;
    }

    const features = [
        {
            icon: <MdGroups />,
            title: "Collaborative Saving",
            description: "Join forces with friends and family to reach financial goals together"
        },
        {
            icon: <MdSecurity />,
            title: "Secure & Trusted",
            description: "Bank-level security to keep your money and data safe"
        },
        {
            icon: <MdAnalytics />,
            title: "Smart Analytics",
            description: "Track progress and insights to optimize your savings strategy"
        }
    ];

    return (
        <div className="landing-page-wrapper">
            {/* Animated background elements */}
            <div className="floating-elements">
                <div className="floating-circle circle-1"></div>
                <div className="floating-circle circle-2"></div>
                <div className="floating-circle circle-3"></div>
            </div>

            <div className={`landing-page-content ${isVisible ? 'fade-in' : ''}`}>
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-badge">
                        <MdTrendingUp className="badge-icon" />
                        <span>The Future of Collaborative Finance</span>
                    </div>
                    
                    <h1 className="hero-title">
                        Save <span className="gradient-text">Together</span>,
                        <br />
                        Achieve <span className="gradient-text">More</span>
                    </h1>
                    
                    <p className="hero-description">
                        Collabash revolutionizes how you save money by bringing friends and family 
                        together in collaborative savings pots. Reach your financial goals faster 
                        with the power of community.
                    </p>

                    <div className="cta-buttons">
                        <OpenModalButton
                            buttonText={
                                <span className="button-content">
                                    Get Started Free
                                    <MdArrowForward className="button-icon" />
                                </span>
                            }
                            modalComponent={<SignUpFormModal />}
                            className="primary-cta"
                        />
                        
                        <OpenModalButton
                            buttonText="Sign In"
                            modalComponent={<LoginFormModal />}
                            className="secondary-cta"
                        />
                    </div>
                </div>

                {/* Features Section */}
                <div className="features-section">
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">
                                    {feature.icon}
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Section */}
                <div className="stats-section">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <MdAccountBalance className="stat-icon" />
                            <div className="stat-number">$2.5M+</div>
                            <div className="stat-label">Saved Together</div>
                        </div>
                        <div className="stat-item">
                            <MdGroups className="stat-icon" />
                            <div className="stat-number">10K+</div>
                            <div className="stat-label">Active Users</div>
                        </div>
                        <div className="stat-item">
                            <MdSavings className="stat-icon" />
                            <div className="stat-number">500+</div>
                            <div className="stat-label">Saving Pots</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="scroll-indicator">
                <div className="scroll-dot"></div>
            </div>
        </div>
    );
};

export default LandingPage;