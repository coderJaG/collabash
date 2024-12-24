import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as potsActions from '../../store/pots';
import './CreatePotsPage.css'

const CreatePotsPage = () => {
    const dispacth = useDispatch();
    const navigate = useNavigate();
    const currUser = useSelector(state => state.session.user);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(0);
    const defaultDate = new Date().toISOString().split('T')[0] //set current date as default in yyyy-mm-dd format
    const [startDate, setStartDate] = useState(defaultDate);
    const [endDate, setEndDate] = useState(defaultDate);
    const [active, setActive] = useState(false);
    const [errors, setErrors] = useState({})
    const ownerId = currUser.id

    const handlSubmit = async (e) => {
        e.preventDefault();
        const potData = {
            ownerId,
            name,
            amount,
            startDate,
            endDate,
            active
        }
        return dispacth(potsActions.createNewPot(potData))
            .then(async res => { navigate(`/pots/${res.id}`) })
            .catch(
                async (res) => {
                    const data = await res.json();
                    if (data.errors) {
                        setErrors(data.errors)
                    }
                }
            )
    }
    return (
        <>
        <div className="pot-form-container"> 
            <div className="pot-form-header"><h1 >Create Pot Page</h1></div>
            <form className="create-pot-form" onSubmit={handlSubmit}>
                <div className="pot-name">
                <label>Pot Name: </label>
                    <input type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter name of pot"
                    />
                    {errors.name && <p>{errors.name}</p>}
                </div>
                <div className="pot-amount">
                    <label>Pot Amount: </label>
                    <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0"
                    />
                    {errors.amount && <p>{errors.amount}</p>}
                </div>
                <div className="pot-start">
                    <label>Start Date: </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        placeholder="Enter start date"
                    />
                </div>
                <div className="pot-end">
                    <label>End Date: </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        placeholder="Enter start date"
                    />
                </div>
              <div className="create-pot-form-button-div">  <button className="create-pot-form-button" type="submit">Create Pot</button></div>
            </form>
            </div>
        </>
    )
};


export default CreatePotsPage;