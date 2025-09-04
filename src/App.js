import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabaseClient';

const COUNTRY_OPTIONS = [
  { key: 'DE', label: 'Deutschland', arbeitszeit: 22.0, porto: 5.95 },
  { key: 'AT', label: 'Österreich', arbeitszeit: 26.0, porto: 9.0 },
];

const FREIGABE_OPTIONS = [
  'Keine angabe',
  'Reparatur laut KV durchführen',
  'Unrepariert zurückschicken',
  'Verschrotten',
];

const FEHLERANGABEN = [
  'Gerät funktioniert nicht',
  'Gerät setzt aus',
  'Setzt aus bei Druck und Verwindung',
  'Gerät ist zu leise',
  'Lässt sich nicht ein- ausschalten',
  'Hörspule ohne Funktion',
  'Lautstärkeregelung ist mangelhaft',
  'Gerät rauscht',
  'Gerät macht Geräusche',
  'Gerät verzerrt',
  'Batterieverbrauch zu hoch',
  'Akustische Rückkopplung vorhanden',
  'Gerät schwingt',
  'Lässt sich nicht auslesen / programmieren',
  'Akku zu schwach',
];

const ARBEITEN = [
  { key: 'fehlerdiagnose', label: 'Fehlerdiagnose', price: 3.5 },
  { key: 'hoerer', label: 'Hörer' },
  { key: 'mikrofon', label: 'Mikrofon' },
  { key: 'schalter', label: 'Schalter / Taster' },
  { key: 'poti', label: 'Poti / LS-Wippe' },
  { key: 'batterie', label: 'Batterie / Akku' },
  { key: 'gehaeuse', label: 'Gehäuse / IDO Schale' },
  { key: 'gehaeuseteil', label: 'Gehäuseteil / Faceplate' },
  { key: 'winkel', label: 'Winkel' },
  { key: 'batteriekontakte', label: 'Batteriekontakte' },
  { key: 'bluetooth', label: 'Bluetooth-Board' },
  { key: 'noahlink', label: 'NOAHlink Buchse' },
  { key: 'verstaerker', label: 'Verstärker' },
  { key: 'hoerspule', label: 'Hörspule/ Funkspule' },
  { key: 'akrohr_hoerer', label: 'Ak.Rohr od. Lagerung für Hörer' },
  { key: 'akrohr_mikro', label: 'Ak.Rohr od. Lagerung für Mikrof.' },
  { key: 'reinigung', label: 'Reinigung', price: 5.0 },
  { key: 'verglasen', label: 'Verglasen, bzw. Antirutschb.' },
  { key: 'kleinmaterial', label: 'Kleinmaterial', price: 2.0 },
  { key: 'nearcom', label: 'nEARcom-Reparaturpauschale' },
  { key: 'arbeitszeit', label: 'Arbeitszeit', price: 'country' },
  { key: 'endkontrolle', label: 'Endkontrolle', price: 3.0 },
];

// Global helper function to draw checkboxes in PDF
const drawCheckbox = (doc, x, y, checked) => {
  doc.setDrawColor(50);
  doc.rect(x, y, 4, 4);
  if (checked) {
    doc.setLineWidth(0.6);
    doc.line(x + 0.7, y + 0.7, x + 3.3, y + 3.3);
    doc.line(x + 3.3, y + 0.7, x + 0.7, y + 3.3);
    doc.setLineWidth(0.2);
  }
};

