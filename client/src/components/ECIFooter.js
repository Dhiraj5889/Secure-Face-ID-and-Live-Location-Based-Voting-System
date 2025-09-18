import React from 'react';

const ECIFooter = () => {
	return (
		<footer className="eci-footer">
			<div className="eci-footer-inner">
				<div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12 }}>
					<div>
						<p style={{ margin: 0, fontWeight: 600 }}>Election Commission of India</p>
						<p style={{ margin: 0, color: '#6b7280' }}>Accessible, secure, and transparent voting</p>
					</div>
					<nav aria-label="Footer" style={{ display: 'flex', gap: 12 }}>
						<a href="/help" className="eci-link">Help</a>
						<a href="/accessibility" className="eci-link">Accessibility</a>
						<a href="/privacy" className="eci-link">Privacy</a>
					</nav>
				</div>
				<p style={{ marginTop: 8, color: '#6b7280' }}>© {new Date().getFullYear()} Election Commission of India</p>
			</div>
		</footer>
	);
};

export default ECIFooter;


