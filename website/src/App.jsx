import { Routes, Route } from 'react-router-dom';

import HomePage from './HomePage.jsx';
import MpPage from './MpPage.jsx';
import BillPage from './BillPage.jsx';
import RidingPage from './RidingPage.jsx';


function App() {
    return (
        <Routes>

            <Route
                path="/"
                element={<HomePage />}
            />

            <Route
                path="/mps/:personId"
                element={<MpPage />}
            />

            <Route
                path="/bills/:billCode"
                element={<BillPage />}
            />

            <Route
                path="/ridings/:ridingId"
                element={<RidingPage />}
            />

        </Routes>
    );
}


export default App;