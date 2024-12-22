import { useLocation } from "react-router-dom";
import GetAllPotsPage from "../GetAllPotsPage";
import CreatePotsPage from "../CreatePotsPage";
const PotsLayout = ()=> {
    const location = useLocation();
    const isCreateRoute = location.pathname.endsWith('/create')
    return (
        <>
            {isCreateRoute ? <CreatePotsPage /> : <GetAllPotsPage />}
        </>
    )
}

export default PotsLayout;