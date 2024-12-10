import { useState } from "react";
import { useDispatch } from "react-redux";
import * as sessionActions from "../../store/session"

const SignUpFormModal = () => {
    const dispatch = useDispatch();
    const [firstName, setFisrtName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('standard');
    const [errors, setErrors] = useState({})



    const handleSubmit = async (e) => {
        e.preventDefault()

        const user = {
            firstName,
            lastName,
            username,
            email,
            mobile,
            password,
            role
        }

        if (password === confirmPassword) {
            setErrors({})
            try {
                await dispatch(sessionActions.signUp(user));
            } catch (res) {
                const data = await res.json();
                if (data && data.errors) {
                    setErrors(prevErrors => ({ ...prevErrors, ...data.errors }));
                }
            }
        } else {  
            setErrors(prevErrors => ({
                ...prevErrors,
                confirmPassword: 'Passwords do not match'
            }));
        }

    }

    //helper to disable signup button if some creteria are not met
    let disableButton = false
    const fieldNames = [firstName, lastName, email, username, password, confirmPassword]
    fieldNames.forEach(name => {
        if (name.length === 0) {
            disableButton = true
        }
    })

    disableButton = disableButton || !(username.length >= 4 && password.length >= 6)
    
    return (
        <>
            <h1>LOGIN PAGE</h1>
            <form className="signup-form" onSubmit={handleSubmit}>
                <label>First Name: </label>
                <input
                    type='text'
                    value={firstName}
                    onChange={e => setFisrtName(e.target.value)}
                />
                {errors.firstName && <p>{errors.firstName}</p>}
                <label>Last Name: </label>
                <input
                    type='text'
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                />
                {errors.lastName && <p>{errors.lastName}</p>}
                <label>Username: </label>
                <input
                    type='text'
                    value={username}
                    onChange={e => setUserName(e.target.value)}
                />
                {errors.username && <p>{errors.username}</p>}
                <label>Email:</label>
                <input
                    type='text'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                {errors.email && <p>{errors.email}</p>}
                <label>Mobile: </label>
                <input
                    type='text'
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                />
                {errors.mobile && <p>{errors.mobile}</p>}
                <label>Password: </label>
                <input
                    type='text'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                {errors.password && <p>{errors.password}</p>}
                <label>Confirm password: </label>
                <input
                    type='text'
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                />
                {errors.confirmPassword && <p>{errors.confirmPassword}</p>}
                <div>
                    <label>Role: </label>
                    <div>
                        <input
                            id="standard"
                            type='radio'
                            value='standard'
                            checked={role === 'standard'}
                            onChange={e => setRole(e.target.value)}
                        />
                        <label htmlFor="standard"> standard</label>
                    </div>
                    <div>
                        <input
                            id="banker"
                            type='radio'
                            value='banker'
                            checked={role === 'banker'}
                            onChange={e => setRole(e.target.value)}
                        />
                        <label htmlFor="banker"> banker</label>
                    </div>
                </div>
                <button className='signup-form-button' type="submit" disabled={disableButton}>Sign Up</button>
            </form>
        </>
    )
};


export default SignUpFormModal;