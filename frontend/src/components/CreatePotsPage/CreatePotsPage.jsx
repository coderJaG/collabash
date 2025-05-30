import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots';
import './CreatePotsPage.css'; 

const CreatePotsPage = () => {
    const dispatch = useDispatch(); 
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);

    const [name, setName] = useState('');
    const [hand, setHand] = useState('');
    const [amount, setAmount] = useState(''); 
    const defaultDate = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(defaultDate);
    const [endDate, setEndDate] = useState(defaultDate);
    const [errors, setErrors] = useState({});

    // Authorization check
    useEffect(() => {
        if (!currUser || currUser.role !== 'banker') {
            navigate('/');
        }
    }, [currUser, navigate]);

    
    if (!currUser || currUser.role !== 'banker') {
        return null; 
    }

    const ownerId = currUser.id; 

    const handleSubmit = async (e) => { 
        e.preventDefault();
        setErrors({}); 

        // Basic frontend validation (backend also validate thoroughly)
        const formErrors = {};
        if (!name.trim()) formErrors.name = "Pot name is required.";
        if (isNaN(parseFloat(hand)) || parseFloat(hand) <= 0) formErrors.hand = "Amount per hand must be a positive number.";
        // if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) formErrors.amount = "Pot amount must be a positive number.";
        if (!startDate) formErrors.startDate = "Start date is required.";
      

        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        const potData = {
            ownerId,
            name,
            hand: parseFloat(hand), 
            amount: parseFloat(amount) || 0, 
            startDate,
            endDate,
        };

        try {
            const createdPot = await dispatch(potsActions.createNewPot(potData));
            if (createdPot && createdPot.id) {
                navigate(`/pots/${createdPot.id}`);
            } else {
                setErrors({ general: "Pot created, but failed to retrieve details. Please check the pots list." });
            }
        } catch (res) {
            let errorData = { general: "An unexpected error occurred." };
            if (res && typeof res.json === 'function') { 
                try {
                    const data = await res.json();
                    if (data && data.errors) {
                        errorData = data.errors;
                    } else if (data && data.message) {
                        errorData = { general: data.message };
                    }
                } catch (jsonError) {
                    console.error("Could not parse error response JSON:", jsonError);
                    errorData = { general: "An error occurred, and the error response could not be parsed." };
                }
            } else if (res && res.message) { 
                errorData = { general: res.message, ...res.errors };
            }
            setErrors(errorData);
        }
    };

    return (
        <div className="pot-form-container">
            <div className="pot-form-header"><h1>CREATE POT PAGE</h1></div>
            <form className="create-pot-form" onSubmit={handleSubmit}>
                {errors.general && <p className="form-general-error">{errors.general}</p>}

                <div className="pot-name">
                    <label htmlFor="potName">POT NAME:</label>
                    <input
                        id="potName"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter name of pot"
                    />
                    {errors.name && <p className="error-message">{errors.name}</p>}
                </div>

                <div className="hand-amount">
                    <label htmlFor="handAmount">AMOUNT PER HAND:</label>
                    <input
                        id="handAmount"
                        type="number" 
                        value={hand}
                        onChange={e => setHand(e.target.value)}
                        placeholder="0.00"
                        step="0.01" 
                        min="0.01"   
                    />
                    {errors.hand && <p className="error-message">{errors.hand}</p>}
                </div>

                <div className="pot-amount">
                    <label htmlFor="potAmount">POT AMOUNT:</label>
                    <input
                        id="potAmount"
                        type="number" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        disabled={true} 
                    />
                    {errors.amount && <p className="error-message">{errors.amount}</p>}
                </div>

                <div className="pot-start">
                    <label htmlFor="startDate">START DATE:</label>
                    <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    {errors.startDate && <p className="error-message">{errors.startDate}</p>}
                </div>

                <div className="pot-end">
                    <label htmlFor="endDate">END DATE:</label>
                    <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        disabled={true} 
                    />
                    {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                </div>

                <div className="create-pot-form-button-div">
                    <button className="create-pot-form-button" type="submit">Create Pot</button>
                </div>
            </form>
        </div>
    );
};

export default CreatePotsPage;
