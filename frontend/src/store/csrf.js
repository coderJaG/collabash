import Cookies from 'js-cookie';

export async function csrfFetch(url, options = {}) {
        options.method = options.method || 'GET';
        options.headers = options.headers || {};

        if (options.method.toUpperCase() !== 'GET') {
            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
            options.headers['X-CSRF-Token'] = Cookies.get('XSRF-TOKEN');
        }
        const res = await window.fetch(url, options);

        if (res.status >= 400) throw res;

        return res;


    // options.method = options.method || 'GET';
    // options.headers = options.headers || {};

    // if (options.method.toUpperCase() !== 'GET') {
    //     options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    //     options.headers['XSRF-Token'] = Cookies.get('XSRF-TOKEN');
    // }

    // try { // Wrap fetch in a try...catch
    //     const res = await window.fetch(url, options);

    //     if (!res.ok) { // Check for non-2xx status codes
    //         let errorData;
    //         try {
    //             errorData = await res.json(); // Try to parse JSON error response
    //         } catch (jsonError) {
    //             // If JSON parsing fails (e.g., server sends plain text error), handle it
    //             console.error("Error parsing error JSON:", jsonError);
    //             errorData = { message: res.statusText }; // Use status text as fallback
    //         }
    //         // Create a custom error object containing the error data and status
    //         const error = new Error(res.statusText);
    //         error.status = res.status;
    //         error.data = errorData;
    //         throw error; // Throw the custom error
    //     }

    //     return res; // Return the response object for successful requests
    // } catch (error) {
    //     // Re-throw the error so it can be handled in the thunk
    //     throw error;
    // }
}


// // call this to get the "XSRF-TOKEN" cookie, should only be used in development
export function restoreCSRF() {
    return csrfFetch('/api/csrf/restore')


}