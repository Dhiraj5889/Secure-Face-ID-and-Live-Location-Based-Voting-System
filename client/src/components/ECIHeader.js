import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
	{ label: 'Home', to: '/' },
	{ label: 'Elections', to: '/elections' },
	{ label: 'Dashboard', to: '/dashboard' },
	{ label: 'Results', to: '/results' },
	{ label: 'Admin Geo', to: '/admin/geo', adminOnly: true },
	{ label: 'Voters', to: '/admin/voters', adminOnly: true },
];

const ECIHeader = () => {
	const { isAuthenticated, logout, user, userType } = useAuth();
	return (
		<header className="eci-header">
			<div className="eci-header-top" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<Link to="/" className="eci-brand">
					<div className="eci-logo" aria-hidden="true">ECI</div>
					<div>
						<h1 className="eci-title">Election Commission of India</h1>
						<p className="eci-subtitle">Secure Digital Voting System</p>
					</div>
				</Link>
				<div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
					{isAuthenticated && user && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							{user.faceImage && (
								<img src={user.faceImage} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
							)}
							<span style={{ fontWeight: 600 }}>{user.name || user.username || user.email}</span>
						</div>
					)}
					{!isAuthenticated && (
						<>
							<Link to="/login" className="eci-btn eci-btn-outline">Login</Link>
							<Link to="/register" className="eci-btn eci-btn-primary">Register</Link>
						</>
					)}
					{isAuthenticated && (
						<button onClick={logout} className="eci-btn eci-btn-outline">Logout</button>
					)}
				</div>
			</div>
			<nav className="eci-nav" aria-label="Primary">
				<ul className="eci-nav-list">
					{navItems
						.filter(item => {
							const isAdminUser = (userType === 'admin') || !!(user && (user.role === 'admin' || user.role === 'super_admin' || user.adminId));
							return (isAuthenticated || item.to === '/') && (!item.adminOnly || isAdminUser);
						})
						.map((item) => (
						<li key={item.to}>
							<NavLink
								to={item.to}
								className={({ isActive }) =>
									`eci-nav-link ${isActive ? 'active' : ''}`
								}
							>
								{item.label}
							</NavLink>
						</li>
					))}
				</ul>
			</nav>
		</header>
	);
};

export default ECIHeader;


