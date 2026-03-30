const Dashboard = () => {
    return (
        <div className="dashboard-container">
            <header className="page-header">
                <h1>Overview</h1>
                <p>Monitor your e-commerce operations</p>
            </header>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p className="stat-value">256</p>
                </div>
                <div className="stat-card">
                    <h3>Active Products</h3>
                    <p className="stat-value">1,402</p>
                </div>
                <div className="stat-card">
                    <h3>Pending Shipments</h3>
                    <p className="stat-value text-warning">14</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
