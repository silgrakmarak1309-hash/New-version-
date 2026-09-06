/**
 * Firebase Firestore Cloud Service for Meri Local Bazaar
 * Project: gen-lang-client-0563393769
 * Database: ai-studio-merilocalbazaar-b94b31a6-c91c-4a3a-94b5-0010a566b61a
 */

(function(window) {
  'use strict';

  const FIREBASE_CONFIG = {
    projectId: "gen-lang-client-0563393769",
    apiKey: "AIzaSyBcLyUUTTXtHyzNUL9ClqYe9c2Ih1fOi7k",
    authDomain: "gen-lang-client-0563393769.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-merilocalbazaar-b94b31a6-c91c-4a3a-94b5-0010a566b61a",
    storageBucket: "gen-lang-client-0563393769.firebasestorage.app",
    messagingSenderId: "619957202495",
    appId: "1:619957202495:web:5e87e36d62df7d4153528a"
  };

  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.firestoreDatabaseId}/documents`;

  // Memory cache to ensure 0ms instant UI responses
  const memoryCache = {
    settings: null,
    listings: null,
    recharges: null,
    users: null,
    categories: null,
    locations: null,
    transactions: null,
    banners: null,
    notifications: new Map(),
    lastFetchTime: {}
  };

  // Convert JS object to Firestore Document fields
  function jsToFirestoreFields(obj) {
    if (!obj || typeof obj !== 'object') return { nullValue: null };
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: String(value) };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map(item => {
              if (typeof item === 'string') return { stringValue: item };
              if (typeof item === 'number') return { doubleValue: item };
              if (typeof item === 'boolean') return { booleanValue: item };
              if (typeof item === 'object' && item !== null) return { mapValue: { fields: jsToFirestoreFields(item) } };
              return { stringValue: String(item) };
            })
          }
        };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: jsToFirestoreFields(value) } };
      } else {
        fields[key] = { stringValue: String(value) };
      }
    }
    return fields;
  }

  // Convert Firestore Document fields back to plain JS object
  function firestoreFieldsToJs(fields) {
    if (!fields || typeof fields !== 'object') return {};
    const result = {};
    for (const [key, valueObj] of Object.entries(fields)) {
      if (!valueObj) continue;
      if ('stringValue' in valueObj) {
        result[key] = valueObj.stringValue;
      } else if ('integerValue' in valueObj) {
        result[key] = parseInt(valueObj.integerValue, 10);
      } else if ('doubleValue' in valueObj) {
        result[key] = parseFloat(valueObj.doubleValue);
      } else if ('booleanValue' in valueObj) {
        result[key] = valueObj.booleanValue;
      } else if ('nullValue' in valueObj) {
        result[key] = null;
      } else if ('arrayValue' in valueObj) {
        const arr = valueObj.arrayValue && valueObj.arrayValue.values ? valueObj.arrayValue.values : [];
        result[key] = arr.map(item => {
          if ('stringValue' in item) return item.stringValue;
          if ('integerValue' in item) return parseInt(item.integerValue, 10);
          if ('doubleValue' in item) return parseFloat(item.doubleValue);
          if ('booleanValue' in item) return item.booleanValue;
          if ('mapValue' in item) return firestoreFieldsToJs(item.mapValue.fields);
          return null;
        });
      } else if ('mapValue' in valueObj) {
        result[key] = firestoreFieldsToJs(valueObj.mapValue ? valueObj.mapValue.fields : {});
      } else if ('timestampValue' in valueObj) {
        result[key] = valueObj.timestampValue;
      }
    }
    return result;
  }

  // Generic REST Firestore Request with timeout
  async function firestoreRequest(path, options = {}, timeoutMs = 4000) {
    const url = `${BASE_URL}/${path}${path.includes('?') ? '&' : '?'}key=${FIREBASE_CONFIG.apiKey}`;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const fetchOptions = {
        ...options,
        signal: controller ? controller.signal : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      };
      const res = await fetch(url, fetchOptions);
      if (timeout) clearTimeout(timeout);
      if (!res.ok) {
        if (res.status === 404) return null;
        const errText = await res.text();
        console.warn(`[Firebase] Firestore request error (${res.status}):`, errText.slice(0, 150));
        return null;
      }
      return await res.json();
    } catch (err) {
      if (timeout) clearTimeout(timeout);
      console.warn(`[Firebase] Network error for ${path}:`, err.message || err);
      return null;
    }
  }

  // ----------------------------------------------------
  // 1. SETTINGS (UPI ID, QR Code, Site Info)
  // ----------------------------------------------------
  async function getSettings() {
    // 1. Return memory cache or localStorage first
    if (memoryCache.settings) return memoryCache.settings;
    try {
      const local = localStorage.getItem('app_admin_settings');
      if (local) memoryCache.settings = JSON.parse(local);
    } catch(e) {}

    // 2. Fetch fresh from Firestore
    try {
      const data = await firestoreRequest('settings/app_config');
      if (data && data.fields) {
        const fresh = firestoreFieldsToJs(data.fields);
        memoryCache.settings = fresh;
        try { localStorage.setItem('app_admin_settings', JSON.stringify(fresh)); } catch(e) {}
        return fresh;
      }
    } catch(err) {}

    return memoryCache.settings || {
      upi_id: 'grejamarak@oksbi',
      payment_qr_code: '',
      payment_instructions: '1. Open any UPI app (GPay, PhonePe, Paytm). 2. Scan the QR code or pay to the UPI ID shown. 3. Enter the exact amount and copy the 12-digit UTR/Reference number. 4. Submit the request.',
      site_name: 'Meri Local Bazaar',
      support_phone: '9366304567',
      support_email: 'merilocalbazaar@gmail.com'
    };
  }

  async function saveSettings(settingsObj) {
    const current = await getSettings();
    const updated = { ...current, ...settingsObj, updated_at: new Date().toISOString() };
    memoryCache.settings = updated;
    try { localStorage.setItem('app_admin_settings', JSON.stringify(updated)); } catch(e) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: updated }));
    }

    // Async write to Firestore
    try {
      const fields = jsToFirestoreFields(updated);
      await firestoreRequest('settings/app_config', {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Settings saved to Firestore successfully');
    } catch(err) {
      console.warn('[Firebase] Failed to save settings to Firestore:', err);
    }
    return updated;
  }

  // ----------------------------------------------------
  // 2. LISTINGS (New Post Listing, Top PRO, Boosted)
  // ----------------------------------------------------
  async function getListings(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && memoryCache.listings && (now - (memoryCache.lastFetchTime.listings || 0) < 10000)) {
      return memoryCache.listings;
    }

    let localList = [];
    try {
      const stored = localStorage.getItem('all_cached_listings') || localStorage.getItem('local_listings_override');
      if (stored) localList = JSON.parse(stored);
    } catch(e) {}

    try {
      const res = await firestoreRequest('listings?pageSize=300');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudList = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          const data = firestoreFieldsToJs(doc.fields);
          return { id, ...data };
        });

        // Merge cloud with local, avoiding duplicates
        const map = new Map();
        localList.forEach(item => { if (item && item.id) map.set(item.id, item); });
        cloudList.forEach(item => { if (item && item.id) map.set(item.id, { ...(map.get(item.id) || {}), ...item }); });

        const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        memoryCache.listings = merged;
        memoryCache.lastFetchTime.listings = now;
        try { localStorage.setItem('all_cached_listings', JSON.stringify(merged)); } catch(e) {}
        return merged;
      }
    } catch(err) {}

    return memoryCache.listings || localList;
  }

  async function saveListing(listingObj) {
    if (!listingObj || !listingObj.id) {
      listingObj = { ...listingObj, id: 'list_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) };
    }
    const cleanListing = {
      ...listingObj,
      created_at: listingObj.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Optimistic Local Update
    let current = memoryCache.listings || [];
    const index = current.findIndex(l => l.id === cleanListing.id);
    if (index >= 0) {
      current[index] = cleanListing;
    } else {
      current = [cleanListing, ...current];
    }
    memoryCache.listings = current;
    try {
      localStorage.setItem('all_cached_listings', JSON.stringify(current));
      const myLists = JSON.parse(localStorage.getItem('my_created_listings') || '[]');
      if (!myLists.some(l => l.id === cleanListing.id)) {
        myLists.unshift(cleanListing);
        localStorage.setItem('my_created_listings', JSON.stringify(myLists));
      }
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('listing_created', { detail: cleanListing }));
    }

    // 2. Cloud Firestore Persist
    try {
      const fields = jsToFirestoreFields(cleanListing);
      await firestoreRequest(`listings/${cleanListing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Listing saved to Firestore:', cleanListing.id);
    } catch(err) {
      console.warn('[Firebase] Listing cloud save error:', err);
    }
    return cleanListing;
  }

  async function updateListing(id, updates) {
    if (!id) return;
    let current = memoryCache.listings || [];
    const item = current.find(l => l.id === id) || { id };
    const updated = { ...item, ...updates, updated_at: new Date().toISOString() };

    const idx = current.findIndex(l => l.id === id);
    if (idx >= 0) {
      current[idx] = updated;
    } else {
      current.push(updated);
    }
    memoryCache.listings = current;
    try { localStorage.setItem('all_cached_listings', JSON.stringify(current)); } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('listing_updated', { detail: updated }));
    }

    try {
      const fields = jsToFirestoreFields(updated);
      await firestoreRequest(`listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Listing updated in Firestore:', id);
    } catch(err) {
      console.warn('[Firebase] Update listing error:', err);
    }
    return updated;
  }

  async function deleteListing(id) {
    if (!id) return;
    let current = (memoryCache.listings || []).filter(l => l.id !== id);
    memoryCache.listings = current;
    try {
      localStorage.setItem('all_cached_listings', JSON.stringify(current));
      const deletedIds = JSON.parse(localStorage.getItem('deleted_listing_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('deleted_listing_ids', JSON.stringify(deletedIds));
      }
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('listing_deleted', { detail: { id } }));
    }

    try {
      await firestoreRequest(`listings/${id}`, { method: 'DELETE' });
      console.log('[Firebase] Listing deleted from Firestore:', id);
    } catch(err) {
      console.warn('[Firebase] Delete listing error:', err);
    }
  }

  // ----------------------------------------------------
  // 3. RECHARGE REQUESTS (Top PRO Boost & Monthly Plans)
  // ----------------------------------------------------
  async function getRechargeRequests(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && memoryCache.recharges && (now - (memoryCache.lastFetchTime.recharges || 0) < 10000)) {
      return memoryCache.recharges;
    }

    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem('all_recharge_requests') || '[]');
    } catch(e) {}

    try {
      const res = await firestoreRequest('recharge_requests?pageSize=300');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudList = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          const data = firestoreFieldsToJs(doc.fields);
          return { id, ...data };
        });

        const map = new Map();
        localList.forEach(item => { if (item && (item.id || item.utr)) map.set(item.id || item.utr, item); });
        cloudList.forEach(item => { if (item && (item.id || item.utr)) map.set(item.id || item.utr, { ...(map.get(item.id || item.utr) || {}), ...item }); });

        const merged = Array.from(map.values()).sort((a, b) => new Date(b.submitted_at || b.created_at || 0) - new Date(a.submitted_at || a.created_at || 0));
        memoryCache.recharges = merged;
        memoryCache.lastFetchTime.recharges = now;
        try { localStorage.setItem('all_recharge_requests', JSON.stringify(merged)); } catch(e) {}
        return merged;
      }
    } catch(err) {}

    return memoryCache.recharges || localList;
  }

  async function submitRechargeRequest(reqObj) {
    const id = reqObj.id || ('req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const cleanReq = {
      ...reqObj,
      id,
      status: reqObj.status || 'pending',
      submitted_at: reqObj.submitted_at || new Date().toISOString(),
      created_at: reqObj.created_at || new Date().toISOString()
    };

    // 1. Optimistic Local Save
    let list = memoryCache.recharges || [];
    list = [cleanReq, ...list.filter(r => r.id !== id && r.utr !== cleanReq.utr)];
    memoryCache.recharges = list;
    try {
      localStorage.setItem('all_recharge_requests', JSON.stringify(list));
      const userReqs = JSON.parse(localStorage.getItem('user_recharge_requests') || '[]');
      userReqs.unshift(cleanReq);
      localStorage.setItem('user_recharge_requests', JSON.stringify(userReqs));
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recharge_request_created', { detail: cleanReq }));
    }

    // 2. Cloud Firestore Persist
    try {
      const fields = jsToFirestoreFields(cleanReq);
      await firestoreRequest(`recharge_requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Recharge request saved to Firestore:', id);
    } catch(err) {
      console.warn('[Firebase] Recharge request cloud save error:', err);
    }
    return cleanReq;
  }

  async function updateRechargeStatus(idOrUtr, status, extra = {}) {
    if (!idOrUtr) return;
    let list = memoryCache.recharges || [];
    let target = list.find(r => r && (r.id === idOrUtr || r.utr === idOrUtr));
    const docId = (target && target.id) ? target.id : idOrUtr;

    const updated = {
      ...(target || {}),
      id: docId,
      status: status,
      ...extra,
      updated_at: new Date().toISOString()
    };

    const idx = list.findIndex(r => r && (r.id === docId || r.utr === idOrUtr));
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    memoryCache.recharges = list;
    try {
      localStorage.setItem('all_recharge_requests', JSON.stringify(list));
      const overrides = JSON.parse(localStorage.getItem('recharge_status_overrides') || '{}');
      overrides[docId] = { status, ...extra };
      localStorage.setItem('recharge_status_overrides', JSON.stringify(overrides));
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recharge_status_updated', { detail: updated }));
    }

    try {
      const fields = jsToFirestoreFields(updated);
      await firestoreRequest(`recharge_requests/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Recharge status updated in Firestore:', docId, status);
    } catch(err) {
      console.warn('[Firebase] Recharge status update error:', err);
    }
    return updated;
  }

  // ----------------------------------------------------
  // 4. USERS & PROFILES CONTROL
  // ----------------------------------------------------
  async function getUsers(forceFresh = false) {
    const now = Date.now();
    if (!forceFresh && memoryCache.users && (now - (memoryCache.lastFetchTime.users || 0) < 10000)) {
      return memoryCache.users;
    }

    let localUsers = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('admin_users_cache') || '[]');
    } catch(e) {}

    try {
      const res = await firestoreRequest('users?pageSize=300');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudUsers = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          const data = firestoreFieldsToJs(doc.fields);
          return { id, ...data };
        });

        const map = new Map();
        localUsers.forEach(u => { if (u && u.id) map.set(u.id, u); });
        cloudUsers.forEach(u => { if (u && u.id) map.set(u.id, { ...(map.get(u.id) || {}), ...u }); });

        const merged = Array.from(map.values());
        memoryCache.users = merged;
        memoryCache.lastFetchTime.users = now;
        try { localStorage.setItem('admin_users_cache', JSON.stringify(merged)); } catch(e) {}
        return merged;
      }
    } catch(err) {}

    return memoryCache.users || localUsers;
  }

  async function saveUser(userObj) {
    if (!userObj || !userObj.id) return;
    const cleanUser = {
      ...userObj,
      updated_at: new Date().toISOString()
    };

    let users = memoryCache.users || [];
    const idx = users.findIndex(u => u.id === cleanUser.id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...cleanUser };
    } else {
      users.push(cleanUser);
    }
    memoryCache.users = users;
    try { localStorage.setItem('admin_users_cache', JSON.stringify(users)); } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: cleanUser }));
    }

    try {
      const fields = jsToFirestoreFields(cleanUser);
      await firestoreRequest(`users/${cleanUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] User saved to Firestore:', cleanUser.id);
    } catch(err) {
      console.warn('[Firebase] User cloud save error:', err);
    }
    return cleanUser;
  }

  async function updateUserStatus(userId, accountStatus, role, extra = {}) {
    if (!userId) return;
    const users = memoryCache.users || [];
    const target = users.find(u => u.id === userId) || { id: userId };
    const updated = {
      ...target,
      account_status: accountStatus || target.account_status || 'active',
      role: role || target.role || 'user',
      ...extra,
      updated_at: new Date().toISOString()
    };
    return await saveUser(updated);
  }

  // ----------------------------------------------------
  // 5. LOCATIONS (India States, Districts, Blocks)
  // ----------------------------------------------------
  async function getLocations() {
    if (memoryCache.locations) return memoryCache.locations;
    try {
      const local = localStorage.getItem('app_custom_locations');
      if (local) memoryCache.locations = JSON.parse(local);
    } catch(e) {}

    try {
      const res = await firestoreRequest('locations?pageSize=500');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudLocs = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          return { id, ...firestoreFieldsToJs(doc.fields) };
        });
        if (cloudLocs.length > 0) {
          memoryCache.locations = cloudLocs;
          try { localStorage.setItem('app_custom_locations', JSON.stringify(cloudLocs)); } catch(e) {}
          return cloudLocs;
        }
      }
    } catch(err) {}

    return memoryCache.locations || [];
  }

  async function saveLocation(locObj) {
    const id = locObj.id || ('loc_' + Date.now());
    const cleanLoc = { ...locObj, id, is_active: locObj.is_active !== false, created_at: locObj.created_at || new Date().toISOString() };

    let locs = memoryCache.locations || [];
    const idx = locs.findIndex(l => l.id === id);
    if (idx >= 0) locs[idx] = cleanLoc;
    else locs.push(cleanLoc);
    memoryCache.locations = locs;
    try { localStorage.setItem('app_custom_locations', JSON.stringify(locs)); } catch(e) {}

    try {
      const fields = jsToFirestoreFields(cleanLoc);
      await firestoreRequest(`locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Location saved to Firestore:', id);
    } catch(err) {}
    return cleanLoc;
  }

  async function deleteLocation(id) {
    if (!id) return;
    let locs = (memoryCache.locations || []).filter(l => l.id !== id);
    memoryCache.locations = locs;
    try { localStorage.setItem('app_custom_locations', JSON.stringify(locs)); } catch(e) {}
    try { await firestoreRequest(`locations/${id}`, { method: 'DELETE' }); } catch(err) {}
  }

  // ----------------------------------------------------
  // 6. CATEGORIES
  // ----------------------------------------------------
  async function getCategories() {
    if (memoryCache.categories) return memoryCache.categories;
    try {
      const local = localStorage.getItem('app_custom_categories');
      if (local) memoryCache.categories = JSON.parse(local);
    } catch(e) {}

    try {
      const res = await firestoreRequest('categories?pageSize=200');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudCats = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          return { id, ...firestoreFieldsToJs(doc.fields) };
        });
        if (cloudCats.length > 0) {
          memoryCache.categories = cloudCats;
          try { localStorage.setItem('app_custom_categories', JSON.stringify(cloudCats)); } catch(e) {}
          return cloudCats;
        }
      }
    } catch(err) {}

    return memoryCache.categories || [];
  }

  async function saveCategory(catObj) {
    const id = catObj.id || ('cat_' + Date.now());
    const cleanCat = { ...catObj, id, is_active: catObj.is_active !== false, created_at: catObj.created_at || new Date().toISOString() };

    let cats = memoryCache.categories || [];
    const idx = cats.findIndex(c => c.id === id);
    if (idx >= 0) cats[idx] = cleanCat;
    else cats.push(cleanCat);
    memoryCache.categories = cats;
    try { localStorage.setItem('app_custom_categories', JSON.stringify(cats)); } catch(e) {}

    try {
      const fields = jsToFirestoreFields(cleanCat);
      await firestoreRequest(`categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Category saved to Firestore:', id);
    } catch(err) {}
    return cleanCat;
  }

  async function deleteCategory(id) {
    if (!id) return;
    let cats = (memoryCache.categories || []).filter(c => c.id !== id);
    memoryCache.categories = cats;
    try { localStorage.setItem('app_custom_categories', JSON.stringify(cats)); } catch(e) {}
    try { await firestoreRequest(`categories/${id}`, { method: 'DELETE' }); } catch(err) {}
  }

  // ----------------------------------------------------
  // 7. TRANSACTIONS
  // ----------------------------------------------------
  async function recordTransaction(txObj) {
    const id = txObj.id || ('tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const cleanTx = {
      ...txObj,
      id,
      date: txObj.date || new Date().toISOString(),
      created_at: txObj.created_at || new Date().toISOString()
    };

    let txs = [];
    try { txs = JSON.parse(localStorage.getItem('all_transactions') || '[]'); } catch(e) {}
    txs.unshift(cleanTx);
    try { localStorage.setItem('all_transactions', JSON.stringify(txs)); } catch(e) {}

    try {
      const fields = jsToFirestoreFields(cleanTx);
      await firestoreRequest(`transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
      console.log('[Firebase] Transaction recorded in Firestore:', id);
    } catch(err) {}
    return cleanTx;
  }

  async function getTransactions(userId = null) {
    let localTxs = [];
    try { localTxs = JSON.parse(localStorage.getItem('all_transactions') || '[]'); } catch(e) {}

    try {
      const res = await firestoreRequest('transactions?pageSize=300');
      if (res && res.documents && Array.isArray(res.documents)) {
        const cloudTxs = res.documents.map(doc => {
          const id = doc.name.split('/').pop();
          return { id, ...firestoreFieldsToJs(doc.fields) };
        });
        const map = new Map();
        localTxs.forEach(t => map.set(t.id, t));
        cloudTxs.forEach(t => map.set(t.id, { ...(map.get(t.id) || {}), ...t }));
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
        try { localStorage.setItem('all_transactions', JSON.stringify(merged)); } catch(e) {}
        if (userId) return merged.filter(t => t.user_id === userId);
        return merged;
      }
    } catch(err) {}

    if (userId) return localTxs.filter(t => t.user_id === userId);
    return localTxs;
  }

  // ----------------------------------------------------
  // 8. NOTIFICATIONS
  // ----------------------------------------------------
  async function sendNotification(notifObj) {
    const id = notifObj.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const cleanNotif = {
      ...notifObj,
      id,
      read_at: notifObj.read_at || null,
      created_at: notifObj.created_at || new Date().toISOString()
    };

    if (cleanNotif.user_id) {
      try {
        const key = 'user_notifications_' + cleanNotif.user_id;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.unshift(cleanNotif);
        localStorage.setItem(key, JSON.stringify(list));
      } catch(e) {}
    }

    try {
      const fields = jsToFirestoreFields(cleanNotif);
      await firestoreRequest(`notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });
    } catch(err) {}
    return cleanNotif;
  }

  // Expose global FirebaseDB object
  window.FirebaseDB = {
    config: FIREBASE_CONFIG,
    getSettings,
    saveSettings,
    getListings,
    saveListing,
    updateListing,
    deleteListing,
    getRechargeRequests,
    submitRechargeRequest,
    updateRechargeStatus,
    getUsers,
    saveUser,
    updateUserStatus,
    getLocations,
    saveLocation,
    deleteLocation,
    getCategories,
    saveCategory,
    deleteCategory,
    recordTransaction,
    getTransactions,
    sendNotification,
    firestoreRequest,
    jsToFirestoreFields,
    firestoreFieldsToJs
  };

  console.log('🔥 [Meri Local Bazaar] Firebase Firestore Database Service Connected!');

})(typeof window !== 'undefined' ? window : this);
