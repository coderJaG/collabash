import './LoadingSpinner.css';


const LoadingSpinner = () => {  
    return (<>
        <div className="pot-header">Pot Details</div>
        <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Loading ...</p>
        </div>
    </>
    );
}
export default LoadingSpinner;