// Dashboard Component - You'll actually see this!
const Dashboard = ({ setIsLoggedIn, navigate }) => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {/* <h1 style={{ color: '#1d426a', marginBottom: '2rem' }}>Gretzinger Hörgeräte Dashboard</h1> */}
      <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 80, marginBottom: '2rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Akustiker</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Kunden verwalten und bearbeiten</p>
          <button 
            onClick={() => navigate('/akustiker')}
            style={{ padding: '10px 20px', background: '#1d426a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Akustiker öffnen
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Reparaturauftrag erstellen</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Neuen Reparaturauftrag anlegen</p>
          <button 
            onClick={() => navigate('/reperaturauftrag')}
            style={{ padding: '10px 20px', background: '#1d426a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reparaturauftrag erstellen
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Erstellte Reparaturaufträge</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Alle Reparaturaufträge anzeigen</p>
          <button 
            onClick={() => navigate('/erstellte-reperaturauftrage')}
            style={{ padding: '10px 20px', background: '#1d426a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reperaturaufträge anzeigen
          </button>
        </div>
      </div>
      <button 
        onClick={() => setIsLoggedIn(false)} 
        style={{ marginTop: '2rem', padding: '8px 18px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        Abmelden
      </button>
    </div>
  );
};

// Akustiker Management Page Component
const AkustikerPage = ({ customers, setShowAddAkustikerModal, showAddAkustikerModal, newAkustiker, setNewAkustiker, handleAddAkustiker, navigate, loadCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('company'); // 'company', 'branch', 'contact_person', 'street', 'location'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    branch: '',
    company: '',
    street: '',
    location: '',
    country: 'DE',
    contact_person: ''
  });
  
  // Filter and sort customers
  const filteredAndSortedCustomers = customers
    .filter(customer => {
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        customer.company?.toLowerCase().includes(search) ||
        customer.branch?.toLowerCase().includes(search) ||
        customer.street?.toLowerCase().includes(search) ||
        customer.location?.toLowerCase().includes(search) ||
        customer.country?.toLowerCase().includes(search) ||
        customer.contact_person?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let aValue, bValue;
      
              switch (sortBy) {
          case 'company':
            aValue = a.company || '';
            bValue = b.company || '';
            break;
          case 'branch':
            aValue = a.branch || '';
            bValue = b.branch || '';
            break;
          case 'contact_person':
            aValue = a.contact_person || '';
            bValue = b.contact_person || '';
            break;
          case 'street':
            aValue = a.street || '';
            bValue = b.street || '';
            break;
          case 'location':
            aValue = a.location || '';
            bValue = b.location || '';
            break;
          default:
            aValue = a.company || '';
            bValue = b.company || '';
        }
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
             }
     });

  // Edit customer handlers
  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      branch: customer.branch || '',
      company: customer.company || '',
      street: customer.street || '',
      location: customer.location || '',
      country: customer.country === 'Österreich' ? 'AT' : 'DE',
      contact_person: customer.contact_person || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async () => {
    try {
      // Update in Supabase
      const { data, error } = await supabase
        .from('customers')
        .update({
          branch: editForm.branch,
          company: editForm.company,
          street: editForm.street,
          location: editForm.location,
          country: editForm.country === 'DE' ? 'Deutschland' : 'Österreich',
          contact_person: editForm.contact_person
        })
        .eq('id', editingCustomer.id);
      
      if (error) throw error;
      
      // Refresh customers list
      await loadCustomers();
      
      // Close modal
      setShowEditModal(false);
      setEditingCustomer(null);
      
      alert('Akustiker erfolgreich aktualisiert!');
      
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Fehler beim Aktualisieren des Akustikers');
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '2rem 1rem 1rem 1rem', borderBottom: '1px solid #eee' }}>
        <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 80, marginRight: 24 }} />
        <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '2rem', margin: 0 }}>Akustiker Verwaltung</h1>
      </header>
      
      {/* Breadcrumbs */}
      <div style={{ padding: '1rem 1rem 0.5rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: '#666' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#1d426a', 
              cursor: 'pointer', 
              textDecoration: 'underline',
              fontSize: '14px',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Startseite
          </button>
          <span style={{ color: '#999' }}>/</span>
          <span style={{ color: '#333', fontWeight: '500' }}>Akustiker</span>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
        {/* Search and Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Suche nach Name, Straße, Ort..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  width: '300px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Sortieren nach:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '8px 24px 8px 12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="company">Firma</option>
                <option value="branch">Filiale</option>
                <option value="contact_person">Ansprechpartner</option>
                <option value="street">Straße</option>
                <option value="location">Ort</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '8px 12px',
                  background: '#1d426a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          
          {/* Add New Akustiker Button */}
          <button
            onClick={() => setShowAddAkustikerModal(true)}
            style={{
              padding: '12px 24px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            Neuen Akustiker anlegen
          </button>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: '1rem', color: '#666', fontSize: '14px' }}>
          {filteredAndSortedCustomers.length} von {customers.length} Akustikern gefunden
        </div>

        {/* Akustiker List */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Filiale
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Firma
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Ansprechpartner
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Straße
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Ort
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Land
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1d426a', borderBottom: '2px solid #dee2e6' }}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCustomers.map((customer, index) => (
                <tr 
                  key={customer.id || index}
                  style={{ 
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                  }}
                >
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                    {customer.branch || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333', fontWeight: '500' }}>
                    {customer.company || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                    {customer.contact_person || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                    {customer.street || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                    {customer.location || '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                    {customer.country || '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                                                             <button
                      onClick={() => handleEditCustomer(customer)}
                      style={{
                        background: 'none',
                        color: '#1d426a',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAndSortedCustomers.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '0.5rem' }}>Keine Akustiker gefunden</div>
            <div style={{ fontSize: '14px' }}>
              {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Fügen Sie den ersten Akustiker hinzu.'}
            </div>
          </div>
        )}
      </div>

      {/* Add New Akustiker Modal */}
      <AddAkustikerModal
        isOpen={showAddAkustikerModal}
        onClose={() => setShowAddAkustikerModal(false)}
        onSubmit={handleAddAkustiker}
        newAkustiker={newAkustiker}
        setNewAkustiker={setNewAkustiker}
      />

      {/* Edit Akustiker Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#1d426a' }}>Akustiker bearbeiten</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Filiale*
                </label>
                <input
                  type="text"
                  value={editForm.branch}
                  onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Firma*
                </label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Straße*
                </label>
                <input
                  type="text"
                  value={editForm.street}
                  onChange={(e) => setEditForm(prev => ({ ...prev, street: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Ort*
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Ansprechpartner
                </label>
                <input
                  type="text"
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_person: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                  Land*
                </label>
                <select
                  value={editForm.country}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#1d426a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Aktualisieren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Add New Akustiker Modal Component
const AddAkustikerModal = ({ isOpen, onClose, onSubmit, newAkustiker, setNewAkustiker }) => {
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#1d426a' }}>Neuen Akustiker anlegen</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Filiale *
            </label>
            <input
              type="text"
              value={newAkustiker.branch}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, branch: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Firma *
            </label>
            <input
              type="text"
              value={newAkustiker.company}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, company: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Straße *
            </label>
            <input
              type="text"
              value={newAkustiker.street}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, street: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Ort *
            </label>
            <input
              type="text"
              value={newAkustiker.location}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, location: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
              Land *
            </label>
            <select
              value={newAkustiker.country}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, country: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Akustiker anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Erstellte Reperaturaufträge Page Component
const ErstellteReperaturauftragePage = () => {
  const [repairOrders, setRepairOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // With:
  // alert('Reparaturauftrag erfolgreich gespeichert!');

  // Load repair orders from Supabase
  const loadRepairOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          customers (
            company,
            branch,
            street,
            location,
            country
          )
        `)
        .eq('archived', showArchived)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepairOrders(data || []);
    } catch (error) {
      console.error('Error loading repair orders:', error);
      alert('Fehler beim Laden der Reparaturaufträge');
    } finally {
      setLoading(false);
    }
  };

  // Reload repair orders when archive toggle changes
  useEffect(() => {
    loadRepairOrders();
  }, [showArchived]);

  useEffect(() => {
    loadRepairOrders();
  }, []);

  // Toggle row expansion
  const toggleRow = (orderId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  // View repair order details
  const handleViewOrder = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  // Edit repair order
  const handleEditOrder = (orderId) => {
    // Navigate to repair order form with edit parameter
    window.location.href = `/reperaturauftrag?edit=${orderId}`;
  };


  // Delete repair order
  const handleDeleteOrder = (order) => {
    setDeletingOrder(order);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('repair_orders')
        .update({ archived: true })
        .eq('id', deletingOrder.id);

      if (error) throw error;

      setSuccessMessage('Reparaturauftrag erfolgreich archiviert!');
      setShowSuccessModal(true);
      setShowDeleteModal(false);
      setDeletingOrder(null);
      loadRepairOrders(); // Refresh the list
    } catch (error) {
      console.error('Error archiving repair order:', error);
      alert('Fehler beim Archivieren des Reparaturauftrags');
    }
  };

  // Toggle archived view
  const toggleArchived = () => {
    setShowArchived(!showArchived);
  };

  // Filter and sort repair orders
  const filteredRepairOrders = repairOrders
    .filter(order => {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.kommission?.toLowerCase().includes(searchLower) ||
        order.hersteller?.toLowerCase().includes(searchLower) ||
        order.geraetetyp?.toLowerCase().includes(searchLower) ||
        order.seriennummer?.toLowerCase().includes(searchLower) ||
        order.customers?.company?.toLowerCase().includes(searchLower) ||
        order.customers?.branch?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-';
    return `${parseFloat(price).toFixed(2).replace('.', ',')} €`;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Lade Reparaturaufträge...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '0.75rem 1rem', 
        background: '#f8f9fa', 
        borderRadius: '6px', 
        border: '1px solid #e0e0e0',
        fontSize: '14px',
        color: '#666'
      }}>
        <span style={{ cursor: 'pointer', color: '#1d426a' }} onClick={() => window.location.href = '/'}>
          Dashboard
        </span>
        <span style={{ margin: '0 0.5rem', color: '#999' }}>→</span>
        <span style={{ color: '#333', fontWeight: '500' }}>
          {showArchived ? 'Archivierte Reparaturaufträge' : 'Erstellte Reparaturaufträge'}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'left', marginBottom: '2rem', textAlign: 'left' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1d426a', fontSize: '2rem' }}>
            {showArchived ? 'Archivierte Reparaturaufträge' : 'Erstellte Reparaturaufträge'}
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            {showArchived 
              ? 'Alle archivierten Reparaturaufträge anzeigen' 
              : 'Alle gespeicherten Reparaturaufträge verwalten und einsehen'
            }
            <span style={{ marginLeft: '1rem', fontWeight: '500', color: '#1d426a' }}>
              ({repairOrders.length} {showArchived ? 'archiviert' : 'aktiv'})
            </span>
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Zurück zum Hauptmenü
        </button>
      </div>

      {/* Archive Button */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #e0e0e0', 
        borderRadius: 8, 
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 4px #0001'
      }}>
        <button
          onClick={toggleArchived}
          style={{
            padding: '8px 16px',
            background: showArchived ? '#1d426a' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20,21H4V10H6V19H18V10H20V21M20,3H4V8H20V3M6,5V6H18V5H6Z"/>
          </svg>
          {showArchived ? 'Aktive Reparaturaufträge anzeigen' : 'Archiv anzeigen'}
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #e0e0e0', 
        borderRadius: 8, 
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 4px #0001'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <input
              type="text"
              placeholder={showArchived 
                ? "Suchen in archivierten Reparaturaufträgen..." 
                : "Suchen nach Kommission, Hersteller, Gerätetyp, Seriennummer, Firma, Filiale..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Sortieren nach:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 24px 8px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="created_at">Erstellt am</option>
              <option value="kommission">Kommission</option>
              <option value="hersteller">Hersteller</option>
              <option value="werkstatteingang">Werkstatteingang</option>
              <option value="werkstattausgang">Werkstattausgang</option>
              <option value="nettopreis">Nettopreis</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '8px 12px',
                background: '#1d426a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {sortOrder === 'asc' ? ' ↑ ' : ' ↓ '}
            </button>
          </div>
        </div>
      </div>

      {/* Repair Orders Table */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 4px #0001'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '40px' }}></th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer' }}
                  onClick={() => handleSort('created_at')}>
                Erstellt am {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer' }}
                  onClick={() => handleSort('kommission')}>
                Kommission {sortBy === 'kommission' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Firma</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Filiale</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Wkst. Eingang</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer' }}
                  onClick={() => handleSort('nettopreis')}>
                Nettopreis {sortBy === 'nettopreis' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Porto</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '120px' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepairOrders.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  {searchTerm ? 'Keine Reparaturaufträge gefunden.' : 'Noch keine Reparaturaufträge erstellt.'}
                </td>
              </tr>
            ) : (
              filteredRepairOrders.map((order) => (
                <React.Fragment key={order.id}>
                  {/* Main Row */}
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleRow(order.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: '#666',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        {expandedRows.has(order.id) ? '▼' : '▶'}
                      </button>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                      {order.kommission || '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {order.customers?.company || '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {order.customers?.branch || '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {order.werkstatteingang ? formatDate(order.werkstatteingang) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#1d426a' }}>
                      {formatPrice(order.nettopreis)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {formatPrice(order.porto)}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {/* View Button */}
                        <button
                          onClick={() => handleViewOrder(order)}
                          style={{
                            background: 'none',
                            color: '#1d426a',
                            border: '1px solid #1d426a',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                          }}
                          title="Anzeigen"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditOrder(order.id)}
                          style={{
                            background: 'none',
                            color: '#1d426a',
                            border: '1px solid #1d426a',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                          }}
                          title="Bearbeiten"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                          </svg>
                        </button>
                        {/* Delete Button - Only show when not in archive view */}
                        {!showArchived && (
                          <button 
                            onClick={() => handleDeleteOrder(order)} 
                            title="Löschen"
                            style={{
                              background: 'none',
                              color: '#1d426a',
                              border: '1px solid #1d426a',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6V19M8,9h8v10H8V9M15.5,4l-1,-1h-5l-1,1H5V6h14V4H15.5Z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {expandedRows.has(order.id) && (
                    <tr style={{ background: '#f8f9fa' }}>
                      <td colSpan="10" style={{ padding: '0' }}>
                        <div style={{ padding: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                            gap: '1.5rem' 
                          }}>
                            {/* Left Column */}
                            <div>
                              <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', fontSize: '16px' }}>
                                Gerätedetails
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Hersteller:</span>
                                  <span>{order.hersteller || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Gerätetyp:</span>
                                  <span>{order.geraetetyp || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Seriennummer:</span>
                                  <span>{order.seriennummer || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Zubehör:</span>
                                  <span>{order.zubehoer || '-'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Middle Column */}
                            <div>
                              <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', fontSize: '16px' }}>
                                Werkstatt Details
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>KV am:</span>
                                  <span>{order.kv_date ? formatDate(order.kv_date) : '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Per:</span>
                                  <span>{order.per_method || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Gesendet an Werkstatt:</span>
                                  <span>{order.gesendet_an_werkstatt ? formatDate(order.gesendet_an_werkstatt) : '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Werkstattausgang:</span>
                                  <span>{order.werkstattausgang ? formatDate(order.werkstattausgang) : '-'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right Column */}
                            <div>
                              <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', fontSize: '16px' }}>
                                Zeitstempel
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Erstellt:</span>
                                  <span>{formatDateTime(order.created_at)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Aktualisiert:</span>
                                  <span>{formatDateTime(order.updated_at)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontWeight: '500', color: '#666' }}>Version:</span>
                                  <span>{order.version || 1}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Workshop Notes */}
                          {order.werkstatt_notiz && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1d426a', fontSize: '16px' }}>
                                Werkstatt Notiz
                              </h4>
                              <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                                {order.werkstatt_notiz}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '6px',
        fontSize: '14px',
        color: '#666'
      }}>
        {filteredRepairOrders.length > 0 && (
          <span>
            {filteredRepairOrders.length} Reparaturauftrag{filteredRepairOrders.length !== 1 ? 'e' : ''} angezeigt
            {searchTerm && ` (gefiltert nach "${searchTerm}")`}
          </span>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowViewModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
            
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#1d426a' }}>
              Reparaturauftrag Details
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', textAlign: 'left' }}>Kundendaten</h4>
                <div style={{ textAlign: 'left' }}>
                  <p><strong>Firma:</strong> {viewingOrder.customers?.company || '-'}</p>
                  <p><strong>Filiale:</strong> {viewingOrder.customers?.branch || '-'}</p>
                  <p><strong>Adresse:</strong> {viewingOrder.customers?.street}, {viewingOrder.customers?.location}, {viewingOrder.customers?.country}</p>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', textAlign: 'left' }}>Reparatur Details</h4>
                <div style={{ textAlign: 'left' }}>
                  <p><strong>Kommission:</strong> {viewingOrder.kommission || '-'}</p>
                  <p><strong>Hersteller:</strong> {viewingOrder.hersteller || '-'}</p>
                  <p><strong>Gerätetyp:</strong> {viewingOrder.geraetetyp || '-'}</p>
                  <p><strong>Seriennummer:</strong> {viewingOrder.seriennummer || '-'}</p>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a', textAlign: 'left' }}>Preise</h4>
                <div style={{ textAlign: 'left' }}>
                  <p><strong>Nettopreis:</strong> {formatPrice(viewingOrder.nettopreis)}</p>
                  <p><strong>Porto:</strong> {formatPrice(viewingOrder.porto)}</p>
                  <p><strong>Gesamt:</strong> {formatPrice((viewingOrder.nettopreis || 0) + (viewingOrder.porto || 0))}</p>
                </div>
              </div>
            </div>
            
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button
                    onClick={() => handleEditOrder(viewingOrder.id)}
                    style={{
                      padding: '10px 20px',
                      background: 'none',
                      color: '#1d426a',
                      border: '1px solid #1d426a',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                    </svg>
                    Bearbeiten
                  </button>
                </div>
          </div>
        </div>
      )}

      {/* Success Message Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#28a745',
              borderRadius: '50%',
              margin: '0 auto 1rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '18px' }}>
              Erfolgreich!
            </h3>
            <p style={{ margin: '0 0 2rem 0', fontSize: '16px', color: '#666', lineHeight: '1.5' }}>
              {successMessage}
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: '12px 24px',
                background: '#1d426a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#dc3545' }}>
              Reparaturauftrag löschen?
            </h3>
            <p style={{ margin: '0 0 2rem 0', fontSize: '16px', lineHeight: '1.5' }}>
              Sind Sie sicher, dass Sie den Reparaturauftrag von <strong>{deletingOrder.kommission || '-'}-{deletingOrder.customers?.company || '-'}</strong> löschen möchten?
            </p>
            <p style={{ margin: '0 0 2rem 0', fontSize: '14px', color: '#666' }}>
              Der Reparaturauftrag wird archiviert und kann nur noch von Administratoren in der Datenbank gelöscht werden.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  color: '#666',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to create warning triangle icon
const WarningTriangle = ({ show, message }) => {
  if (!show) return null;
  
  return (
    <div 
      style={{
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'pointer',
        zIndex: 10
      }}
      title={message}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc3545">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
    </div>
  );
};

// Helper function to get input style with character limit validation
const getInputStyleWithValidation = (currentValue, maxLength, baseStyle) => {
  const isAtLimit = currentValue && currentValue.length >= maxLength;
  return {
    ...baseStyle,
    border: isAtLimit ? '1px solid #dc3545' : baseStyle.border,
    position: 'relative',
    paddingRight: isAtLimit ? '30px' : baseStyle.paddingRight || '12px'
  };
};

// Wrapper component that can use useNavigate hook
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Check localStorage on component mount
    const savedLoginState = localStorage.getItem('isLoggedIn');
    return savedLoginState === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [country, setCountry] = useState('DE');
  const [freigabe, setFreigabe] = useState('Keine angabe');
  const [fehler, setFehler] = useState({});
  const [arbeiten, setArbeiten] = useState({});
  const [arbeitenManual, setArbeitenManual] = useState({});
  const [bottom, setBottom] = useState('kostenpflichtig');
  const [reklamationDate, setReklamationDate] = useState('');
  const [kulanzPorto, setKulanzPorto] = useState('ja');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  // Repair Order Details State
  const [kommission, setKommission] = useState('');
  const [hersteller, setHersteller] = useState('');
  const [geraetetyp, setGeraetetyp] = useState('');
  const [seriennummer, setSeriennummer] = useState('');
  const [werkstatteingang, setWerkstatteingang] = useState('');
  const [zubehoer, setZubehoer] = useState('');
  const [kvDate, setKvDate] = useState('');
  const [perMethod, setPerMethod] = useState('Fax');
  const [werkstattNotiz, setWerkstattNotiz] = useState('');
  const [werkstattDate, setWerkstattDate] = useState('');
  const [werkstattausgang, setWerkstattausgang] = useState('');
  
  // Manual Fehlerangaben State
  const [manualFehler1, setManualFehler1] = useState('');
  const [manualFehler2, setManualFehler2] = useState('');
  const [manualFehler3, setManualFehler3] = useState('');
  const [manualFehlerChecked1, setManualFehlerChecked1] = useState(false);
  const [manualFehlerChecked2, setManualFehlerChecked2] = useState(false);
  const [manualFehlerChecked3, setManualFehlerChecked3] = useState(false);
  
  // IDO/HDO State for Arbeitszeit pricing
  const [idoHdo, setIdoHdo] = useState('IDO');
  
  // Additional fields state
  const [gesaendetAnWerkstatt, setGesaendetAnWerkstatt] = useState('');
  const [notes, setNotes] = useState('');
  
  // Kostenvoranschlag State
  const [kostenvoranschlagChecked, setKostenvoranschlagChecked] = useState(false);
  const [kostenvoranschlagAmount, setKostenvoranschlagAmount] = useState('');

  // Add New Akustiker Modal State
  const [showAddAkustikerModal, setShowAddAkustikerModal] = useState(false);
  const [newAkustiker, setNewAkustiker] = useState({
    branch: '',
    company: '',
    street: '',
    location: '',
    country: 'DE'
  });

  // Edit Repair Order State
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  


  // Logic for disabling all fields if not 'Keine angabe' or 'Reparatur laut KV durchführen' or if Verfahren disables fields
  const verfahrenDisables = bottom === 'garantie' || bottom === 'reklamation' || bottom === 'kulanz';
  const isDisabled = (freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen') || verfahrenDisables;
  const hideFields = isDisabled || verfahrenDisables;

  // Load customers when component mounts
  useEffect(() => {
    loadCustomers();
  }, []);

  // Reset handler
  const handleReset = () => {
    setArbeiten({});
    setArbeitenManual({});
    // Reset repair order details
    setKommission('');
    setHersteller('');
    setGeraetetyp('');
    setSeriennummer('');
    setWerkstatteingang('');
    setZubehoer('');
    setKvDate('');
    setPerMethod('Fax');
    setWerkstattNotiz('');
    setWerkstattDate('');
    setWerkstattausgang('');
    setManualFehler1('');
    setManualFehler2('');
    setManualFehler3('');
    setManualFehlerChecked1(false);
    setManualFehlerChecked2(false);
    setManualFehlerChecked3(false);
          setFreigabe('Keine angabe');
    setFehler({});
    setBottom('kostenpflichtig');
    setReklamationDate('');
    setKulanzPorto('ja');
    setIdoHdo('IDO');
    setGesaendetAnWerkstatt('');
    setNotes('');
    
    // Reset Kostenvoranschlag
    setKostenvoranschlagChecked(false);
    setKostenvoranschlagAmount('');
    
    // Reset editing state
    setIsEditing(false);
    setEditingOrderId(null);
    setSelectedCustomer(null);
    setSelectedCompany(null);
    setCustomerSearch('');
  };

  // Load repair order data for editing
  const loadRepairOrderForEdit = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          customers (
            company,
            branch,
            street,
            location,
            country
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      const order = data;
      
      // Set customer
      setSelectedCustomer(order.customers);
      setSelectedCompany(order.customers.company);
      
      // Set repair order details
      setKommission(order.kommission || '');
      setHersteller(order.hersteller || '');
      setGeraetetyp(order.geraetetyp || '');
      setSeriennummer(order.seriennummer || '');
      setWerkstatteingang(order.werkstatteingang || '');
      setZubehoer(order.zubehoer || '');
      setKvDate(order.kv_date || '');
      setPerMethod(order.per_method || 'Fax');
      setWerkstattNotiz(order.werkstatt_notiz || '');
      setWerkstattDate(order.werkstatt_date || '');
      setWerkstattausgang(order.werkstattausgang || '');
      setGesaendetAnWerkstatt(order.gesendet_an_werkstatt || '');
      setNotes(order.notes || '');
      
      // Set manual fehlerangaben
      if (order.fehlerangaben) {
        const fehler = order.fehlerangaben;
        setManualFehler1(fehler.manual1?.text || '');
        setManualFehler2(fehler.manual2?.text || '');
        setManualFehler3(fehler.manual3?.text || '');
        setManualFehlerChecked1(fehler.manual1?.checked || false);
        setManualFehlerChecked2(fehler.manual2?.checked || false);
        setManualFehlerChecked3(fehler.manual3?.checked || false);
      }
      
      // Set form settings
      setCountry(order.country || 'DE');
      setFreigabe(order.freigabe || 'Keine angabe');
      setBottom(order.bottom || 'kostenpflichtig');
      setReklamationDate(order.reklamation_date || '');
      setKulanzPorto(order.kulanz_porto || 'ja');
      setIdoHdo(order.ido_hdo || 'IDO');
      
      // Set Kostenvoranschlag
      setKostenvoranschlagChecked(order.kostenvoranschlag_checked || false);
      setKostenvoranschlagAmount(order.kostenvoranschlag_amount || '');
      
      // Set arbeiten and fehler
      if (order['ausgeführte_arbeiten']) {
        const arbeiten = order['ausgeführte_arbeiten'];
        const newArbeiten = {};
        const newArbeitenManual = {};
        
        Object.keys(arbeiten).forEach(key => {
          if (arbeiten[key].checked) {
            newArbeiten[key] = true;
            if (arbeiten[key].input) {
              newArbeitenManual[key] = arbeiten[key].input;
            }
          }
        });
        
        setArbeiten(newArbeiten);
        setArbeitenManual(newArbeitenManual);
      }
      
      if (order.fehlerangaben) {
        const fehler = order.fehlerangaben;
        const newFehler = {};
        
        Object.keys(fehler).forEach(key => {
          if (key !== 'manual1' && key !== 'manual2' && key !== 'manual3' && fehler[key]) {
            newFehler[key] = true;
          }
        });
        
        setFehler(newFehler);
      }
      
      // Set editing state
      setIsEditing(true);
      setEditingOrderId(orderId);
      
    } catch (error) {
      console.error('Error loading repair order for edit:', error);
      alert('Fehler beim Laden des Reparaturauftrags');
    }
  };

  // Check if we're editing on route change
  useEffect(() => {
    if (location.pathname === '/reperaturauftrag') {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      
      if (editId) {
        loadRepairOrderForEdit(editId);
      } else {
        handleReset();
      }
    }
  }, [location.pathname]);

  // Handlers
  const handleCountry = (e) => setCountry(e.target.value);
  const handleFreigabe = (val) => setFreigabe(val);
  const handleFehler = (key) => setFehler((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleArbeiten = (key) => setArbeiten((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleArbeitenManual = (key, value) => {
    value = value.replace(/[^0-9,]/g, '');
    value = value.replace(/(,.*),/g, '$1');
    setArbeitenManual((prev) => ({ ...prev, [key]: value }));
  };
  const handleBottom = (val) => {
    setBottom(val);
    if (val !== 'kostenpflichtig') setKulanzPorto('ja');
    if (val !== 'reklamation') setReklamationDate('');
  };
  const handleKulanzPorto = (val) => setKulanzPorto(val);
  const handleReklamationDate = (e) => setReklamationDate(e.target.value);
  const handleWerkstattDate = (e) => setWerkstattDate(e.target.value);
  
  // Add New Akustiker handler
  const handleAddAkustiker = async () => {
    try {
      // Check for duplicate (exact match: name + branch + street)
      const isDuplicate = customers.some(customer => 
        customer.company === newAkustiker.company &&
        customer.branch === newAkustiker.branch &&
        customer.street === newAkustiker.street
      );
      
      if (isDuplicate) {
        alert('Dieser Akustiker befindet sich bereits in der Datenbank');
        return;
      }
      
      // Add to Supabase
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          branch: newAkustiker.branch,
          company: newAkustiker.company,
          street: newAkustiker.street,
          location: newAkustiker.location,
          country: newAkustiker.country === 'DE' ? 'Deutschland' : 'Österreich',
          contact_person: ''
        }]);
      
      if (error) throw error;
      
      // Refresh customers list
      await loadCustomers();
      
      // Reset form and close modal
      setNewAkustiker({
        branch: '',
        company: '',
        street: '',
        location: '',
        country: 'DE'
      });
      setShowAddAkustikerModal(false);
      
      alert('Akustiker erfolgreich angelegt!');
      
    } catch (error) {
      console.error('Error adding akustiker:', error);
      alert('Fehler beim Anlegen des Akustikers');
    }
  };

  // Save Repair Order handler
  const handleSaveRepairOrder = async () => {
    try {
      // Validate that a customer is selected
      if (!selectedCustomer) {
        alert('Bitte wählen Sie zuerst einen Kunden aus.');
        return;
      }

      // Build JSON payloads matching DB columns
      const fehlerPayload = {
        ...fehler,
        manual1: { checked: !!manualFehlerChecked1, text: manualFehler1 || '' },
        manual2: { checked: !!manualFehlerChecked2, text: manualFehler2 || '' },
        manual3: { checked: !!manualFehlerChecked3, text: manualFehler3 || '' }
      };

      const arbeitenPayload = ARBEITEN.reduce((acc, a) => {
        const checked = !!arbeiten[a.key];
        const input = arbeitenManual[a.key] || '';
        acc[a.key] = { checked, input };
        return acc;
      }, {});

      // Prepare repair order data (align to Supabase table columns)
      const repairOrderData = {
        customer_id: selectedCustomer.id,
        kommission: kommission || null,
        hersteller: hersteller || null,
        geraetetyp: geraetetyp || null,
        seriennummer: seriennummer || null,
        werkstatteingang: werkstatteingang || null,
        zubehoer: zubehoer || null,
        kv_date: kvDate || null,
        per_method: perMethod || null,
        werkstatt_notiz: werkstattNotiz || null,
        werkstatt_date: werkstattDate || null,
        werkstattausgang: werkstattausgang || null,
        gesendet_an_werkstatt: gesaendetAnWerkstatt || null,
        notes: notes || null,
        fehlerangaben: fehlerPayload,
        ['ausgeführte_arbeiten']: arbeitenPayload,
        kostenvoranschlag_checked: kostenvoranschlagChecked || false,
        kostenvoranschlag_amount: kostenvoranschlagAmount || null,
        nettopreis: Number.isFinite(net) ? parseFloat(net.toFixed(2)) : null,
        porto: Number.isFinite(porto) ? parseFloat(porto.toFixed(2)) : null,
        // Add all the missing fields that were not being saved
        freigabe: freigabe || 'Keine angabe',
        bottom: bottom || 'kostenpflichtig',
        reklamation_date: reklamationDate || null,
        kulanz_porto: kulanzPorto || 'ja',
        ido_hdo: idoHdo || 'IDO',
        country: country || 'DE'

      };

      // Add version tracking and timestamp for updates
      if (isEditing && editingOrderId) {
        // Get current order data for version tracking
        const { data: currentOrder } = await supabase
          .from('repair_orders')
          .select('version')
          .eq('id', editingOrderId)
          .single();
        
        repairOrderData.version = (currentOrder?.version || 0) + 1;
        // Explicitly set updated_at to current timestamp
        repairOrderData.updated_at = new Date().toISOString();
      }

      let result;
      
      if (isEditing && editingOrderId) {
        // Update existing repair order
        const { data, error } = await supabase
          .from('repair_orders')
          .update(repairOrderData)
          .eq('id', editingOrderId);

        if (error) throw error;
        result = data;
        setSuccessMessage('Reparaturauftrag erfolgreich aktualisiert!');
        setShowSuccessModal(true);
      } else {
        // Create new repair order
        const { data, error } = await supabase
          .from('repair_orders')
          .insert([repairOrderData]);

        if (error) throw error;
        result = data;
        setSuccessMessage('Reparaturauftrag erfolgreich gespeichert!');
        setShowSuccessModal(true);
      }
      
      // Reset form after successful save/update
      handleReset();
      
      // If we were editing, navigate back to repair orders overview
      if (isEditing && editingOrderId) {
        navigate('/erstellte-reperaturauftrage');
      }
      
    } catch (error) {
      console.error('Error saving repair order:', error);
      alert('Fehler beim Speichern des Reparaturauftrags');
    }
  };
  
  // Manual Fehlerangaben handlers
  const handleManualFehler1 = (checked) => setManualFehlerChecked1(checked);
  const handleManualFehler2 = (checked) => setManualFehlerChecked2(checked);
  const handleManualFehler3 = (checked) => setManualFehlerChecked3(checked);
  
  // IDO/HDO handler
  const handleIdoHdo = (val) => setIdoHdo(val);

  // Customer handlers
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setShowBranchDropdown(false);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setSelectedCustomer(null);
    setShowCompanyDropdown(false);
    
    // Check if search term matches a specific branch or street
    const searchTerm = customerSearch.toLowerCase().trim();
    const companyBranches = groupedCustomers[company]?.branches || [];
    
    // Find the specific branch that matches the search
    const matchingBranch = companyBranches.find(branch => 
      branch.branch.toLowerCase().includes(searchTerm) ||
      branch.street.toLowerCase().includes(searchTerm) ||
      branch.location.toLowerCase().includes(searchTerm)
    );
    
    if (matchingBranch) {
      // Auto-select the matching branch
      handleCustomerSelect(matchingBranch);
    } else {
      // Show branch dropdown if no specific match
      setShowBranchDropdown(true);
    }
  };

  // Group customers by company
  const groupedCustomers = customers.reduce((acc, customer) => {
    const companyKey = customer.company;
    if (!acc[companyKey]) {
      acc[companyKey] = {
        company: customer.company,
        branches: []
      };
    }
    acc[companyKey].branches.push(customer);
    return acc;
  }, {});

  // Get companies for dropdown
  const companies = Object.values(groupedCustomers).map(group => ({
    name: group.company,
    branchCount: group.branches.length
  }));

  // Filter companies based on search (including street and branch names)
  const filteredCompanies = companies.filter(company => {
    if (!customerSearch.trim()) return true;
    
    const searchTerm = customerSearch.toLowerCase().trim();
    
    // Check if search term matches company name
    if (company.name.toLowerCase().includes(searchTerm)) return true;
    
    // Check if search term matches any branch name or street
    const companyBranches = groupedCustomers[company.name]?.branches || [];
    return companyBranches.some(branch => 
      branch.branch.toLowerCase().includes(searchTerm) ||
      branch.street.toLowerCase().includes(searchTerm) ||
      branch.location.toLowerCase().includes(searchTerm)
    );
  });

  // Get branches for selected company
  const selectedCompanyBranches = selectedCompany ? groupedCustomers[selectedCompany]?.branches || [] : [];

  const filteredCustomers = customers.filter(customer => {
    if (!customerSearch.trim()) return false;
    
    const searchTerm = customerSearch.toLowerCase().trim();
    
    // Check if any field contains the search term (partial matching)
    const searchableFields = [
      customer.company || '',
      customer.branch || '',
      customer.location || '',
      customer.street || '',
      customer.country || '',
      customer.contact_person || ''
    ].map(field => field.toLowerCase());
    
    // Check if search term is contained in any field
    return searchableFields.some(field => field.includes(searchTerm));
  }).sort((a, b) => {
    // Sort alphabetically by company name
    const companyA = a.company?.toLowerCase() || '';
    const companyB = b.company?.toLowerCase() || '';
    return companyA.localeCompare(companyB);
  });

  // Load customers from Supabase
  const loadCustomers = async () => {
    try {
      console.log('Loading customers from Supabase...');
      console.log('Supabase client:', supabase);
      
      const { data, error } = await supabase.from('customers').select('*');
      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Successfully loaded ${data.length} customers from Supabase`);
        console.log('First customer:', data[0]);
        setCustomers(data);
        console.log('Customers state set to:', data);
      } else {
        console.log('No customers found in Supabase');
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.customer-dropdown')) {
        setShowCompanyDropdown(false);
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'Fa.Gretzinger@t-online.de' && loginPassword === 'GretBrunn2025!') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setLoginError('');
    } else {
      setLoginError('Ungültige Anmeldedaten');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setLoginEmail('');
    setLoginPassword('');
  };

  // If not logged in, show login form
  if (!isLoggedIn) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1d426a 0%, #2a5a8a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '50px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '450px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <img 
              src="/gretzinger-logo.svg" 
              alt="Gretzinger Logo" 
              style={{
                width: '140px',
                height: 'auto',
                margin: '0 auto 20px auto'
              }}
            />
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1d426a',
              marginBottom: '8px'
            }}>
              GRETZINGER
            </div>
            <div style={{
              fontSize: '16px',
              color: '#666'
            }}>
              Hörgeräteservice
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500'
              }}>
                E-Mail
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                placeholder="Ihre E-Mail-Adresse"
                required
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#333',
                fontWeight: '500'
              }}>
                Passwort
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                placeholder="Ihr Passwort"
                required
              />
            </div>

            {loginError && (
              <div style={{
                color: '#dc3545',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: '#1d426a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Anmelden
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculation
  const countryObj = COUNTRY_OPTIONS.find((c) => c.key === country);
  let net = 0;
  let porto = countryObj ? countryObj.porto : 0;
  let arbeitszeit = countryObj ? countryObj.arbeitszeit : 0;
  
  // Apply IDO/HDO pricing for Germany only
  if (country === 'DE') {
    if (idoHdo === 'IDO') {
      arbeitszeit = 22.0;
    } else if (idoHdo === 'HDO') {
      arbeitszeit = 26.0;
    }
  }
  // Austria always uses 26.0 (unchanged)

  // Apply Porto toggle for all procedure types
  if (kulanzPorto === 'nein') {
    porto = 0;
  }

  if (freigabe === 'Unrepariert zurückschicken') {
    net = 14.95;
    porto = 0;
  } else if (freigabe === 'Verschrotten') {
    net = 0;
    porto = 0;
  } else if (bottom === 'kostenpflichtig') {
    ARBEITEN.forEach((a) => {
      if (arbeiten[a.key]) {
        if (a.price) {
          if (a.price === 'country') net += arbeitszeit;
          else net += a.price;
        } else {
          // Manual field
          const val = arbeitenManual[a.key];
          if (val) net += parseFloat(val.replace(',', '.')) || 0;
        }
      }
    });
    // net is now the base price only - DO NOT add porto here
  } else if (bottom === 'garantie' || bottom === 'reklamation') {
    net = 0;
    // Porto can still be applied if enabled via toggle
  } else if (bottom === 'kulanz') {
    net = 0;
    // For kulanz, net remains 0, porto is handled separately
  }

//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------- PDF - Export ---------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // PDF Export function
  const handlePdfExport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const zeile = 12;
    const leftX = 20;
    const leftxRow = 65;
    const rightXstop = 192;
    // Header
    doc.setFont('helvetica', '');
    doc.setFontSize(8);
    doc.text('HG Gretzinger UG, Hörgeräteservice', leftX, zeile);
    doc.text('Gibitzenhofstr. 86', leftX, zeile+4);
    doc.text('90443 Nürnberg', leftX, zeile+8);
    doc.text('Homepage: www.Fa-Gretzinger.de', leftxRow, zeile);
    doc.text('E-Mail: Fa.Gretzinger@t-online.de', leftxRow, zeile+4);
    doc.text('Tel. +49 (0)911 / 540 49 44, Fax.: 540 49 46', leftxRow, zeile +8);
    doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', rightXstop-35, 8, 33, 14);
    doc.setLineWidth(0.2);
    doc.line(leftX, zeile+14, rightXstop, zeile+14);



    // Customer Information Section
    const customerInfo = zeile+18;
    if (selectedCustomer) {
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Akustikername / Absender bzw. Firmenstempel:',leftX, customerInfo);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      doc.text(selectedCustomer.company, leftX, customerInfo+5);
      doc.text(selectedCustomer.street, leftX, customerInfo+9);
      doc.text(`${selectedCustomer.location}, ${selectedCustomer.country}`, leftX, customerInfo+13);
    }

    // Title
    const repauftrag = customerInfo+19;

    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Reparaturauftrag', leftX+85, repauftrag+3, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');


    
    
    // Repair Order Details Table - Always show with fixed length
    let y = repauftrag + 8;
    // Always show the table, even if empty (will show dashes)
    {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      
      // Table headers with 1px padding
      const tableY = y + 1; // Reduced to 1px top padding
      const colWidth = 30;
      const startX = leftX+1; // Reduced to 1px left padding (10 + 1)
      
      // Draw table borders with minimal padding
      doc.setDrawColor(0); // Black color
      doc.setLineWidth(0.3); // Thicker lines for table borders
      

      
      // Draw vertical lines with minimal padding
      const tableY1 = tableY - 3;
      const tableheight = 12.5;
      const tableY2 = tableY1 + tableheight;
      const tablestartX = startX-1;
      const tablenEndX = rightXstop
      const tableHeadingY = tableY1 + 3;
      const tableContentY = tableY2 -2;
      const txtdistancetable = 1.5;
      
      const komissionx1 = tablestartX;
      const komissionwidth = 30;
      const komissionx2 = startX + komissionwidth;
      const komissionTextX = komissionx1 + txtdistancetable;
     

      const herstellerx1 = komissionx2;
      const herstellerTextX = herstellerx1 + txtdistancetable;
      const herstellerwidth = 25;
      const herstellerx2 = herstellerx1 + herstellerwidth;

      const geraetetypx1 = herstellerx2;
      const geraetetypTextX = geraetetypx1 + txtdistancetable;
      const geraetetypwidth = 42;
      const geraetetypx2 = geraetetypx1 + geraetetypwidth;

      const seriennummerx1 = geraetetypx2;
      const seriennummerTextX = seriennummerx1 + txtdistancetable;
      const seriennummerwidth = 27;
      const seriennummerx2 = seriennummerx1 + seriennummerwidth;

      const werkstatteingangx1 = seriennummerx2;
      const werkstatteingangTextX = werkstatteingangx1 + txtdistancetable;
      const werkstatteingangwidth = 26;
      const werkstatteingangx2 = werkstatteingangx1 + werkstatteingangwidth;

      const zubehoerx1 = werkstatteingangx2;
      const zubehoerTextX = zubehoerx1 + txtdistancetable;
      const zubehoerwidth = 25;
      const zubehoerx2 = zubehoerx1 + zubehoerwidth;
      


      

      // vertical lines

      // Linienstärke anpassen
doc.setLineWidth(0.25); // Die Linie wird etwas dicker

// Linienfarbe auf hellgrau setzen
// doc.setDrawColor('#353839');
      doc.line(tablestartX, tableY1, tablestartX, tableY2); // first vertical line - left border

      doc.line(komissionx2, tableY1, komissionx2, tableY2); // second vertical line - komission endline
      doc.line(herstellerx2, tableY1, herstellerx2, tableY2); // third vertical line - hersteller endline
      doc.line(geraetetypx2, tableY1, geraetetypx2, tableY2); // fourth vertical line - geraetetyp endline
      doc.line(seriennummerx2, tableY1, seriennummerx2, tableY2); // fifth vertical line - seriennummer endline
      doc.line(werkstatteingangx2, tableY1, werkstatteingangx2, tableY2); // sixth vertical line - werkstatteingang endline

      doc.line(tablenEndX, tableY1, tablenEndX, tableY2); // last vertical line - right border

      // horizontal lines
      doc.line(tablestartX, tableY1, tablenEndX, tableY1); // top horizontal line
      doc.line(tablestartX, tableY2, tablenEndX, tableY2); // bottom horizontal line



            // Headers with padding
      
            doc.text('Kommission', komissionTextX, tableHeadingY);
            doc.text('Hersteller', herstellerTextX, tableHeadingY);
            doc.text('Gerätetyp', geraetetypTextX, tableHeadingY);
            doc.text('Seriennummer', seriennummerTextX, tableHeadingY);
            doc.text('Wkst. Eingang', werkstatteingangTextX, tableHeadingY);
            doc.text('Zubehör', zubehoerTextX, tableHeadingY);
            
            // Data row with padding - always show with fixed length and dashes for empty fields
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10.5);
            doc.text(kommission || '-', komissionTextX, tableContentY);
            doc.text(hersteller || '-', herstellerTextX, tableContentY);
            doc.text(geraetetyp || '-', geraetetypTextX, tableContentY);
            doc.text(seriennummer || '-', seriennummerTextX, tableContentY);



      

      
      const repWerkstattNotiz = leftX+110
      const perFaxMail = repWerkstattNotiz +52

      // Format date for Werkstatteingang
      let werkstatteingangFormatted = '-';
      if (werkstatteingang) {
        const [yyyy, mm, dd] = werkstatteingang.split('-');
        werkstatteingangFormatted = `${dd}.${mm}.${yyyy}`;
      }
      doc.text(werkstatteingangFormatted, werkstatteingangTextX, tableContentY);
      doc.text(zubehoer || '-', zubehoerTextX, tableContentY);
      
      // Workshop Notes
      if (kvDate || perMethod || werkstattNotiz) {
        doc.setFontSize(8);
        let notesY = tableY + 15;
        doc.setFont(undefined, 'bold');
        doc.text('Rep. werkstatt Notiz: KV am:', repWerkstattNotiz, notesY);
        doc.setFont(undefined, 'normal');
        
        if (kvDate) {
          const [yyyy, mm, dd] = kvDate.split('-');
          doc.text(` ${dd}.${mm}.${yyyy}`, repWerkstattNotiz+37, notesY);
        }
        const gesendetanwerkstattX = leftX+142;
        const gesendetanwerkstattY = customerInfo;

                // Workshop Date Section (Top Right)
                if (werkstattDate) {
                  doc.setFontSize(8);
                  doc.setFont(undefined, 'bold');
                  doc.text('Sendedatum:', gesendetanwerkstattX, gesendetanwerkstattY);
                  doc.setFont(undefined, 'normal');
                  
                  // Format date as DD.MM.YYYY
                  const [yyyy, mm, dd] = werkstattDate.split('-');
                  doc.setFontSize(8);
                  doc.text(`${dd}.${mm}.${yyyy}`, gesendetanwerkstattX +17, gesendetanwerkstattY);
                }

                // Werkstattausgang Section (Top Right)
                const werkstattausgangY = 262;
                const werkstattausgangX = 144;
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text('Werkstattausgang:', werkstattausgangX, werkstattausgangY);
                doc.setFont(undefined, 'normal');
                
                if (werkstattausgang) {
                  // Format date as DD.MM.YYYY
                  const [yyyy, mm, dd] = werkstattausgang.split('-');
                  doc.setFontSize(10);
                  doc.setFont(undefined, 'bold');
                  doc.text(`${dd}.${mm}.${yyyy}`, werkstattausgangX + 30, werkstattausgangY);
                } else {
                  doc.text('-', werkstattausgangX + 30, werkstattausgangY);
                }
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('per:', perFaxMail, notesY);
        doc.setFont(undefined, 'normal');
        doc.text(perMethod || '', perFaxMail+6, notesY);
        
        //if (werkstattNotiz) {
        //  doc.text(werkstattNotiz, startX + 100, notesY);
        //}
      }
      
      y = tableY + 10; // Reduced margin below heading only
    }
    
    // More padding below title
    y = Math.max(y, 82); // Keep normal spacing for content sections

    // Column positions
    
    const separatorX = 100; // move separator further right to prevent overlap
    const rightX = separatorX + 10; // right column starts with more space after separator
    const priceColX = 190; // fixed X for right-aligned prices
    const sectionPad = 4; // Reduced from 8
    const linePad = 6; // Increased from 4 to add 2px gap between checkboxes
    const labelPad = 8;
    var startcheckbox = 103;

    var CheckBoxbereich = repauftrag + 32;

    // Left column: Freigabe, Fehlerangaben, Verfahren
    let yLeft = CheckBoxbereich; // Add 4px padding above "Bei Freigabe bitte ankreuzen"
    doc.setFont(undefined, 'bold');
    // doc.text('Bei Freigabe bitte ankreuzen:', leftX, yLeft);
    doc.text('Bei Freigabe bitte ankreuzen:', leftX, CheckBoxbereich);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    
    // Only show the actual repair options in PDF, not "Keine angabe"
    const pdfOptions = FREIGABE_OPTIONS.filter(opt => opt !== 'Keine angabe');
    pdfOptions.forEach(opt => {
      // If "Keine angabe" is selected, show "Reparatur laut KV durchführen" as unchecked
      // If "Reparatur laut KV durchführen" is selected, show it as checked
      const checked = freigabe === opt;
      drawCheckbox(doc, leftX + 1, yLeft - 2.5, checked);
      doc.text(opt, leftX + 8, yLeft);
      yLeft += linePad;
    });
    yLeft += sectionPad;
    doc.setFont(undefined, 'bold');
    doc.text('Fehlerangaben:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    FEHLERANGABEN.forEach((f, idx) => {
      const checked = !!fehler[f];
      drawCheckbox(doc, leftX + 1, yLeft - 2.5, checked);
      doc.text(f, leftX + 8, yLeft);
      yLeft += linePad; // Fixed: removed the -1 to match other sections
      if (idx === FEHLERANGABEN.length - 1) {
        yLeft += sectionPad;
      }
    });
    
    // Manual Fehlerangaben in PDF - Only show checked items
    if (manualFehlerChecked1 || manualFehlerChecked2 || manualFehlerChecked3) {
      yLeft += 2; // Add some space before manual entries
      doc.setFont(undefined, 'normal');
      
      if (manualFehlerChecked1 && manualFehler1) {
        drawCheckbox(doc, leftX+1, yLeft - 8, manualFehlerChecked1);
        doc.text(manualFehler1, leftX + 8, yLeft - 5);
        yLeft += linePad;
      }
      
      if (manualFehlerChecked2 && manualFehler2) {
        drawCheckbox(doc, leftX + 1, yLeft - 8, manualFehlerChecked2);
        doc.text(manualFehler2, leftX + 8, yLeft - 5);
        yLeft += linePad;
      }
      
      if (manualFehlerChecked3 && manualFehler3) {
        drawCheckbox(doc, leftX + 1, yLeft - 8, manualFehlerChecked3);
        doc.text(manualFehler3, leftX + 8, yLeft - 5);
        yLeft += linePad;
      }
      
      yLeft += 2;
    }

    var verfahrenY = 228;
    doc.setFont(undefined, 'bold');
    doc.text('Verfahren:', leftX, verfahrenY);
    doc.setFont(undefined, 'normal');
    verfahrenY += linePad + 1;
    const verfahrenOptions = [
      { label: 'Kostenpflichtige Reparatur', value: 'kostenpflichtig' },
      { label: 'Garantie', value: 'garantie' },
      { label: 'Reklamation auf Reparatur von', value: 'reklamation' },
      { label: 'Kulanz', value: 'kulanz' },
    ];
    verfahrenOptions.forEach(opt => {
      const checked = bottom === opt.value;
      let label = opt.label;
      if (opt.value === 'reklamation' && bottom === 'reklamation' && reklamationDate) {
        // Format date as DD.MM.YYYY
        const [yyyy, mm, dd] = reklamationDate.split('-');
        label += ' ';
        doc.setFont(undefined, checked ? 'bold' : 'normal');
        drawCheckbox(doc, leftX + 1, verfahrenY - 3.5, checked);
        doc.text(label, leftX + 8, verfahrenY);
        if (reklamationDate) {
          doc.text(`${dd}.${mm}.${yyyy}`, leftX + 8 + doc.getTextWidth(label) + 2, verfahrenY, { font: 'helvetica', fontStyle: 'bold' });
        }
        doc.setFont(undefined, 'normal');
      } else {
        drawCheckbox(doc, leftX + 1, verfahrenY - 3.5, checked);
        doc.text(label, leftX + 8, verfahrenY);
      }
      verfahrenY += linePad;
      

    });
    if (bottom === 'kulanz') {
      verfahrenY += 1;
      drawCheckbox(doc, leftX + 10, verfahrenY - 3.5, kulanzPorto === 'ja');
      doc.text('Porto ja', leftX + 16, verfahrenY);
      drawCheckbox(doc, leftX + 38, verfahrenY - 3.5, kulanzPorto === 'nein');
      doc.text('Porto nein', leftX + 44, verfahrenY);
      verfahrenY += linePad;
    }
    const kvYabNetto = 73
    const kvXabNetto = leftX + 25
    // Kostenvoranschlag Section
    yLeft += sectionPad;
    doc.setFont(undefined, 'bold');
    doc.text('Kostenvoranschlag:', leftX, kvYabNetto);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    
    // Kostenvoranschlag checkbox and amount
    drawCheckbox(doc, kvXabNetto, kvYabNetto - 2.5, kostenvoranschlagChecked);
    doc.text('ab', kvXabNetto + 6, kvYabNetto);
    
    // Add amount text field (if checked and has amount)
    if (kostenvoranschlagChecked && kostenvoranschlagAmount) {
      doc.text(`${kostenvoranschlagAmount} € - netto`, kvXabNetto + 10, kvYabNetto);
    } else {
      doc.text('_____ € - netto', kvXabNetto + 10, kvYabNetto);
    }
    yLeft += linePad;

    // Right column: Ausgeführte Arbeiten (true 3-column grid)
    let yRight = CheckBoxbereich;
    doc.setFont(undefined, 'bold');
    doc.text('Ausgeführte Arbeiten:', rightX, yRight);
    doc.setFont(undefined, 'normal');
    yRight += linePad + 1;

    // Find max label width for price alignment (calculate before the loop)
    let maxLabelWidth = 0;
    ARBEITEN.forEach(a => {
      const labelWidth = doc.getTextWidth(a.label);
      if (labelWidth > maxLabelWidth) maxLabelWidth = labelWidth;
    });
    ARBEITEN.forEach(a => {
      const checked = !!arbeiten[a.key];
      let value = '';
      if (checked) {
        if (bottom === 'kostenpflichtig') {
          if (a.price && a.price !== 'country') value = `${a.price.toFixed(2).replace('.', ',')} €`;
          else if (a.price === 'country') value = `${arbeitszeit.toFixed(2).replace('.', ',')} €`;
          else if (arbeitenManual[a.key]) value = `${arbeitenManual[a.key]} €`;
        } else {
          value = '0,00 €';
        }
      }
      // Checkbox
      drawCheckbox(doc, rightX + 2, yRight - 3.5, checked);
      // Label: fill space between checkbox and price, truncate if needed
      let labelMaxWidth = priceColX - (rightX + 2 + labelPad) - 8; // 8mm gap before price
      let labelText = a.label;
      let labelWidth = doc.getTextWidth(labelText);
      if (labelWidth > labelMaxWidth) {
        while (labelText.length > 2 && doc.getTextWidth(labelText + '…') > labelMaxWidth) {
          labelText = labelText.slice(0, -1);
        }
        labelText += '…';
      }
      doc.text(labelText, rightX + 2 + labelPad, yRight);
      // Price (only if checked)
      if (value) doc.text(value, priceColX, yRight, { align: 'right' });
      yRight += linePad;
    });
    yRight += 2; // Reduced from sectionPad (4)

    // Draw vertical line between columns (only after left grid finishes)
   // y = yRight + 5;
   // doc.setDrawColor(180);
   // doc.setLineWidth(0.2);
   // doc.line(separatorX, y, separatorX, yRight + 3); // Only go to right column end, not overlapping Verfahren


    
    // Nettopreis & Porto directly below "Ausgeführte Arbeiten", right-aligned
    const pricingY = yRight + 8; // Position directly below right column
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`Nettopreis: ${net.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 35, pricingY, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(`zzgl. Porto & Verpackung: ${porto.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 35, pricingY + 6, { align: 'right' });

    // Notizen section at the bottom (only if there are notes)
    //if (werkstattNotiz && werkstattNotiz.trim() !== '') {
      const notizenY = pricingY + 30; // Position below pricing
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Notizen:', leftX, notizenY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
      
      // Draw a text input field border
      doc.setDrawColor(100);
      doc.setLineWidth(0.2);
      doc.rect(leftX, notizenY + 5, rightXstop-leftX, 20); // Smaller rectangle for notes
      
      // Add the actual note text
      doc.text(werkstattNotiz, leftX+5, notizenY+10);
    //}

    doc.save('reparaturauftrag.pdf');
  };
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------- Ende PDF-export ------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------------------------------------




  // UI
  const boxStyle = {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '1.2rem 1.5rem',
    marginBottom: 20,
    boxShadow: '0 1px 4px #0001',
  };

  return (
    <div
      className="App"
      style={{ fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: '100vh' }}
    >
      <Routes>
        <Route path="/" element={<Dashboard setIsLoggedIn={setIsLoggedIn} navigate={navigate} />} />
        <Route path="/akustiker" element={<AkustikerPage customers={customers} setShowAddAkustikerModal={setShowAddAkustikerModal} showAddAkustikerModal={showAddAkustikerModal} newAkustiker={newAkustiker} setNewAkustiker={setNewAkustiker} handleAddAkustiker={handleAddAkustiker} navigate={navigate} loadCustomers={loadCustomers} />} />
        <Route path="/erstellte-reperaturauftrage" element={<ErstellteReperaturauftragePage />} />
        <Route path="/reperaturauftrag" element={
            <>
      <header style={{ display: 'flex', alignItems: 'center', padding: '2rem 1rem 1rem 1rem', borderBottom: '1px solid #eee' }}>
        <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 80, marginRight: 24 }} />
        <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '2rem', margin: 0 }}>Reparaturauftrag</h1>
      </header>
              
              {/* Breadcrumbs */}
              <div style={{ padding: '1rem 1rem 0.5rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
                <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: '#666' }}>
                  <button 
                    onClick={() => navigate('/')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#1d426a', 
                      cursor: 'pointer', 
                      textDecoration: 'underline',
                      fontSize: '14px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Startseite
                  </button>
                  <span style={{ color: '#999' }}>/</span>
                  <span style={{ color: '#333', fontWeight: '500' }}>
                    {isEditing ? 'Reperaturauftrag bearbeiten' : 'Reperaturauftrag erstellen'}
                  </span>
                  {isEditing && (
                    <>
                      <span style={{ color: '#999' }}>/</span>
                      <button 
                        onClick={() => navigate('/erstellte-reperaturauftrage')}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#1d426a', 
                          cursor: 'pointer', 
                          textDecoration: 'underline',
                          fontSize: '14px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        Zurück zur Übersicht
                      </button>
                    </>
                  )}
                </nav>
              </div>
      
      {/* Customer Selection Section */}
      <div style={{
        maxWidth: 950,
        margin: '0 auto',
        padding: '0 2rem',
        marginTop: '2rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: '1.5rem',
          boxShadow: '0 1px 4px #0001'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#1d426a' }}>
              Kunde auswählen:
            </div>
            <button
              onClick={() => setShowAddAkustikerModal(true)}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span> Neuen Akustiker anlegen
            </button>
          </div>
          
          {/* Company Selection */}
          <div style={{ marginBottom: '1rem', maxWidth: 'Auto' }} className="customer-dropdown">
            <label style={{ position: 'relative', display: 'flex', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
              Firma auswählen:
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <div
                style={{
                  width: 'auto',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              >
                <span style={{ color: selectedCompany ? '#333' : '#999' }}>
                  {selectedCompany || 'Firma auswählen...'}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
              </div>
              
              {/* Company Dropdown */}
              {showCompanyDropdown && (
                <div style={{
                  position: 'relative',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #e1e5e9',
                  borderRadius: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1500,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Search Input */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1e5e9' }}>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Firma suchen..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e1e5e9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  {/* Company List */}
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company, index) => (
                        <div
                          key={index}
                          onClick={() => handleCompanySelect(company.name)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          <div style={{ fontWeight: '600', color: '#1d426a' }}>
                            {company.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                            {company.branchCount} Filiale{company.branchCount !== 1 ? 'n' : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                        Keine Firmen gefunden
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Branch Selection (if company selected) */}
          {selectedCompany && (
            <div style={{ marginBottom: '1rem', maxWidth: '100%' }} className="customer-dropdown">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                Filiale auswählen:
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <div
                  style={{
                    width: 'auto',
                    padding: '12px 16px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                >
                  <span style={{ color: selectedCustomer ? '#333' : '#999' }}>
                    {selectedCustomer ? (selectedCustomer.branch !== selectedCustomer.company ? selectedCustomer.branch : selectedCustomer.company) : 'Filiale auswählen...'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
                </div>
                
                {/* Branch Dropdown */}
                {showBranchDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {selectedCompanyBranches.map((branch, index) => (
                      <div
                        key={branch.id || index}
                        onClick={() => handleCustomerSelect(branch)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#1d426a', marginBottom: '4px' }}>
                          {branch.branch !== branch.company ? branch.branch : branch.company}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {branch.street}, {branch.location}, {branch.country}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Selected Customer Display */}
          {/* Workshop Date Field */}
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontWeight: '600', color: '#1d426a', fontSize: '14px', minWidth: '200px' }}>
                gesendet an die Werkstatt:
              </label>
              <input
                type="date"
                value={werkstattDate}
                onChange={handleWerkstattDate}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '150px'
                }}
              />
            </div>
          </div>
          
          {selectedCustomer && (
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: '600', color: '#1d426a' }}>
                  Ausgewählter Kunde:
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedCompany(null);
                    setCustomerSearch('');
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Zurücksetzen
                </button>
              </div>
              <div style={{ fontSize: '16px', marginBottom: '0.25rem' }}>
                {selectedCustomer.branch !== selectedCustomer.company ? `${selectedCustomer.company} - ${selectedCustomer.branch}` : selectedCustomer.company}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {selectedCustomer.street}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {selectedCustomer.location}, {selectedCustomer.country}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Repair Order Details Table */}
      {selectedCustomer && (
        <div style={{
          maxWidth: 950,
          margin: '0 auto',
          padding: '0 2rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: '1.5rem',
            boxShadow: '0 1px 4px #0001'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#1d426a' }}>
              Reparaturauftrag Details:
            </div>
            
            {/* 6-Column Table */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {/* Kommission */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Kommission ({kommission?.length || 0}/15):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={kommission}
                    onChange={(e) => setKommission(e.target.value)}
                    placeholder="z.B. 020-5031"
                    maxLength={15}
                    style={getInputStyleWithValidation(kommission, 15, {
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    })}
                  />
                  <WarningTriangle 
                    show={kommission && kommission.length >= 15} 
                    message="Maximale Zeicheneingabe erreicht" 
                  />
                </div>
              </div>
              
              {/* Hersteller */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Hersteller ({hersteller?.length || 0}/12):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={hersteller}
                    onChange={(e) => setHersteller(e.target.value)}
                    placeholder="z.B. HHM"
                    maxLength={12}
                    style={getInputStyleWithValidation(hersteller, 12, {
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    })}
                  />
                  <WarningTriangle 
                    show={hersteller && hersteller.length >= 12} 
                    message="Maximale Zeicheneingabe erreicht" 
                  />
                </div>
              </div>
              
              {/* Gerätetyp */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Gerätetyp ({geraetetyp?.length || 0}/23):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={geraetetyp}
                    onChange={(e) => setGeraetetyp(e.target.value)}
                    placeholder="z.B. G400 Mini"
                    maxLength={23}
                    style={getInputStyleWithValidation(geraetetyp, 23, {
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    })}
                  />
                  <WarningTriangle 
                    show={geraetetyp && geraetetyp.length >= 23} 
                    message="Maximale Zeicheneingabe erreicht" 
                  />
                </div>
              </div>
              
              {/* Seriennummer */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Serien Nr. ({seriennummer?.length || 0}/13):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={seriennummer}
                    onChange={(e) => setSeriennummer(e.target.value)}
                    placeholder="z.B. 53742513"
                    maxLength={13}
                    style={getInputStyleWithValidation(seriennummer, 13, {
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    })}
                  />
                  <WarningTriangle 
                    show={seriennummer && seriennummer.length >= 13} 
                    message="Maximale Zeicheneingabe erreicht" 
                  />
                </div>
              </div>
              
              {/* Werkstatteingang */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Werkstatteingang:
                </label>
                <input
                  type="date"
                  value={werkstatteingang}
                  onChange={(e) => setWerkstatteingang(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e1e5e9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              {/* Zubehör */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                  Zubehör ({zubehoer?.length || 0}/10):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={zubehoer}
                    onChange={(e) => setZubehoer(e.target.value)}
                    placeholder="z.B. ex Hörer"
                    maxLength={10}
                    style={getInputStyleWithValidation(zubehoer, 10, {
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    })}
                  />
                  <WarningTriangle 
                    show={zubehoer && zubehoer.length >= 10} 
                    message="Maximale Zeicheneingabe erreicht" 
                  />
                </div>
              </div>
            </div>
            
            {/* Workshop Notes Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto 1fr 1fr',
              gap: '1rem',
              alignItems: 'end'
            }}>
              <div style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
                Rep. werkstatt Notiz: KV am:
              </div>
              <div>
                <input
                  type="date"
                  value={kvDate}
                  onChange={(e) => setKvDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e1e5e9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>
                per:
              </div>
              <div>
                <select
                  value={perMethod}
                  onChange={(e) => setPerMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e1e5e9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Fax">Fax</option>
                  <option value="Mail">Mail</option>
                </select>
              </div>

            </div>
          </div>
        </div>
      )}
      
      <div style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: '1.5rem',
        maxWidth: 950,
        margin: '2rem auto',
        padding: '2rem',
        background: '#fafbfc',
        borderRadius: 8,
        boxShadow: '0 2px 8px #0001'
      }}>
        {/* Top row: Zurücksetzen button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={isDisabled}
            style={{
              padding: '6px 18px',
              fontSize: 15,
              background: isDisabled ? '#eee' : '#f5f5f5',
              color: isDisabled ? '#aaa' : '#1d426a',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              alignSelf: 'center',
            }}
          >
            Zurücksetzen
          </button>
        </div>
        {/* Middle row: Main form content */}
        <form style={{ display: 'flex', flexDirection: 'row', gap: '2rem' }}>
          {/* Left column */}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* Kostenvoranschlag Section - Moved above Freigabe */}
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Kostenvoranschlag:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  checked={kostenvoranschlagChecked} 
                  onChange={(e) => setKostenvoranschlagChecked(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <span>ab</span>
                <input 
                  type="text" 
                  value={kostenvoranschlagAmount} 
                  onChange={(e) => setKostenvoranschlagAmount(e.target.value)}
                  placeholder="0,00"
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    border: '1px solid #e1e5e9',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center'
                  }}
                />
                <span>€ - netto</span>
              </div>
            </div>
            
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Bei Freigabe bitte ankreuzen:</div>
              {FREIGABE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: 'block', marginBottom: 4, textAlign: 'left' }}>
                  <input type="radio" name="freigabe" checked={freigabe === opt} onChange={() => handleFreigabe(opt)} /> {opt}
                </label>
              ))}
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Fehlerangaben:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {FEHLERANGABEN.map((f) => (
                  <label key={f} style={{ fontSize: 15, textAlign: 'left' }}>
                    <input type="checkbox" checked={!!fehler[f]} onChange={() => handleFehler(f)} disabled={isDisabled} /> {f}
                  </label>
                ))}
                
                {/* Manual Fehlerangaben Entries */}
                <div style={{ marginTop: '8px', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input 
                      type="checkbox" 
                      checked={manualFehlerChecked1} 
                      onChange={(e) => handleManualFehler1(e.target.checked)} 
                      disabled={isDisabled}
                      style={{ alignSelf: 'center' }}
                    />
                    <input
                      type="text"
                      value={manualFehler1}
                      onChange={(e) => setManualFehler1(e.target.value)}
                      placeholder="Manuelle Fehlerangabe 1"
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #e1e5e9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input 
                      type="checkbox" 
                      checked={manualFehlerChecked2} 
                      onChange={(e) => handleManualFehler2(e.target.checked)} 
                      disabled={isDisabled}
                      style={{ alignSelf: 'center' }}
                    />
                    <input
                      type="text"
                      value={manualFehler2}
                      onChange={(e) => setManualFehler2(e.target.value)}
                      placeholder="Manuelle Fehlerangabe 2"
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #e1e5e9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={manualFehlerChecked3} 
                      onChange={(e) => handleManualFehler3(e.target.checked)} 
                      disabled={isDisabled}
                      style={{ alignSelf: 'center' }}
                    />
                    <input
                      type="text"
                      value={manualFehler3}
                      onChange={(e) => setManualFehler3(e.target.value)}
                      placeholder="Manuelle Fehlerangabe 3"
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #e1e5e9',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Verfahren:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', alignItems: 'flex-start' }}>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kostenpflichtig'} onChange={() => handleBottom('kostenpflichtig')} /> Kostenpflichtige Reparatur
                </label>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'garantie'} onChange={() => handleBottom('garantie')} disabled={freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen'} /> Garantie
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="radio" name="bottom" checked={bottom === 'reklamation'} onChange={() => handleBottom('reklamation')} disabled={freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen'} style={{ marginTop: 2 }} />
                    <span>Reklamation auf Reparatur von</span>
                  </label>
                  {bottom === 'reklamation' && (
                    <input type="date" value={reklamationDate} onChange={handleReklamationDate} style={{ fontSize: 15, marginLeft: 28, marginTop: 2 }} disabled={freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen'} />
                  )}
                </div>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kulanz'} onChange={() => handleBottom('kulanz')} disabled={freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen'} /> Kulanz
                </label>
                <div style={{ marginLeft: 24, marginTop: 4, opacity: bottom === 'kulanz' && (freigabe === 'Keine angabe' || freigabe === 'Reparatur laut KV durchführen') ? 1 : 0.5, pointerEvents: bottom === 'kulanz' && (freigabe === 'Keine angabe' || freigabe === 'Reparatur laut KV durchführen') ? 'auto' : 'none' }}>
                  <label style={{ marginRight: 16 }}>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'ja'} disabled={bottom !== 'kulanz' || (freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen')} onChange={() => handleKulanzPorto('ja')} /> Porto ja
                  </label>
                  <label>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'nein'} disabled={bottom !== 'kulanz' || (freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen')} onChange={() => handleKulanzPorto('nein')} /> Porto nein
                  </label>
                </div>
              </div>
            </div>
            
            {/* Werkstattausgang Section - Above Notizen */}
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Werkstattausgang:</div>
              <input
                type="date"
                value={werkstattausgang}
                onChange={(e) => setWerkstattausgang(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  boxSizing: 'border-box'  // This fixes the overflow issue
                }}
              />
            </div>
            
            {/* Notizen Section - Moved below Verfahren */}
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Notizen:</div>
              <textarea
                value={werkstattNotiz}
                onChange={(e) => setWerkstattNotiz(e.target.value)}
                placeholder="Weitere Notizen..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: '1.4'
                }}
              />
            </div>
          </div>
          {/* Right column */}
          <div style={{ flex: 2, minWidth: 340 }}>
            <div style={boxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontWeight: 600, minWidth: 180, textAlign: 'left' }}>Land:</label>
                <select value={country} onChange={handleCountry} style={{ fontSize: 16, padding: 4 }}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* IDO/HDO Selection - Only for Germany */}
            {country === 'DE' && (
              <div style={boxStyle}>
                <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Arbeitszeit Typ:</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="idoHdo" 
                      checked={idoHdo === 'IDO'} 
                      onChange={() => handleIdoHdo('IDO')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}>HDO (22,00 €)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="idoHdo" 
                      checked={idoHdo === 'HDO'} 
                      onChange={() => handleIdoHdo('HDO')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}>IDO (26,00 €)</span>
                  </label>
                </div>
              </div>
            )}
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Ausgeführte Arbeiten:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {ARBEITEN.map((a) => {
                  const checked = !!arbeiten[a.key];
                  // Determine if this row needs a price or input field
                  const showPrice = !hideFields && a.price && a.price !== 'country';
                  const showCountryPrice = !hideFields && a.price === 'country';
                  const showInput = !hideFields && !a.price;
                  return (
                    <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, textAlign: 'left', minHeight: 36 }}>
                      <input type="checkbox" checked={checked} onChange={() => handleArbeiten(a.key)} disabled={isDisabled} style={{ alignSelf: 'center' }} />
                      <span style={{ flex: 1, paddingRight: 10, alignSelf: 'center', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                      {(showPrice || showCountryPrice) && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: 15, color: checked ? '#222' : '#888' }}>
                          <span>{showPrice ? a.price.toFixed(2).replace('.', ',') : arbeitszeit.toFixed(2).replace('.', ',')}</span>
                          <span style={{ marginLeft: 4 }}>€</span>
                        </div>
                      )}
                      {showInput && (
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: 15 }}>
                          <input
                            type="text"
                            value={arbeitenManual[a.key] || ''}
                            onChange={e => handleArbeitenManual(a.key, e.target.value)}
                            style={{ fontSize: 15, width: 70, color: checked ? '#222' : '#888', background: checked ? '#fff' : '#f5f5f5', borderColor: checked ? '#ccc' : '#eee', textAlign: 'center' }}
                            inputMode="decimal"
                            pattern="[0-9,]*"
                            disabled={!checked || isDisabled || bottom !== 'kostenpflichtig'}
                          />
                          <span style={{ marginLeft: 4, color: checked ? '#222' : '#888' }}>€</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 20 }}>
              {/* Porto Toggle Section */}
              <div style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>Porto & Verpackung:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input 
                    type="radio" 
                    name="portoToggle" 
                    checked={kulanzPorto === 'ja'} 
                    onChange={() => handleKulanzPorto('ja')}
                    style={{ margin: 0 }}
                  /> 
                  <span style={{ fontSize: 14 }}>Porto ja</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input 
                    type="radio" 
                    name="portoToggle" 
                    checked={kulanzPorto === 'nein'} 
                    onChange={() => handleKulanzPorto('nein')}
                    style={{ margin: 0 }}
                  /> 
                  <span style={{ fontSize: 14 }}>Porto nein</span>
                </label>
                </div>
              
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'max-content max-content', gridTemplateRows: 'max-content max-content', justifyContent: 'end', alignItems: 'center', gap: '0 32px' }}>
                
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 1, gridRow: 1 }}>
                  Nettopreis:
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 2, gridRow: 1 }}>
                  {net.toFixed(2).replace('.', ',')} €
                </div>

                <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 1, gridRow: 2 }}>
                  + Porto & Verpackung:
              </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 2, gridRow: 2 }}>
                  {porto.toFixed(2).replace('.', ',')} €
                </div>

              </div>
            </div>
          </div>
        </form>
        
        {/* Add New Akustiker Modal */}
        <AddAkustikerModal
          isOpen={showAddAkustikerModal}
          onClose={() => setShowAddAkustikerModal(false)}
          onSubmit={handleAddAkustiker}
          newAkustiker={newAkustiker}
          setNewAkustiker={setNewAkustiker}
        />
        
        {/* Bottom row: Save and PDF Export buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{ padding: '8px 18px', fontSize: 15, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Abmelden
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleSaveRepairOrder}
              disabled={!selectedCustomer}
              style={{ 
                padding: '8px 18px', 
                fontSize: 15, 
                background: selectedCustomer ? '#28a745' : '#6c757d', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                cursor: selectedCustomer ? 'pointer' : 'not-allowed',
                opacity: selectedCustomer ? 1 : 0.6
              }}
            >
              Speichern
            </button>
          <button
            type="button"
            onClick={handlePdfExport}
            style={{ padding: '8px 18px', fontSize: 15, background: '#1d426a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            PDF Export
          </button>
        </div>
      </div>
    </div>
            </>
          } />
                  </Routes>
                </div>

        // /* Success Message Modal */
        // {showSuccessModal && (
        //   <div style={{
        //     position: 'fixed',
        //     top: 0,
        //     left: 0,
        //     right: 0,
        //     bottom: 0,
        //     background: 'rgba(0, 0, 0, 0.5)',
        //     display: 'flex',
        //     justifyContent: 'center',
        //     alignItems: 'center',
        //     zIndex: 1000
        //   }}>
        //     <div style={{
        //       background: 'white',
        //       borderRadius: '8px',
        //       padding: '2rem',
        //       maxWidth: '400px',
        //       width: '90%',
        //       textAlign: 'center',
        //       boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        //     }}>
        //       <div style={{
        //         width: '60px',
        //         height: '60px',
        //         background: '#28a745',
        //         borderRadius: '50%',
        //         margin: '0 auto 1rem auto',
        //         display: 'flex',
        //         alignItems: 'center',
        //         justifyContent: 'center'
        //       }}>
        //         <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
        //           <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
        //         </svg>
        //       </div>
        //       <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '18px' }}>
        //         Erfolgreich!
        //       </h3>
        //       <p style={{ margin: '0 0 2rem 0', fontSize: '16px', color: '#666', lineHeight: '1.5' }}>
        //         {successMessage}
        //       </p>
        //       <button
        //         onClick={() => setShowSuccessModal(false)}
        //         style={{
        //           padding: '12px 24px',
        //           background: '#1d426a',
        //           color: 'white',
        //           border: 'none',
        //           borderRadius: '6px',
        //           cursor: 'pointer',
        //           fontSize: '14px',
        //           fontWeight: '500',
        //           transition: 'all 0.2s ease'
        //         }}
        //         onMouseEnter={(e) => {
        //           e.target.style.transform = 'scale(1.05)';
        //         }}
        //         onMouseLeave={(e) => {
        //           e.target.style.transform = 'scale(1)';
        //         }}
        //       >
        //         Verstanden
        //       </button>
        //     </div>
        //   </div>
        // )}

        )}






// Main App component that wraps AppContent with Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
