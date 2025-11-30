import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';

async function apiRequest(endpoint, options = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUid, setEditingUid] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/admin/users');
      if (res.success) {
        setUsers(res.data);
        setIsAdmin(true);
      } else {
        if (res.error?.code === 'FORBIDDEN') {
          setIsAdmin(false);
        } else {
          setError(res.error?.message || 'Failed to load users');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUid(user.uid);
    setEditName(user.displayName || '');
  };

  const handleSave = async (uid) => {
    setSaving(true);
    try {
      const res = await apiRequest(`/api/admin/users/${uid}`, {
        method: 'PUT',
        body: JSON.stringify({ displayName: editName }),
      });
      if (res.success) {
        setUsers(users.map(u => u.uid === uid ? { ...u, displayName: editName } : u));
        setEditingUid(null);
        setEditName('');
      } else {
        setError(res.error?.message || 'Failed to update');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingUid(null);
    setEditName('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have admin permissions.</p>
          <button onClick={onBack} className="btn-primary">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600">Admin</h1>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
            ← Back to App
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Users</h2>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {users.map(user => (
              <div key={user.uid} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                    
                    {editingUid === user.uid ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Display name"
                          className="input flex-1 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(user.uid)}
                          disabled={saving}
                          className="btn-primary text-sm px-3"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="btn-secondary text-sm px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {user.displayName || <span className="italic">No display name</span>}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(user.createdAt).toLocaleDateString()} · 
                      Last sign in: {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  
                  {editingUid !== user.uid && (
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              To add new users, go to{' '}
              <a 
                href="https://console.firebase.google.com/project/safespan-e5cf9/authentication/users" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Firebase Console → Authentication
              </a>
              {' '}and click "Add user". Then come back here to set their display name.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
