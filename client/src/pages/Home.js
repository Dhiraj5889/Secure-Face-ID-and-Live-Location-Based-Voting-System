import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Lock, 
  BarChart3, 
  Users, 
  CheckCircle,
  ArrowRight,
  Vote,
  Clock,
  Globe
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated, userType } = useAuth();

  const features = [
    {
      icon: Shield,
      title: 'Face ID Authentication',
      description: 'Secure face-based verification ensures only registered voters can participate.'
    },
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'All votes are encrypted using advanced cryptographic techniques to maintain privacy.'
    },
    {
      icon: Shield,
      title: 'Merkle Tree Verification',
      description: 'Blockchain-inspired technology ensures vote integrity and prevents tampering.'
    },
    {
      icon: BarChart3,
      title: 'Real-time Results',
      description: 'Live election results with transparent vote counting and verification.'
    },
    {
      icon: Users,
      title: 'Centralized Management',
      description: 'Comprehensive admin dashboard for managing elections, voters, and candidates.'
    },
    {
      icon: CheckCircle,
      title: 'Audit Trail',
      description: 'Complete audit trail for every vote with timestamp and verification data.'
    }
  ];

  const stats = [
    { label: 'Secure Votes', value: '10,000+', icon: Vote },
    { label: 'Active Elections', value: '50+', icon: Globe },
    { label: 'Verified Voters', value: '5,000+', icon: Users },
    { label: 'Uptime', value: '99.9%', icon: Clock }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Secure Digital Voting
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            A revolutionary voting system that combines biometric authentication, 
            blockchain technology, and real-time transparency for secure elections.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary text-lg px-8 py-4">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/elections" className="btn btn-outline text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-gray-900">
                  View Elections
                </Link>
              </>
            ) : (
              <>
                {userType === 'voter' ? (
                  <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-4">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <Link to="/admin/geo" className="btn btn-primary text-lg px-8 py-4">
                    Admin Geo
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
                <Link to="/elections" className="btn btn-outline text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-gray-900">
                  View Elections
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose SecureVote?
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with user-friendly design 
              to deliver the most secure and transparent voting experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:transform hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Military-Grade Security
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Our voting system employs multiple layers of security to ensure 
              the integrity and confidentiality of every vote.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Biometric Security</h3>
                <p className="text-white/70">Privacy-preserving Face ID prevents duplicate voting</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Encrypted Storage</h3>
                <p className="text-white/70">All data is encrypted using AES-256 encryption</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Tamper Proof</h3>
                <p className="text-white/70">Merkle tree verification ensures vote integrity</p>
              </div>
            </div>

            <Link to="/elections" className="btn btn-primary text-lg px-8 py-4">
              Explore Elections
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Vote Securely?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of voters who trust our secure voting platform 
            for transparent and reliable elections.
          </p>
          
          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn btn-primary text-lg px-8 py-4">
                Register Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn btn-outline text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-gray-900">
                Login
              </Link>
            </div>
          ) : (
            <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-4">
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
