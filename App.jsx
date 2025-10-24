import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { LucidePlus, LucideLoader2, LucideMountain, LucideLock, LucideCalendar, LucideMail, LucidePhone } from 'lucide-react';

// --- Global Variables (Provided by Canvas Environment - Ignored in deployment, but good practice) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --------------------------------------------------------

// REQUIRED ADMIN PASSWORD - Used for accessing the event creation form
const ADMIN_PASSWORD = '25149312Dw'; 

// REQUIRED CONTACT DETAILS - Displayed publicly
const CONTACT_PHONE = '07957099488';
const CONTACT_EMAIL = 'deesidenonads@gmail.com';

// --- Utility Components ---

// Component for the main logo, stylized to match the user's uploaded image
const NomadLogo = () => (
  <div className="flex flex-col items-center justify-center p-6 bg-[#1F3A3A] rounded-2xl shadow-xl border-4 border-[#F7D095]">
    {/* Simplified Mountain/Fire SVG Logo based on the image's aesthetic */}
    <div className="relative h-20 w-20">
      <LucideMountain className="absolute text-white w-full h-full z-10" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 bg-[#F07F3F] rounded-full z-20 shadow-md"></div>
    </div>
    <div className="mt-4 px-4 py-1 bg-[#F07F3F] rounded-lg shadow-inner">
      <h1 className="text-white text-base font-extrabold uppercase tracking-widest whitespace-nowrap">
        The Deeside Nomads
      </h1>
    </div>
  </div>
);

// Component for Admin Login
const AdminLoginForm = ({ onLoginAttempt, statusMessage }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Check password against the hardcoded ADMIN_PASSWORD
        if (password === ADMIN_PASSWORD) {
            onLoginAttempt(true);
        } else {
            setError('Incorrect password.');
            setPassword('');
            setTimeout(() => setError(null), 2000);
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold text-[#1F3A3A] mb-4 border-b pb-2 flex items-center">
                <LucideLock className="w-5 h-5 mr-2" /> Admin Access
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    placeholder="Enter Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#F07F3F] focus:border-[#F07F3F] transition duration-200 text-gray-800 placeholder:text-gray-500"
                    required
                />
                <button
                    type="submit"
                    className="w-full bg-[#1F3A3A] text-white py-3 rounded-xl font-semibold hover:bg-opacity-90 transition duration-300 flex items-center justify-center"
                >
                    Log In
                </button>
            </form>
            {error && (
                <p className="mt-3 text-sm text-center text-red-500 font-semibold">{error}</p>
            )}
            {statusMessage && (
                <p className="mt-3 text-sm text-center text-gray-500">{statusMessage}</p>
            )}
        </div>
    );
};


// Form component for adding new events
const AddContentForm = ({ db, userId, onContentAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventbriteUrl, setEventbriteUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Firestore path for public data, now focused on events
  const publicContentPath = `artifacts/${appId}/public/data/nomad_events`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
    if (!title || !description || !eventDate || !eventbriteUrl || !db) {
        onContentAdded('Please fill out all fields.');
        return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, publicContentPath), {
        title,
        description,
        eventDate, // Stored as YYYY-MM-DD string for sorting
        eventbriteUrl,
        timestamp: serverTimestamp(), // Creation timestamp
        authorId: userId,
      });
      // Clear form
      setTitle('');
      setDescription('');
      setEventDate('');
      setEventbriteUrl('');
      onContentAdded('New event added successfully!');
    } catch (error) {
      console.error("Error adding document: ", error);
      onContentAdded('Error adding event. See console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold text-[#1F3A3A] mb-4 border-b pb-2">Add New Event</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Event Title (e.g., Winter Survival Workshop)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#F07F3F] focus:border-[#F07F3F] transition duration-200 text-gray-800 placeholder:text-gray-500"
          required
        />
        <input // Date Input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#F07F3F] focus:border-[#F07F3F] transition duration-200 text-gray-800"
          required
        />
        <textarea
          placeholder="Event Details/Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#F07F3F] focus:border-[#F07F3F] transition duration-200 text-gray-800 placeholder:text-gray-500"
          required
        />
        <input // Eventbrite URL Input
          type="url"
          placeholder="Eventbrite Link (Required for booking)"
          value={eventbriteUrl}
          onChange={(e) => setEventbriteUrl(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#F07F3F] focus:border-[#F07F3F] transition duration-200 text-gray-800 placeholder:text-gray-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#F07F3F] text-white py-3 rounded-xl font-semibold hover:bg-opacity-90 transition duration-300 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <LucideLoader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <LucidePlus className="w-5 h-5 mr-2" />
          )}
          Post New Event
        </button>
      </form>
    </div>
  );
};

// Main App Component
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [content, setContent] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); // State for admin login

  // --- 1. Firebase Initialization and Authentication ---
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
          } catch (e) {
            console.error("Firebase Auth Error:", e);
            setStatusMessage('Error during sign-in.');
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setStatusMessage('Firebase failed to initialize.');
      setIsAuthReady(true);
    }
  }, []);

  // --- 2. Real-time Data Fetching (onSnapshot) ---
  useEffect(() => {
    if (!isAuthReady || !db) return;

    // Path to the public collection (nomad_events)
    const publicContentPath = `artifacts/${appId}/public/data/nomad_events`;

    try {
      const q = query(collection(db, publicContentPath));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedContent = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })).sort((a, b) => {
            // Sort by eventDate string ascending (YYYY-MM-DD) to show upcoming events first
            if (a.eventDate && b.eventDate) {
                return a.eventDate.localeCompare(b.eventDate); 
            }
            return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0); // Fallback to creation time
        });

        setContent(fetchedContent);
        setLoadingContent(false);
      }, (error) => {
        console.error("Firestore data snapshot error:", error);
        setStatusMessage('Error fetching content. Check console for details.');
        setLoadingContent(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firestore query setup error:", e);
      setLoadingContent(false);
    }
  }, [db, isAuthReady]);

  const handleStatusMessage = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 3000); // Clear message after 3 seconds
  };

  const formattedEventDate = (dateString) => {
    if (!dateString) return "Date TBD";
    // dateString is YYYY-MM-DD
    const date = new Date(dateString + 'T00:00:00'); 
    return date.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#1F3A3A] font-sans text-white p-4 sm:p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* Header Section */}
        <header className="flex flex-col items-center pt-8 pb-4">
          <NomadLogo />
          <p className="text-[#F7D095] mt-4 text-center text-lg font-medium">Your guide to bushcraft and outdoor education.</p>
          {isAuthReady && (
            <p className="text-xs text-gray-400 mt-2">
              User ID: <span className="text-white font-mono break-all">{userId || 'Loading...'}</span>
            </p>
          )}
        </header>

        {/* Status Message Display */}
        {statusMessage && (
          <div className="p-3 bg-[#F07F3F] text-white rounded-lg text-center font-semibold animate-pulse">
            {statusMessage}
          </div>
        )}
        
        {/* --- */}

        {/* Admin/CMS Section: Secured behind password */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#F7D095] border-b border-[#F7D095] pb-2 flex items-center">
            <LucideLock className="w-6 h-6 mr-2" /> Admin Dashboard
          </h2>
          
          {isAdminLoggedIn ? (
            <AddContentForm db={db} userId={userId} onContentAdded={handleStatusMessage} />
          ) : (
            <AdminLoginForm onLoginAttempt={setIsAdminLoggedIn} statusMessage="Enter password to add or edit events." />
          )}
        </section>
        
        {/* --- */}

        {/* Content Display Section (Public Events Calendar) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#F7D095] border-b border-[#F7D095] pb-2 flex items-center">
            <LucideCalendar className="w-6 h-6 mr-2" /> Upcoming Events
          </h2>
          
          {loadingContent ? (
            <div className="text-center p-8 bg-gray-700/50 rounded-xl flex items-center justify-center">
              <LucideLoader2 className="w-6 h-6 animate-spin mr-2 text-[#F07F3F]" />
              <span className="text-lg">Loading events calendar...</span>
            </div>
          ) : content.length === 0 ? (
            <div className="text-center p-8 bg-gray-700/50 rounded-xl">
              <p className="text-lg">No upcoming events are currently scheduled. Check back soon for new courses!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {content.map((item) => (
                <div key={item.id} className="p-4 bg-white text-gray-800 rounded-xl shadow-lg transition duration-300 hover:shadow-2xl hover:scale-[1.01] flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="flex-grow mb-3 sm:mb-0">
                    {/* Date and Title */}
                    <div className="bg-[#F7D095] text-[#1F3A3A] text-sm font-semibold px-2 py-0.5 rounded-full inline-block mb-2 shadow-inner">
                      {formattedEventDate(item.eventDate)}
                    </div>
                    <h3 className="text-2xl font-extrabold text-[#1F3A3A] mb-1">{item.title}</h3>
                    {/* Description */}
                    <p className="text-gray-700 mt-2 text-base">{item.description}</p>
                  </div>

                  {/* Booking Button */}
                  {item.eventbriteUrl && (
                    <a 
                      href={item.eventbriteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full sm:w-auto flex-shrink-0 bg-[#F07F3F] text-white py-3 px-6 rounded-xl font-bold uppercase text-sm text-center tracking-wider shadow-lg hover:bg-[#E06E31] transition duration-300 transform hover:scale-105 mt-4 sm:mt-0"
                    >
                      Book on Eventbrite
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- */}
        
        {/* Contact Section */}
        <section className="space-y-4 pb-8">
            <h2 className="text-2xl font-bold text-[#F7D095] border-b border-[#F7D095] pb-2">
                Contact The Nomads
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/80 rounded-xl flex items-center space-x-3">
                    <LucidePhone className="w-6 h-6 text-[#F7D095] flex-shrink-0" />
                    <a href={`tel:${CONTACT_PHONE}`} className="text-lg text-white font-mono hover:underline">
                        {CONTACT_PHONE}
                    </a>
                </div>
                <div className="p-4 bg-gray-800/80 rounded-xl flex items-center space-x-3">
                    <LucideMail className="w-6 h-6 text-[#F7D095] flex-shrink-0" />
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-lg text-white font-mono hover:underline break-all">
                        {CONTACT_EMAIL}
                    </a>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};

export default App;

