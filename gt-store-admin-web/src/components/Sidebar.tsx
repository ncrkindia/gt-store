import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const Sidebar = () => {
    const { keycloak } = useKeycloak();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>GT Store</h2>
                <span className="badge">Admin</span>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    <li><Link to="/dashboard">Dashboard</Link></li>
                    <li><Link to="/products">Manage Products</Link></li>
                    <li><Link to="/orders">Manage Orders</Link></li>
                </ul>
            </nav>
            <div className="sidebar-footer">
                <p>User: {keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username}</p>
                <button onClick={() => keycloak.logout()} className="btn-logout">Logout</button>
            </div>
        </aside>
    );
}

export default Sidebar;
