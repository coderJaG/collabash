import { useState } from 'react';
import { useDispatch } from 'react-redux';

import { useModal } from '../context/Modal';
import * as sessionActions from '../../store/session'


const LoginFormModal = () => {
    const dispatch = useDispatch();

    const [credential, setCredential] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const { closeModal } = useModal();



    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrors({})
        try {
            const res = await dispatch(sessionActions.login({ credential, password }));

            if (res.ok) {
                closeModal()
            }
            else {
                const data = await res.json();
                if (data && data.errors) {
                    setErrors(data.errors);
                } else if (data && data.message) {
                    setErrors({ credential: data.message });
                } else {
                    setErrors({ credential: 'The provided credentials were invalid.' });
                }
            }
        } catch (error) {
            console.error('Error during login:', error);
            setErrors({ credential: 'The provided credentials were invalid.' });
        }
    }

    //demo user login
    // ---Start of demo user login---
    //delete after testing
    const demoUser1 = async (e) => {
        e.preventDefault();
        setErrors({});
        try {
            const res = await dispatch(sessionActions.login({ credential: 'Demo-lition', password: 'password' }));
            if (res.ok) {
                closeModal();
            }
        } catch (error) {
            console.error('Error during demo user login:', error);
            setErrors({ credential: 'The provided credentials were invalid.' });
        }
    };
    const demoUser2 = async (e) => {

        e.preventDefault();
        setErrors({});
        try {
            const res = await dispatch(sessionActions.login({ credential: 'TestUser1', password: 'password2' }));
            if (res.ok) {
                closeModal();
            }
        } catch (error) {
            console.error('Error during demo user login:', error);
            setErrors({ credential: 'The provided credentials were invalid.' });
        }
    };
// ---End of demo user login---


    const disableButton = (credential.length >= 4 && password.length >= 6) ? false : true

    return (
        <>
            <h2>LOG IN</h2>
            <button onClick={demoUser1}>Demo User1</button>
            <button onClick={demoUser2}>Demo User2</button>
            <form onSubmit={handleSubmit}>

                {errors.credential && <p>{errors.credential}</p>}
                <label>Email or Username: </label>
                <input
                    type='text'
                    value={credential}
                    onChange={e => setCredential(e.target.value)}
                    placeholder='Enter email or username'
                />
                <label>Password: </label>
                <input
                    type='text'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button type='submit' disabled={disableButton}>Log In</button>
            </form>
        </>
    )
};

export default LoginFormModal;