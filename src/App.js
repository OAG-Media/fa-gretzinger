import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
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
  'Kostenpflichtige Reparatur',
  'Unrepariert zurückschicken',
  'Verschrotten',
  'Garantie',
  'Reklamation',
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
  { key: 'schale_repariert', label: 'Schale repariert' },
  { key: 'gehaeuseteil', label: 'Gehäuseteil / Faceplate' },
  { key: 'winkel', label: 'Winkel' },
  { key: 'zugfaden', label: 'Zugfaden' },
  { key: 'batteriekontakte', label: 'Batteriekontakte' },
  { key: 'bluetooth', label: 'Bluetooth-Board' },
  { key: 'cerumenschutz', label: 'Cerumenschutz' },
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
  const [hoveredButton, setHoveredButton] = useState(null);
  
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
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('akustiker');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{ 
              padding: '10px 20px', 
              background: hoveredButton === 'akustiker' ? '#2a5a8a' : '#1d426a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Akustiker öffnen
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Reparaturauftrag erstellen</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Neuen Reparaturauftrag anlegen</p>
          <button 
            onClick={() => navigate('/reperaturauftrag')}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('erstellen');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{ 
              padding: '10px 20px', 
              background: hoveredButton === 'erstellen' ? '#2a5a8a' : '#1d426a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Reparaturauftrag erstellen
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Erstellte Reparaturaufträge</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Alle Reparaturaufträge anzeigen</p>
          <button 
            onClick={() => navigate('/erstellte-reperaturauftrage')}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('anzeigen');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{ 
              padding: '10px 20px', 
              background: hoveredButton === 'anzeigen' ? '#2a5a8a' : '#1d426a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Reparaturaufträge anzeigen
          </button>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1.2rem 1.5rem', boxShadow: '0 1px 4px #0001' }}>
          <h3 style={{ color: '#1d426a', marginBottom: '1rem' }}>Erstellte Rechnungen</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Alle Rechnungen verwalten und einsehen</p>
          <button 
            onClick={() => navigate('/erstellte-rechnungen')}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('rechnungen');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{ 
              padding: '10px 20px', 
              background: hoveredButton === 'rechnungen' ? '#2a5a8a' : '#1d426a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Rechnungen anzeigen
          </button>
        </div>
      </div>
      <button 
        onClick={() => setIsLoggedIn(false)} 
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          setHoveredButton('abmelden');
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          setHoveredButton(null);
        }}
        style={{ 
          marginTop: '2rem', 
          padding: '8px 18px', 
          background: hoveredButton === 'abmelden' ? '#c82333' : '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: '6px', 
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
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
    contact_person: '',
    billing_street: '',
    billing_location: '',
    billing_country: 'DE'
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
      contact_person: customer.contact_person || '',
      billing_street: customer.billing_street || '',
      billing_location: customer.billing_location || '',
      billing_country: customer.billing_country === 'Österreich' ? 'AT' : 'DE'
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async () => {
    try {
      // Check if billing address is being updated and if there are other acousticians from the same company
      const hasBillingAddress = editForm.billing_street || editForm.billing_location || editForm.billing_country;
      const otherAcousticians = customers.filter(customer => 
        customer.company === editForm.company && 
        customer.id !== editingCustomer.id &&
        (!customer.billing_street && !customer.billing_location && !customer.billing_country)
      );

      let shouldUpdateAll = false;
      
      if (hasBillingAddress && otherAcousticians.length > 0) {
        const confirmMessage = `${otherAcousticians.length} weitere Akustiker für ${editForm.company} entdeckt, möchten Sie diese Rechnungsadresse für alle weiteren ${otherAcousticians.length} Akustiker übernehmen?`;
        shouldUpdateAll = window.confirm(confirmMessage);
      }

      // Update current customer
      const { data, error } = await supabase
        .from('customers')
        .update({
          branch: editForm.branch,
          company: editForm.company,
          street: editForm.street,
          location: editForm.location,
          country: editForm.country === 'DE' ? 'Deutschland' : 'Österreich',
          contact_person: editForm.contact_person,
          billing_street: editForm.billing_street,
          billing_location: editForm.billing_location,
          billing_country: editForm.billing_country === 'DE' ? 'Deutschland' : 'Österreich'
        })
        .eq('id', editingCustomer.id);
      
      if (error) throw error;

      // Update other acousticians from the same company if requested
      if (shouldUpdateAll && otherAcousticians.length > 0) {
        const { error: bulkError } = await supabase
          .from('customers')
          .update({
            billing_street: editForm.billing_street,
            billing_location: editForm.billing_location,
            billing_country: editForm.billing_country === 'DE' ? 'Deutschland' : 'Österreich'
          })
          .in('id', otherAcousticians.map(customer => customer.id));
        
        if (bulkError) throw bulkError;
      }
      
      // Refresh customers list
      await loadCustomers();
      
      // Close modal
      setShowEditModal(false);
      setEditingCustomer(null);
      
      const successMessage = shouldUpdateAll 
        ? `Akustiker erfolgreich aktualisiert! Rechnungsadresse wurde auch für ${otherAcousticians.length} weitere Akustiker übernommen.`
        : 'Akustiker erfolgreich aktualisiert!';
      
      alert(successMessage);
      
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
              
              {/* Billing Address Section */}
              <div style={{ 
                margin: '2rem 0 1.5rem 0',
                borderTop: '1px solid #e9ecef',
                paddingTop: '1.5rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem' 
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    color: '#666', 
                    fontWeight: '500' 
                  }}>
                    Rechnungsadresse
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm(prev => ({
                        ...prev,
                        billing_street: prev.street,
                        billing_location: prev.location,
                        billing_country: prev.country
                      }));
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#f8f9fa',
                      color: '#495057',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e9ecef';
                      e.target.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    📋 Hauptadresse kopieren
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                    Straße
                  </label>
                  <input
                    type="text"
                    value={editForm.billing_street}
                    onChange={(e) => setEditForm(prev => ({ ...prev, billing_street: e.target.value }))}
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
                    Ort
                  </label>
                  <input
                    type="text"
                    value={editForm.billing_location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, billing_location: e.target.value }))}
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
                    Land
                  </label>
                  <select
                    value={editForm.billing_country}
                    onChange={(e) => setEditForm(prev => ({ ...prev, billing_country: e.target.value }))}
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
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
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
              Ansprechpartner
            </label>
            <input
              type="text"
              value={newAkustiker.contact_person}
              onChange={(e) => setNewAkustiker(prev => ({ ...prev, contact_person: e.target.value }))}
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
          
          {/* Billing Address Section */}
          <div style={{ 
            margin: '2rem 0 1.5rem 0',
            borderTop: '1px solid #e9ecef',
            paddingTop: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                color: '#666', 
                fontWeight: '500' 
              }}>
                Rechnungsadresse
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNewAkustiker(prev => ({
                    ...prev,
                    billing_street: prev.street,
                    billing_location: prev.location,
                    billing_country: prev.country
                  }));
                }}
                style={{
                  padding: '6px 12px',
                  background: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e9ecef';
                  e.target.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                📋 Hauptadresse kopieren
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', textAlign: 'left' }}>
                Straße
              </label>
              <input
                type="text"
                value={newAkustiker.billing_street}
                onChange={(e) => setNewAkustiker(prev => ({ ...prev, billing_street: e.target.value }))}
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
                Ort
              </label>
              <input
                type="text"
                value={newAkustiker.billing_location}
                onChange={(e) => setNewAkustiker(prev => ({ ...prev, billing_location: e.target.value }))}
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
                Land
              </label>
              <select
                value={newAkustiker.billing_country}
                onChange={(e) => setNewAkustiker(prev => ({ ...prev, billing_country: e.target.value }))}
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
  const [sortBy, setSortBy] = useState('werkstattausgang');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewingOrder, setViewingOrder] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Hover State
  const [hoveredButton, setHoveredButton] = useState(null);
  
  // Date Filtering State
  const [dateFilterField, setDateFilterField] = useState('werkstattausgang'); // werkstattausgang, werkstatteingang, gesendet_an_werkstatt
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Company Filtering State
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  
  // Invoice Status Filtering State
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);
  
  // Selection State
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

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
          ),
          invoice_items!repair_order_id (
            invoice:invoices (
              invoice_number
            )
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

  // Reset pagination when search term, date filters, company filter, or invoice status filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, dateFilterField, selectedCompany, showOnlyUnused]);
  

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

  // Helper function for date filtering - must be defined before filtering logic
  const getDateFieldValue = (order, field) => {
    switch (field) {
      case 'werkstattausgang':
        return order.werkstattausgang;
      case 'werkstatteingang':
        return order.werkstatteingang;
      case 'gesendet_an_werkstatt':
        return order.gesendet_an_werkstatt;
      default:
        return order.werkstattausgang;
    }
  };

  // Filter and sort repair orders
  const filteredAndSortedOrders = repairOrders
    .filter(order => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        order.kommission?.toLowerCase().includes(searchLower) ||
        order.hersteller?.toLowerCase().includes(searchLower) ||
        order.geraetetyp?.toLowerCase().includes(searchLower) ||
        order.seriennummer?.toLowerCase().includes(searchLower) ||
        order.customers?.company?.toLowerCase().includes(searchLower) ||
        order.customers?.branch?.toLowerCase().includes(searchLower)
      );

      // Date filter
      const orderDate = getDateFieldValue(order, dateFilterField);
      const matchesDateFilter = (!dateFrom && !dateTo) || (
        orderDate && 
        (!dateFrom || orderDate >= dateFrom) &&
        (!dateTo || orderDate <= dateTo)
      );

      // Company filter
      const matchesCompanyFilter = !selectedCompany || 
        order.customers?.company === selectedCompany;

      // Invoice status filter (show only unused)
      const matchesInvoiceStatusFilter = !showOnlyUnused || !order.invoice_status;

      // Werkstattausgang filter - exclude orders without Werkstattausgang when any filter is active
      const hasActiveFilters = searchTerm || dateFrom || dateTo || selectedCompany || showOnlyUnused;
      const hasWerkstattausgang = order.werkstattausgang && order.werkstattausgang.trim() !== '';
      const matchesWerkstattausgangFilter = !hasActiveFilters || hasWerkstattausgang;

      return matchesSearch && matchesDateFilter && matchesCompanyFilter && matchesInvoiceStatusFilter && matchesWerkstattausgangFilter;
    })
    .sort((a, b) => {
      let aValue, bValue;

      // Handle nested customer fields
      if (sortBy === 'customers.company') {
        aValue = a.customers?.company;
        bValue = b.customers?.company;
      } else if (sortBy === 'customers.branch') {
        aValue = a.customers?.branch;
        bValue = b.customers?.branch;
      } else {
        aValue = a[sortBy];
        bValue = b[sortBy];
      }

      // Handle date fields
      if (sortBy === 'created_at' || sortBy === 'werkstattausgang' || sortBy === 'werkstatteingang') {
        // Handle null/empty values for date fields
        if (!aValue && !bValue) return 0;
        if (!aValue) return sortOrder === 'asc' ? 1 : -1; // null values go to end when asc, start when desc
        if (!bValue) return sortOrder === 'asc' ? -1 : 1;
        
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle null/empty values for text fields
      if (!aValue && !bValue) return 0;
      if (!aValue) return sortOrder === 'asc' ? 1 : -1;
      if (!bValue) return sortOrder === 'asc' ? -1 : 1;

      // Convert to lowercase for text comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  
  // Selection handlers (defined after filteredAndSortedOrders)
  const handleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
    
    // Update selectAll state based on current selection
    const totalOrders = filteredAndSortedOrders.length;
    setSelectAll(newSelected.size === totalOrders && totalOrders > 0);
  };
  
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedOrders(new Set());
      setSelectAll(false);
    } else {
      // Select all filtered orders (not just current page)
      const allOrderIds = new Set(filteredAndSortedOrders.map(order => order.id));
      setSelectedOrders(allOrderIds);
      setSelectAll(true);
    }
  };
  
  // Pagination calculations
  const totalItems = filteredAndSortedOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredRepairOrders = filteredAndSortedOrders.slice(startIndex, endIndex);
  
  // Update selection when filters change - keep only valid selections
  useEffect(() => {
    const validOrderIds = new Set(filteredAndSortedOrders.map(order => order.id));
    const validSelections = new Set([...selectedOrders].filter(id => validOrderIds.has(id)));
    
    if (validSelections.size !== selectedOrders.size) {
      setSelectedOrders(validSelections);
      // Update selectAll state
      const totalOrders = filteredAndSortedOrders.length;
      setSelectAll(validSelections.size === totalOrders && totalOrders > 0);
    }
  }, [filteredAndSortedOrders, selectedOrders]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Smart pagination logic with ellipsis
  const getPaginationItems = () => {
    const items = [];
    
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first page
      items.push(1);
      
      if (currentPage > 3) {
        items.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          items.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        items.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        items.push(totalPages);
      }
    }
    
    return items;
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

  // Date filtering helper functions
  const handleMonthSelection = (year, month) => {
    // First day of the selected month (month-1 because JS months are 0-indexed)
    const startOfMonth = new Date(year, month - 1, 1);
    
    // Last day of the selected month: go to NEXT month, then day 0 = last day of current month
    const endOfMonth = new Date(year, month, 0);
    
    // Convert to YYYY-MM-DD format using local date methods to avoid timezone issues
    const startDateString = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateString = `${year}-${String(month).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
    
    // Debug logging to see what dates we're setting
    console.log(`Month selection: ${month}/${year}`);
    console.log('Start date:', startDateString, '(should be first day of month)');
    console.log('End date:', endDateString, '(should be last day of month)');
    console.log('End of month calculation:', endOfMonth.getDate(), 'days in month');
    
    setDateFrom(startDateString);
    setDateTo(endDateString);
    setShowMonthPicker(false);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Get unique companies from repair orders for filter dropdown
  const getUniqueCompanies = (searchFilter = '') => {
    const companies = repairOrders
      .map(order => order.customers?.company)
      .filter(company => company && company.trim() !== '') // Remove empty/null companies
      .filter(company => 
        searchFilter === '' || 
        company.toLowerCase().includes(searchFilter.toLowerCase())
      ) // Filter by search term
      .sort(); // Sort alphabetically
    
    return [...new Set(companies)]; // Remove duplicates
  };

  // Handle company selection from dropdown
  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setCompanySearchTerm(company);
    setShowCompanyDropdown(false);
  };

  // Handle company search input
  const handleCompanySearchChange = (value) => {
    setCompanySearchTerm(value);
    if (value === '') {
      setSelectedCompany('');
    }
  };

  // Clear company filter
  const clearCompanyFilter = () => {
    setSelectedCompany('');
    setCompanySearchTerm('');
    setShowCompanyDropdown(false);
  };

  if (loading) {
    return (
      <div style={{ 
        height: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '20px' 
      }}>
        {/* Animated Loading Spinner */}
        <div 
          className="loading-spinner"
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1d426a',
            borderRadius: '50%'
          }}
        ></div>
        <div style={{ fontSize: '18px', color: '#666', fontWeight: '500' }}>
          Lade Reparaturaufträge...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1600, margin: '0 auto' }}>

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
            <span style={{ marginLeft: '0.25rem', fontWeight: '500', color: '#1d426a' }}>
              ({repairOrders.length} {showArchived ? 'archiviert' : 'aktiv'}).
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={toggleArchived}
            style={{
              padding: '8px 16px',
              height: '40px',
              background: hoveredButton === 'archiv' 
                ? (showArchived ? '#2a5a8a' : '#5a6268')
                : (showArchived ? '#1d426a' : '#6c757d'),
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
              setHoveredButton('archiv');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,21H4V10H6V19H18V10H20V21M20,3H4V8H20V3M6,5V6H18V5H6Z"/>
            </svg>
            {showArchived ? 'Aktive Reparaturaufträge anzeigen' : 'Archiv anzeigen'}
          </button>
          <button
            onClick={() => window.location.href = '/erstellte-reperaturauftrage'}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('reparaturauftrage');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{
              padding: '10px 20px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: hoveredButton === 'reparaturauftrage' ? '#5a6268' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              marginRight: '10px'
            }}
          >
            Zurück zu den Reparaturaufträgen
          </button>
          <button
            onClick={() => window.location.href = '/'}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              setHoveredButton('hauptmenu');
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              setHoveredButton(null);
            }}
            style={{
              padding: '10px 20px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: hoveredButton === 'hauptmenu' ? '#5a6268' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            Zurück zum Hauptmenü
          </button>
        </div>
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
        {/* First Row: Search */}
        <div style={{ marginBottom: '1rem' }}>
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
        </div>

        {/* Second Row: Date Filtering */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          marginBottom: '1rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          {/* Date Field Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '14px', color: '#666', minWidth: '80px' }}>Datum Filter:</span>
            <select
              value={dateFilterField}
              onChange={(e) => setDateFilterField(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              <option value="werkstattausgang">Werkstattausgang</option>
              <option value="werkstatteingang">Werkstatteingang</option>
              <option value="gesendet_an_werkstatt">Gesendet an Werkstatt</option>
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Von:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>Bis:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Month Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              style={{
                padding: '6px 12px',
                background: '#1d426a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Monat
            </button>
            
            {/* Month Picker Modal */}
            {showMonthPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1000,
                background: 'white',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                padding: '1rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '14px', color: '#666' }}>Jahr:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginTop: '4px'
                    }}
                  >
                    {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '14px', color: '#666' }}>Monat:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginTop: '4px'
                    }}
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2024, month - 1, 1).toLocaleDateString('de-DE', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleMonthSelection(selectedYear, selectedMonth)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#1d426a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Anwenden
                  </button>
                  <button
                    onClick={() => setShowMonthPicker(false)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Company Filter - Searchable */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <span style={{ fontSize: '14px', color: '#666', minWidth: '60px' }}>Firma:</span>
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Alle Firmen - tippen zum Suchen..."
                value={companySearchTerm}
                onChange={(e) => handleCompanySearchChange(e.target.value)}
                onFocus={() => setShowCompanyDropdown(true)}
                onBlur={() => {
                  // Delay hiding to allow clicks on dropdown items
                  setTimeout(() => setShowCompanyDropdown(false), 150);
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* Dropdown */}
              {showCompanyDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'white',
                  border: '1px solid #e1e5e9',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {/* "Alle Firmen" option */}
                  <div
                    onClick={() => {
                      setSelectedCompany('');
                      setCompanySearchTerm('');
                      setShowCompanyDropdown(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      backgroundColor: selectedCompany === '' ? '#f0f0f0' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = selectedCompany === '' ? '#f0f0f0' : 'transparent'}
                  >
                    Alle Firmen
                  </div>
                  
                  {/* Filtered companies */}
                  {getUniqueCompanies(companySearchTerm).map(company => (
                    <div
                      key={company}
                      onClick={() => handleCompanySelect(company)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        backgroundColor: selectedCompany === company ? '#f0f0f0' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = selectedCompany === company ? '#f0f0f0' : 'transparent'}
                    >
                      {company}
                    </div>
                  ))}
                  
                  {/* No results message */}
                  {getUniqueCompanies(companySearchTerm).length === 0 && companySearchTerm && (
                    <div style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: '#999',
                      fontStyle: 'italic'
                    }}>
                      Keine Firmen gefunden
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Clear All Filters Button */}
          <button
            onClick={() => {
              clearDateFilter();
              clearCompanyFilter();
              setShowOnlyUnused(false);
            }}
            style={{
              padding: '6px 12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Alle Filter löschen
          </button>
        </div>

        {/* Third Row: Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
          
          {/* Invoice Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', color: '#666', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showOnlyUnused}
                onChange={(e) => setShowOnlyUnused(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#1d426a'
                }}
              />
              Zeige nur ungenutzte Reparaturaufträge
            </label>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span 
                style={{ 
                  fontSize: '14px', 
                  color: '#666', 
                  cursor: 'help',
                  width: '16px',
                  height: '16px',
                  border: '1px solid #666',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
                title="Hiermit versteckst du Reparaturaufträge welche bereits in einer Rechnung eingepflegt worden sind"
              >
                ?
              </span>
            </div>
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
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '50px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#1d426a'
                  }}
                />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '30px', fontSize: '14px' }}></th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '80px', fontSize: '14px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('werkstattausgang')}>
                Wkst. Ausgang {sortBy === 'werkstattausgang' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('kommission')}>
                Kommission {sortBy === 'kommission' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('customers.company')}>
                Firma {sortBy === 'customers.company' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('customers.branch')}>
                Filiale {sortBy === 'customers.branch' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('nettopreis')}>
                Nettopreis {sortBy === 'nettopreis' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => handleSort('porto')}>
                Porto {sortBy === 'porto' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '120px', fontSize: '14px' }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepairOrders.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  {searchTerm ? 'Keine Reparaturaufträge gefunden.' : 'Noch keine Reparaturaufträge erstellt.'}
                </td>
              </tr>
            ) : (
              filteredRepairOrders.map((order) => (
                <React.Fragment key={order.id}>
                  {/* Main Row */}
                  <tr style={{ 
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: (order.invoice_status && order.invoice_items?.[0]?.invoice?.invoice_number) ? '#f0f8f0' : 'transparent',
                    opacity: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 0.6 : 1
                  }}>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        disabled={order.invoice_status && order.invoice_items?.[0]?.invoice?.invoice_number}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: (order.invoice_status && order.invoice_items?.[0]?.invoice?.invoice_number) ? 'not-allowed' : 'pointer',
                          accentColor: '#1d426a',
                          opacity: (order.invoice_status && order.invoice_items?.[0]?.invoice?.invoice_number) ? 0.5 : 1
                        }}
                      />
                    </td>
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleRow(order.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: '#666',
                          padding: '2px',
                          borderRadius: '2px',
                          transition: 'all 0.2s',
                          minWidth: '16px',
                          height: '16px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        {expandedRows.has(order.id) ? '▼' : '▶'}
                      </button>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {order.invoice_status && order.invoice_items?.[0]?.invoice?.invoice_number && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ 
                            color: order.invoice_status === 'invoiced' ? '#28a745' : '#ffc107'
                          }}>
                            {order.invoice_status === 'invoiced' ? (
                              <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                            ) : (
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            )}
                          </svg>
                          <div style={{ 
                            fontSize: '11px',
                            fontWeight: '500',
                            color: order.invoice_status === 'invoiced' ? '#28a745' : '#ffc107',
                            whiteSpace: 'nowrap'
                          }}>
                            Re: {order.invoice_items[0].invoice.invoice_number}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {order.werkstattausgang ? formatDate(order.werkstattausgang) : '-'}
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
                          onClick={() => !(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) && handleEditOrder(order.id)}
                          disabled={order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number}
                          style={{
                            background: 'none',
                            color: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? '#ccc' : '#1d426a',
                            border: `1px solid ${(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? '#ccc' : '#1d426a'}`,
                            borderRadius: '4px',
                            cursor: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 'not-allowed' : 'pointer',
                            padding: '6px 8px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            opacity: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number)) {
                              e.target.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number)) {
                              e.target.style.transform = 'scale(1)';
                            }
                          }}
                          title={(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 'Rechnung bereits erstellt - nicht bearbeitbar' : 'Bearbeiten'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                          </svg>
                        </button>
                        {/* Delete Button - Only show when not in archive view and not invoiced */}
                        {!showArchived && (
                          <button 
                            onClick={() => !(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) && handleDeleteOrder(order)} 
                            disabled={order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number}
                            title={(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 'Rechnung bereits erstellt - nicht löschbar' : 'Löschen'}
                            style={{
                              background: 'none',
                              color: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? '#ccc' : '#1d426a',
                              border: `1px solid ${(order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? '#ccc' : '#1d426a'}`,
                              borderRadius: '4px',
                              cursor: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 'not-allowed' : 'pointer',
                              padding: '6px 8px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease',
                              opacity: (order.invoice_status === 'invoiced' && order.invoice_items?.[0]?.invoice?.invoice_number) ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (order.invoice_status !== 'invoiced') {
                                e.target.style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (order.invoice_status !== 'invoiced') {
                                e.target.style.transform = 'scale(1)';
                              }
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
                                  <span style={{ fontWeight: '500', color: '#666' }}>Wkst. Eingang:</span>
                                  <span>{order.werkstatteingang ? formatDate(order.werkstatteingang) : '-'}</span>
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

      {/* Selection Counter & Invoice Button */}
      {selectedOrders.size > 0 && (
        <div style={{
          margin: '1rem 0 0.5rem 0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            background: '#e3f2fd',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#1976d2',
            fontWeight: '500',
            border: '1px solid #bbdefb'
          }}>
            {selectedOrders.size} ausgewählt
          </div>
          
          <button
            onClick={() => {
              // Navigate to invoice creation with selected orders
              const selectedOrderIds = Array.from(selectedOrders);
              window.location.href = `/rechnung-erstellen?orders=${selectedOrderIds.join(',')}`;
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#218838';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#28a745';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            Rechnung aus Auswahl erstellen
          </button>
        </div>
      )}

      {/* Results Info */}
      {totalItems > 0 && (
        <div style={{
          margin: '1rem 0 0.5rem 0',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center'
        }}>
          {totalItems} Reparaturaufträge gefunden
          {(searchTerm || selectedCompany || dateFrom || dateTo) && (
            <span>
              {' (gefiltert nach: '}
              {[
                searchTerm && `Suche: "${searchTerm}"`,
                selectedCompany && `Firma: "${selectedCompany}"`,
                (dateFrom || dateTo) && `Datum: ${dateFrom || '...'} bis ${dateTo || '...'}`
              ].filter(Boolean).join(', ')}
              {')'}
            </span>
          )}
        </div>
      )}

      {/* Items Per Page Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0.5rem 0',
        fontSize: '14px',
        color: '#666'
      }}>
        <span style={{ marginRight: '8px' }}>
          {itemsPerPage === 999999 ? 'alle' : itemsPerPage} Ergebnisse pro Seite werden angezeigt
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value={8}>8</option>
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={999999}>alle</option>
        </select>
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
          margin: '0.5rem 0 1rem 0',
          padding: '1rem'
        }}>
          {/* First Page Button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 10px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#f5f5f5' : '#fff',
              color: currentPage === 1 ? '#999' : '#333',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '36px'
            }}
          >
            &lt;&lt;
          </button>

          {/* Previous Button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 10px',
              border: '1px solid #ddd',
              background: currentPage === 1 ? '#f5f5f5' : '#fff',
              color: currentPage === 1 ? '#999' : '#333',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '36px'
            }}
          >
            &lt;
          </button>

          {/* Smart Page Numbers */}
          {getPaginationItems().map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  style={{
                    padding: '8px 4px',
                    color: '#999',
                    fontSize: '14px'
                  }}
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                onClick={() => handlePageChange(item)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  background: currentPage === item ? '#1d426a' : '#fff',
                  color: currentPage === item ? '#fff' : '#333',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: currentPage === item ? '600' : 'normal',
                  minWidth: '36px'
                }}
              >
                {item}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 10px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#f5f5f5' : '#fff',
              color: currentPage === totalPages ? '#999' : '#333',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '36px'
            }}
          >
            &gt;
          </button>

          {/* Last Page Button */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 10px',
              border: '1px solid #ddd',
              background: currentPage === totalPages ? '#f5f5f5' : '#fff',
              color: currentPage === totalPages ? '#999' : '#333',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '36px'
            }}
          >
            &gt;&gt;
          </button>
        </div>
      )}


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

// Invoice List Page Component
const ErstellteRechnungenPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load invoices from database
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            id,
            company,
            branch,
            street,
            location,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Invoice action handlers
  const handleDownloadInvoicePDF = async (invoice) => {
    try {
      // Load complete customer data including billing address
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', invoice.customer_id)
        .single();

      if (customerError) throw customerError;

      // Load invoice items for this invoice
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          repair_order:repair_orders(
            *,
            customers(*)
          )
        `)
        .eq('invoice_id', invoice.id)
        .order('position');

      if (itemsError) throw itemsError;

      // Prepare invoice data for PDF
      const invoiceData = {
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        customer: customerData,
        manualItems: invoiceItems.filter(item => !item.repair_order).map(item => ({
          description: item.description,
          amount: item.repair_amount
        }))
      };

      // Prepare selected orders for PDF
      const selectedOrdersForPDF = invoiceItems
        .filter(item => item.repair_order)
        .map(item => ({
          ...item.repair_order,
          nettopreis: item.repair_amount,
          repair_amount: item.repair_amount,
          porto: item.porto,
          werkstattausgang: item.date_performed,
          kommission: item.kommission,
          freigabe: item.repair_order.freigabe,
          kv_repair: item.repair_order.kv_repair,
          bottom: item.repair_order.kulanz
        }));

      // Generate PDF
      const { generateInvoicePDF } = await import('./invoicePdfExport.js');
      generateInvoicePDF(invoiceData, selectedOrdersForPDF);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fehler beim Generieren der PDF: ' + error.message);
    }
  };

  const handleEditInvoice = (invoiceId) => {
    // TODO: Navigate to edit invoice page
    window.location.href = `/rechnung-bearbeiten/${invoiceId}`;
  };

  const handleArchiveInvoice = async (invoice) => {
    if (window.confirm(`Möchten Sie Rechnung ${invoice.invoice_number} wirklich archivieren?`)) {
      try {
        // Delete the invoice (for now, until we add archived column)
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoice.id);

        if (deleteError) throw deleteError;

        // Reset repair orders status to null for ANY deleted invoice
        const { data: invoiceItems, error: itemsError } = await supabase
          .from('invoice_items')
          .select('repair_order_id')
          .eq('invoice_id', invoice.id)
          .not('repair_order_id', 'is', null);

        if (itemsError) throw itemsError;

        if (invoiceItems && invoiceItems.length > 0) {
          const repairOrderIds = invoiceItems.map(item => item.repair_order_id);
          const { error: resetError } = await supabase
            .from('repair_orders')
            .update({ invoice_status: null })
            .in('id', repairOrderIds);

          if (resetError) throw resetError;
        }

        alert('Rechnung erfolgreich archiviert');
        loadInvoices(); // Reload the list
      } catch (error) {
        console.error('Error archiving invoice:', error);
        alert('Fehler beim Archivieren der Rechnung: ' + error.message);
      }
    }
  };

  // Change invoice status
  const handleChangeStatus = async (invoice, newStatus) => {
    const statusLabels = {
      'draft': 'Entwurf',
      'sent': 'Gesendet', 
      'paid': 'Bezahlt'
    };

    if (window.confirm(`Möchten Sie den Status von Rechnung ${invoice.invoice_number} wirklich zu "${statusLabels[newStatus]}" ändern?`)) {
      try {
        const updateData = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        // Add timestamps based on status
        if (newStatus === 'sent' && invoice.status !== 'sent') {
          updateData.sent_at = new Date().toISOString();
        } else if (newStatus === 'paid' && invoice.status !== 'paid') {
          updateData.paid_at = new Date().toISOString();
        } else if (newStatus === 'draft') {
          updateData.sent_at = null;
          updateData.paid_at = null;
        }

        const { error: updateError } = await supabase
          .from('invoices')
          .update(updateData)
          .eq('id', invoice.id);

        if (updateError) throw updateError;

        // Update repair orders status accordingly
        const { data: invoiceItems, error: itemsError } = await supabase
          .from('invoice_items')
          .select('repair_order_id')
          .eq('invoice_id', invoice.id)
          .not('repair_order_id', 'is', null);

        if (itemsError) throw itemsError;

        if (invoiceItems && invoiceItems.length > 0) {
          const repairOrderIds = invoiceItems.map(item => item.repair_order_id);
          const repairOrderStatus = newStatus === 'sent' || newStatus === 'paid' ? 'invoiced' : 'draft';
          
          const { error: statusError } = await supabase
            .from('repair_orders')
            .update({ invoice_status: repairOrderStatus })
            .in('id', repairOrderIds);

          if (statusError) throw statusError;
        }

        alert(`Status erfolgreich zu "${statusLabels[newStatus]}" geändert`);
        loadInvoices(); // Reload the list
      } catch (error) {
        console.error('Error changing status:', error);
        alert('Fehler beim Ändern des Status: ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner"></div>
        <p style={{ color: '#666', fontSize: '16px' }}>Lade Rechnungen...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 60, marginRight: 24 }} />
        <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '1.8rem', margin: 0 }}>Erstellte Rechnungen</h1>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#5a6268';
            e.target.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#6c757d';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ← Zurück zum Hauptmenü
        </button>
      </div>

      {invoices.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          color: '#666'
        }}>
          <h3>Noch keine Rechnungen erstellt</h3>
          <p>Erstellen Sie Ihre erste Rechnung über die Reparaturaufträge.</p>
        </div>
      ) : (
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
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '60px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '120px' }}>Rechnung Nr.</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Kunde</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '120px' }}>Datum</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333', width: '100px' }}>Netto</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333', width: '80px' }}>MwSt.</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333', width: '100px' }}>Gesamt</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333', width: '150px' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr key={invoice.id} style={{ 
                  borderBottom: index < invoices.length - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: 'transparent'
                }}>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <select
                      value={invoice.status || 'draft'}
                      onChange={(e) => handleChangeStatus(invoice, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: 'white',
                        cursor: 'pointer',
                        color: invoice.status === 'draft' ? '#856404' : invoice.status === 'sent' ? '#155724' : '#004085',
                        fontWeight: '500'
                      }}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="sent">Gesendet</option>
                      <option value="paid">Bezahlt</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '500' }}>
                    {invoice.invoice_number}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{invoice.customers?.company}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{invoice.customers?.branch}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                    {new Date(invoice.invoice_date).toLocaleDateString('de-DE')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                    {invoice.subtotal.toFixed(2)}€
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {invoice.tax_amount.toFixed(2)}€
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1d426a' }}>
                    {invoice.total_amount.toFixed(2)}€
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      {/* PDF Button */}
                      <button
                        onClick={() => handleDownloadInvoicePDF(invoice)}
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
                        title="PDF herunterladen"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                      </button>
                      
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditInvoice(invoice.id)}
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
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleArchiveInvoice(invoice)} 
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
                        title="Archivieren"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Invoice Creation Page Component
const RechnungErstellenPage = () => {
  const navigate = useNavigate();
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invoice form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [numberValidation, setNumberValidation] = useState({ isValid: true, message: '' });

  // Manual line items state
  const [manualItems, setManualItems] = useState([]);
  const [showManualItemModal, setShowManualItemModal] = useState(false);
  const [manualItemType, setManualItemType] = useState('positive'); // 'positive' or 'negative'
  const [manualItemForm, setManualItemForm] = useState({
    description: '',
    amount: ''
  });

  // Sorting state
  const [sortBy, setSortBy] = useState('datum'); // 'datum' or 'filiale'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Get next invoice number
  const getNextInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].invoice_number);
        return (lastNumber + 1).toString();
      } else {
        // Start from 8125 if no invoices exist (continuing from your example 8124)
        return '8125';
      }
    } catch (error) {
      console.error('Error getting next invoice number:', error);
      return '8125'; // Fallback
    }
  };

  // Validate invoice number for duplicates
  const validateInvoiceNumber = async (number) => {
    if (!number.trim()) {
      setNumberValidation({ isValid: false, message: 'Rechnungsnummer ist erforderlich' });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', number.trim())
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setNumberValidation({ 
          isValid: false, 
          message: 'Diese Rechnungsnummer ist bereits vergeben' 
        });
        return false;
      } else {
        setNumberValidation({ isValid: true, message: '' });
        return true;
      }
    } catch (error) {
      console.error('Error validating invoice number:', error);
      setNumberValidation({ 
        isValid: false, 
        message: 'Fehler bei der Validierung' 
      });
      return false;
    }
  };

  useEffect(() => {
    // Get order IDs from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderIds = urlParams.get('orders');
    
    if (orderIds) {
      const ids = orderIds.split(',').map(id => id.trim());
      setSelectedOrderIds(ids);
      loadSelectedOrders(ids);
      // Load next invoice number
      loadNextInvoiceNumber();
    } else {
      // No orders selected, redirect back
      window.location.href = '/erstellte-reperaturauftrage';
    }
  }, []);

  const loadNextInvoiceNumber = async () => {
    const nextNumber = await getNextInvoiceNumber();
    setInvoiceNumber(nextNumber);
  };

  const loadSelectedOrders = async (orderIds) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          customers (
            id,
            company,
            branch,
            street,
            location,
            country,
            contact_person,
            billing_street,
            billing_location,
            billing_country
          )
        `)
        .in('id', orderIds);

      if (error) throw error;
      setSelectedOrders(data || []);
    } catch (error) {
      console.error('Error loading selected orders:', error);
      alert('Fehler beim Laden der ausgewählten Reparaturaufträge');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate repair costs
  const calculateRepairCost = (order) => {
    // If nettopreis is already calculated and stored, use it
    if (order.nettopreis && order.nettopreis > 0) {
      return parseFloat(order.nettopreis);
    }
    
    // Otherwise, calculate from individual components (for new orders)
    let total = 0;
    
    // Add arbeitszeit cost
    if (order.arbeitszeit) {
      if (order.austria_arbeitszeit && order.customers?.country === 'Österreich') {
        total += parseFloat(order.austria_arbeitszeit) || 0;
      } else {
        // Default arbeitszeit costs
        if (order.customers?.country === 'Österreich') {
          total += 26.00; // Default for Austria
        } else {
          total += 22.00; // Default for Germany
        }
      }
    }
    
    // Add other arbeiten costs
    const ARBEITEN_COSTS = {
      'fehlerdiagnose': 5.95,
      'reinigung': 5.95,
      'kleinmaterial': 5.95,
      'endkontrolle': 5.95,
      'hoerer_repariert': 14.90,
      'schale_repariert': 14.90,
      'zugfaden': 5.95,
      'cerumenschutz': 5.95,
      'faceplate': 14.90,
      'ido_schale': 32.00,
      'hdo_schale': 32.00,
      'winkel': 5.95,
      'batteriekontakt': 5.95,
      'lautstaerke': 5.95,
      'programmiertaste': 5.95,
      'mikrofon': 14.90,
      'hoerer': 14.90,
      'kabel': 14.90,
      'daempfung': 5.95,
      'schwierige_faelle': 32.00
    };
    
    // Add costs for selected arbeiten
    Object.keys(ARBEITEN_COSTS).forEach(key => {
      if (order[key]) {
        total += ARBEITEN_COSTS[key];
      }
    });
    
    // Add manual arbeiten costs
    Object.keys(order).forEach(key => {
      if (key.endsWith('_manual') && order[key]) {
        const manualCost = parseFloat(order[key]) || 0;
        total += manualCost;
      }
    });
    
    return total;
  };

  // Helper function to calculate porto
  const calculatePorto = (order) => {
    // If porto is already calculated and stored, use it
    if (order.porto !== undefined && order.porto !== null) {
      return parseFloat(order.porto);
    }
    
    // If no stored porto value, return 0 (no porto)
    return 0;
  };

  // Helper function to get repair description
  const getRepairDescription = (order) => {
    // Check for KV repair or kostenpflichtige Reparatur - always "einzelne Positionen"
    if (order.freigabe === 'Reparatur laut KV durchführen' || order.freigabe === 'Kostenpflichtige Reparatur') {
      return 'einzelne Positionen';
    }
    
    // Check for specific status - just the word, no date or extra text
    if (order.freigabe === 'Garantie') {
      return 'Garantie';
    }
    if (order.freigabe === 'Reklamation') {
      return 'Reklamation';
    }
    if (order.freigabe === 'Unrepariert zurückschicken') {
      return 'Unrepariert zurück';
    }
    if (order.freigabe === 'Verschrotten') {
      return 'Verschrotten';
    }
    
    // Check for Kulanz - just "Kulanz"
    if (order.kulanz) {
      return 'Kulanz';
    }
    
    // If freigabe has other specific values, use them
    if (order.freigabe && order.freigabe !== 'Keine angabe') {
      return order.freigabe;
    }
    
    // Build description from selected arbeiten
    const selectedArbeiten = [];
    const ARBEITEN_NAMES = {
      'fehlerdiagnose': 'Fehlerdiagnose',
      'reinigung': 'Reinigung',
      'kleinmaterial': 'Kleinmaterial',
      'arbeitszeit': 'Arbeitszeit',
      'endkontrolle': 'Endkontrolle',
      'hoerer_repariert': 'Hörer repariert',
      'schale_repariert': 'Schale repariert',
      'zugfaden': 'Zugfaden',
      'cerumenschutz': 'Cerumenschutz',
      'faceplate': 'Gehäuse / Faceplate',
      'ido_schale': 'Gehäuse / IDO Schale',
      'hdo_schale': 'Gehäuse / HDO Schale',
      'winkel': 'Winkel',
      'batteriekontakt': 'Batteriekontakt',
      'lautstaerke': 'Lautstärke',
      'programmiertaste': 'Programmiertaste',
      'mikrofon': 'Mikrofon',
      'hoerer': 'Hörer',
      'kabel': 'Kabel',
      'daempfung': 'Dämpfung',
      'schwierige_faelle': 'Schwierige Fälle'
    };
    
    Object.keys(ARBEITEN_NAMES).forEach(key => {
      if (order[key]) {
        selectedArbeiten.push(ARBEITEN_NAMES[key]);
      }
    });
    
    return selectedArbeiten.length > 0 ? selectedArbeiten.join(', ') : 'Einzelne Positionen';
  };

  // Manual item handlers
  const handleAddManualItem = (type) => {
    setManualItemType(type);
    setManualItemForm({ description: '', amount: '' });
    setShowManualItemModal(true);
  };

  const handleSaveManualItem = () => {
    if (!manualItemForm.description.trim() || !manualItemForm.amount.trim()) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }

    const amount = parseFloat(manualItemForm.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Bitte geben Sie einen gültigen Betrag ein.');
      return;
    }

    const newItem = {
      id: Date.now(), // Temporary ID
      description: manualItemForm.description.trim(),
      amount: manualItemType === 'negative' ? -Math.abs(amount) : Math.abs(amount),
      type: 'manual'
    };

    setManualItems(prev => [...prev, newItem]);
    setShowManualItemModal(false);
    setManualItemForm({ description: '', amount: '' });
  };

  const handleRemoveManualItem = (itemId) => {
    setManualItems(prev => prev.filter(item => item.id !== itemId));
  };

  // PDF export for invoice creation
  const handleInvoicePDFExport = async () => {
    try {
      if (!invoiceNumber.trim() || !invoiceDate) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
      }

      if (!numberValidation.isValid) {
        alert('Bitte korrigieren Sie die Rechnungsnummer.');
        return;
      }

      // Calculate totals
      const totalRepairCost = selectedOrders.reduce((sum, order) => sum + calculateRepairCost(order), 0);
      const totalPorto = selectedOrders.reduce((sum, order) => sum + calculatePorto(order), 0);
      const totalManualAmount = manualItems.reduce((sum, item) => sum + item.amount, 0);
      const subtotal = totalRepairCost + totalPorto + totalManualAmount;
      const taxRate = selectedOrders[0]?.customers?.country === 'Österreich' ? 0 : 0.19;
      const totalTax = subtotal * taxRate;
      const grandTotal = subtotal + totalTax;

      // Create invoice data for PDF
      const invoiceData = {
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        periodStart: periodStart,
        periodEnd: periodEnd,
        customer: selectedOrders[0]?.customers || {},
        manualItems: manualItems
      };

      // Prepare selected orders for PDF
      const selectedOrdersForPDF = selectedOrders.map(order => ({
        ...order,
        nettopreis: calculateRepairCost(order),
        repair_amount: calculateRepairCost(order),
        porto: calculatePorto(order),
        werkstattausgang: order.werkstattausgang,
        kommission: order.kommission,
        freigabe: order.freigabe,
        kv_repair: order.kv_repair,
        bottom: order.kulanz
      }));

      // Generate PDF
      const { generateInvoicePDF } = await import('./invoicePdfExport.js');
      generateInvoicePDF(invoiceData, selectedOrdersForPDF);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fehler beim Generieren der PDF: ' + error.message);
    }
  };

  // Invoice saving handlers
  const handleSaveInvoice = async () => {
    try {
      if (!invoiceNumber.trim() || !invoiceDate) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
      }

      if (!numberValidation.isValid) {
        alert('Bitte korrigieren Sie die Rechnungsnummer.');
        return;
      }

      // Calculate totals
      const totalRepairCost = selectedOrders.reduce((sum, order) => sum + calculateRepairCost(order), 0);
      const totalPorto = selectedOrders.reduce((sum, order) => sum + calculatePorto(order), 0);
      const totalManualAmount = manualItems.reduce((sum, item) => sum + item.amount, 0);
      const subtotal = totalRepairCost + totalPorto + totalManualAmount;
      const taxRate = selectedOrders[0]?.customers?.country === 'Österreich' ? 0 : 0.19;
      const totalTax = subtotal * taxRate;
      const grandTotal = subtotal + totalTax;

      // Create invoice record
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_id: selectedOrders[0].customers.id,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        status: 'draft',
        subtotal: subtotal,
        tax_amount: totalTax,
        tax_rate: taxRate,
        total_amount: grandTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = [];

      // Add repair orders as invoice items
      selectedOrders.forEach((order, index) => {
        const repairCost = calculateRepairCost(order);
        const portoCost = calculatePorto(order);
        
        invoiceItems.push({
          invoice_id: invoice.id,
          repair_order_id: order.id,
          position: index + 1,
          date_performed: order.werkstattausgang || order.created_at,
          kommission: order.kommission || '',
          description: getRepairDescription(order),
          filiale: order.customers?.branch || '',
          repair_amount: repairCost,
          porto: portoCost,
          line_total: repairCost + portoCost,
          created_at: new Date().toISOString()
        });
      });

      // Add manual items as invoice items
      manualItems.forEach((item, index) => {
        invoiceItems.push({
          invoice_id: invoice.id,
          repair_order_id: null, // No repair order for manual items
          position: selectedOrders.length + index + 1,
          date_performed: new Date().toISOString().split('T')[0],
          kommission: 'Manual',
          description: item.description,
          filiale: '',
          repair_amount: item.amount,
          porto: 0,
          line_total: item.amount,
          created_at: new Date().toISOString()
        });
      });

      // Save invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update repair orders status to 'draft'
      const repairOrderIds = selectedOrders.map(order => order.id);
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update({ invoice_status: 'draft' })
        .in('id', repairOrderIds);

      if (updateError) throw updateError;

      alert('Rechnung erfolgreich gespeichert!');
      
      // Redirect to invoice list after successful save
      setTimeout(() => {
        navigate('/erstellte-rechnungen');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Fehler beim Speichern der Rechnung: ' + error.message);
    }
  };

  const handleSaveAndSend = async () => {
    try {
      if (!invoiceNumber.trim() || !invoiceDate) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
      }

      if (!numberValidation.isValid) {
        alert('Bitte korrigieren Sie die Rechnungsnummer.');
        return;
      }

      // Calculate totals
      const totalRepairCost = selectedOrders.reduce((sum, order) => sum + calculateRepairCost(order), 0);
      const totalPorto = selectedOrders.reduce((sum, order) => sum + calculatePorto(order), 0);
      const totalManualAmount = manualItems.reduce((sum, item) => sum + item.amount, 0);
      const subtotal = totalRepairCost + totalPorto + totalManualAmount;
      const taxRate = selectedOrders[0]?.customers?.country === 'Österreich' ? 0 : 0.19;
      const totalTax = subtotal * taxRate;
      const grandTotal = subtotal + totalTax;

      // Create invoice record with 'sent' status
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_id: selectedOrders[0].customers.id,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        status: 'sent', // Set as sent directly
        subtotal: subtotal,
        tax_amount: totalTax,
        tax_rate: taxRate,
        total_amount: grandTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sent_at: new Date().toISOString() // Add sent timestamp
      };

      // Save invoice to database
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = [];

      // Add repair orders as invoice items
      selectedOrders.forEach((order, index) => {
        const repairCost = calculateRepairCost(order);
        const portoCost = calculatePorto(order);
        
        invoiceItems.push({
          invoice_id: invoice.id,
          repair_order_id: order.id,
          position: index + 1,
          date_performed: order.werkstattausgang || order.created_at,
          kommission: order.kommission || '',
          description: getRepairDescription(order),
          filiale: order.customers?.branch || '',
          repair_amount: repairCost,
          porto: portoCost,
          line_total: repairCost + portoCost,
          created_at: new Date().toISOString()
        });
      });

      // Add manual items as invoice items
      manualItems.forEach((item, index) => {
        invoiceItems.push({
          invoice_id: invoice.id,
          repair_order_id: null,
          position: selectedOrders.length + index + 1,
          date_performed: new Date().toISOString().split('T')[0],
          kommission: 'Manual',
          description: item.description,
          filiale: '',
          repair_amount: item.amount,
          porto: 0,
          line_total: item.amount,
          created_at: new Date().toISOString()
        });
      });

      // Save invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update repair orders status to 'invoiced' (sent)
      const repairOrderIds = selectedOrders.map(order => order.id);
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update({ invoice_status: 'invoiced' })
        .in('id', repairOrderIds);

      if (updateError) throw updateError;

      // TODO: Add PDF export here
      
      alert('Rechnung erfolgreich erstellt und gesendet!');
      // Redirect to invoice list
      window.location.href = '/erstellte-rechnungen';
      
    } catch (error) {
      console.error('Error saving and sending invoice:', error);
      alert('Fehler beim Speichern und Senden der Rechnung: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner"></div>
        <p style={{ color: '#666', fontSize: '16px' }}>Lade ausgewählte Reparaturaufträge...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 60, marginRight: 24 }} />
          <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '1.8rem', margin: 0 }}>Rechnung erstellen</h1>
        </div>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => window.location.href = '/erstellte-reperaturauftrage'}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#5a6268';
            e.target.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#6c757d';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ← Zurück zu Reparaturaufträge
        </button>
      </div>

      {/* Invoice Form Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#1d426a', marginBottom: '1.5rem' }}>Rechnungsinformationen</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
          {/* Invoice Number */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Rechnungsnummer *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isEditingNumber ? (
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    if (e.target.value.trim()) {
                      validateInvoiceNumber(e.target.value);
                    }
                  }}
                  onBlur={() => setIsEditingNumber(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingNumber(false);
                    }
                  }}
                  autoFocus
                  style={{
                    padding: '6px 10px',
                    border: `1px solid ${numberValidation.isValid ? '#ddd' : '#dc3545'}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                    flex: 1
                  }}
                />
              ) : (
                <div style={{
                  padding: '6px 10px',
                  border: `1px solid ${numberValidation.isValid ? '#ddd' : '#dc3545'}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: '#f8f9fa',
                  flex: 1
                }}>
                  {invoiceNumber}
                </div>
              )}
              
              <button
                onClick={() => setIsEditingNumber(!isEditingNumber)}
                style={{
                  background: 'none',
                  border: '1px solid #1d426a',
                  borderRadius: '4px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#1d426a'
                }}
                title="Rechnungsnummer bearbeiten"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                </svg>
              </button>
              
              {!numberValidation.isValid && (
                <span
                  style={{
                    color: '#dc3545',
                    fontSize: '14px',
                    cursor: 'help'
                  }}
                  title={numberValidation.message}
                >
                  ⚠️
                </span>
              )}
            </div>
          </div>
          
          {/* Invoice Date */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Rechnungsdatum *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Period Start */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Leistungszeitraum von
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Period End */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Leistungszeitraum bis
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Customer Information Section */}
      {selectedOrders.length > 0 && selectedOrders[0].customers && (
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          {(() => {
            // Smart invoice address selection logic
            const customers = selectedOrders.map(order => order.customers);
            
            // Check if any customer has a billing address
            const customersWithBillingAddress = customers.filter(customer => 
              customer.billing_street || customer.billing_location || customer.billing_country
            );
            
            // If any customer has billing address, use the first one with billing address
            // Otherwise, use the first customer (fallback to main address)
            const selectedCustomer = customersWithBillingAddress.length > 0 
              ? customersWithBillingAddress[0] 
              : customers[0];
            
            const hasBillingAddress = selectedCustomer.billing_street || selectedCustomer.billing_location || selectedCustomer.billing_country;
            const usingFallback = !hasBillingAddress;
            
            return (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ color: '#1d426a', margin: 0 }}>Rechnungsadresse</h2>
                  {usingFallback && (
                    <span 
                      style={{ 
                        color: '#dc3545', 
                        fontSize: '14px',
                        cursor: 'help',
                        position: 'relative',
                        top: '-2px'
                      }}
                      title="Achtung: Aufgrund von nicht vorhandener Rechnungsadresse in der Datenbank der Akustiker, wurde die Filialadresse genommen"
                    >
                      ⚠️
                    </span>
                  )}
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1d426a', marginBottom: '0.5rem' }}>
                      Rechnungsempfänger:
                    </div>
                    <div style={{ color: '#333' }}>
                      {selectedCustomer.company && (
                        <div style={{ fontWeight: '500' }}>{selectedCustomer.company}</div>
                      )}
                      {selectedCustomer.contact_person && (
                        <div style={{ fontStyle: 'italic', color: '#666' }}>
                          Ansprechpartner: {selectedCustomer.contact_person}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '600', color: '#1d426a', marginBottom: '0.5rem' }}>
                      Adresse:
                    </div>
                    <div style={{ color: '#333' }}>
                      {(selectedCustomer.billing_street || selectedCustomer.street) && (
                        <div>{selectedCustomer.billing_street || selectedCustomer.street}</div>
                      )}
                      {(selectedCustomer.billing_location || selectedCustomer.location) && (
                        <div>{selectedCustomer.billing_location || selectedCustomer.location}</div>
                      )}
                      {(selectedCustomer.billing_country || selectedCustomer.country) && (
                        <div>{selectedCustomer.billing_country || selectedCustomer.country}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Invoice Items Table */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#1d426a', margin: 0 }}>Rechnungspositionen ({selectedOrders.length + manualItems.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Sorting Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Sortieren nach:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="datum">Datum</option>
                <option value="filiale">Filiale</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <button
              onClick={() => handleAddManualItem('positive')}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
              title="Positive Position hinzufügen"
              onMouseEnter={(e) => {
                e.target.style.background = '#218838';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#28a745';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span>
              Position
            </button>
            <button
              onClick={() => handleAddManualItem('negative')}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
              title="Negative Position hinzufügen (Gutschrift)"
              onMouseEnter={(e) => {
                e.target.style.background = '#c82333';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#dc3545';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>−</span>
              Gutschrift
            </button>
          </div>
        </div>
        
        {selectedOrders.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            Keine Reparaturaufträge ausgewählt.
          </p>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '100px 120px 2fr 1.5fr 100px 80px 80px 100px 60px',
              gap: '12px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333',
              marginBottom: '1rem'
            }}>
              <div>Datum</div>
              <div>Kommission</div>
              <div>Reparatur</div>
              <div>Filiale</div>
              <div style={{ textAlign: 'right' }}>Rep.kosten</div>
              <div style={{ textAlign: 'right' }}>Porto</div>
              <div style={{ textAlign: 'right' }}>MwSt.</div>
              <div style={{ textAlign: 'right' }}>Gesamt</div>
              <div style={{ textAlign: 'center' }}>Aktion</div>
            </div>
            
            {/* Table Rows - Repair Orders */}
            {selectedOrders
              .sort((a, b) => {
                if (sortBy === 'datum') {
                  // Sort by date, then by filiale for same dates
                  const dateA = new Date(a.werkstattausgang || 0);
                  const dateB = new Date(b.werkstattausgang || 0);
                  if (dateA.getTime() !== dateB.getTime()) {
                    return sortOrder === 'asc' 
                      ? dateA.getTime() - dateB.getTime() // Oldest first
                      : dateB.getTime() - dateA.getTime(); // Newest first
                  }
                  // Same date: sort by filiale
                  const filialeA = a.customers?.branch || '';
                  const filialeB = b.customers?.branch || '';
                  return filialeA.localeCompare(filialeB);
                } else if (sortBy === 'filiale') {
                  // Sort by filiale, then by date for same filiales
                  const filialeA = a.customers?.branch || '';
                  const filialeB = b.customers?.branch || '';
                  if (filialeA !== filialeB) {
                    return filialeA.localeCompare(filialeB);
                  }
                  // Same filiale: sort by date
                  const dateA = new Date(a.werkstattausgang || 0);
                  const dateB = new Date(b.werkstattausgang || 0);
                  return sortOrder === 'asc' 
                    ? dateA.getTime() - dateB.getTime() // Oldest first
                    : dateB.getTime() - dateA.getTime(); // Newest first
                }
                return 0;
              })
              .map((order, index) => {
              // Calculate repair costs
              const repairCost = calculateRepairCost(order);
              const portoCost = calculatePorto(order);
              const taxRate = order.customers?.country === 'Österreich' ? 0 : 0.19;
              const subtotal = repairCost + portoCost;
              const taxAmount = subtotal * taxRate;
              const total = subtotal + taxAmount;
              
              return (
                <div key={order.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 120px 2fr 1.5fr 100px 80px 80px 100px 60px',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div>
                    {order.werkstattausgang 
                      ? new Date(order.werkstattausgang).toLocaleDateString('de-DE')
                      : '-'
                    }
                  </div>
                  <div style={{ fontWeight: '500' }}>{order.kommission || '-'}</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.3' }}>
                    {getRepairDescription(order)}
                  </div>
                  <div>{order.customers?.branch || '-'}</div>
                  <div style={{ textAlign: 'right', fontWeight: '500' }}>
                    {repairCost.toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {portoCost.toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                    {(taxRate * 100).toFixed(0)}%
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: '600', color: '#1d426a' }}>
                    {total.toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      title="Position entfernen"
                      onClick={() => {
                        const updatedOrders = selectedOrders.filter(o => o.id !== order.id);
                        setSelectedOrders(updatedOrders);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc3545';
                        e.target.style.color = 'white';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'none';
                        e.target.style.color = '#dc3545';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Table Rows - Manual Items */}
            {manualItems.map((item, index) => {
              const taxRate = selectedOrders[0]?.customers?.country === 'Österreich' ? 0 : 0.19;
              const taxAmount = item.amount * taxRate;
              const total = item.amount + taxAmount;
              
              return (
                <div key={`manual-${item.id}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 120px 2fr 1.5fr 100px 80px 80px 100px 60px',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  background: item.amount < 0 ? '#fff5f5' : '#f0f8f0'
                }}>
                  <div>-</div>
                  <div>Manual</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.3', fontStyle: 'italic' }}>
                    {item.description}
                  </div>
                  <div>-</div>
                  <div style={{ textAlign: 'right', fontWeight: '500' }}>
                    {item.amount.toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    0.00€
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                    {(taxRate * 100).toFixed(0)}%
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: '600', color: item.amount < 0 ? '#dc3545' : '#28a745' }}>
                    {total.toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      title="Position entfernen"
                      onClick={() => handleRemoveManualItem(item.id)}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc3545';
                        e.target.style.color = 'white';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'none';
                        e.target.style.color = '#dc3545';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Summary Row */}
            {(() => {
              const totalRepairCost = selectedOrders.reduce((sum, order) => sum + calculateRepairCost(order), 0);
              const totalPorto = selectedOrders.reduce((sum, order) => sum + calculatePorto(order), 0);
              const totalManualAmount = manualItems.reduce((sum, item) => sum + item.amount, 0);
              const subtotal = totalRepairCost + totalPorto + totalManualAmount;
              // Use tax rate from first customer (assuming all same country for now)
              const taxRate = selectedOrders[0]?.customers?.country === 'Österreich' ? 0 : 0.19;
              const totalTax = subtotal * taxRate;
              const grandTotal = subtotal + totalTax;
              
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 120px 2fr 1.5fr 100px 80px 80px 100px 60px',
                  gap: '12px',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#1d426a',
                  marginTop: '1rem',
                  borderTop: '2px solid #1d426a'
                }}>
                  <div></div>
                  <div></div>
                  <div>SUMME</div>
                  <div></div>
                  <div style={{ textAlign: 'right' }}>
                    {(totalRepairCost + totalManualAmount).toFixed(2)}€
                  </div>
                  <div style={{ textAlign: 'right' }}>{totalPorto.toFixed(2)}€</div>
                  <div style={{ textAlign: 'right' }}>{totalTax.toFixed(2)}€</div>
                  <div style={{ textAlign: 'right', fontSize: '16px' }}>{grandTotal.toFixed(2)}€</div>
                  <div></div>
                </div>
              );
            })()}
          </>
        )}
        
        {selectedOrders.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={handleInvoicePDFExport}
              style={{
                background: '#1d426a',
                color: 'white',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="PDF exportieren"
              onMouseEnter={(e) => {
                e.target.style.background = '#16365a';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1d426a';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </button>
            
            <button
              onClick={handleSaveInvoice}
              style={{
                background: '#1d426a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#16365a';
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1d426a';
                e.target.style.transform = 'scale(1)';
              }}
            >
              Speichern als Entwurf
            </button>
          </div>
        )}
      </div>

      {/* Manual Item Modal */}
      {showManualItemModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ 
              color: '#1d426a', 
              marginBottom: '1.5rem', 
              textAlign: 'center' 
            }}>
              {manualItemType === 'positive' ? 'Positive Position hinzufügen' : 'Gutschrift hinzufügen'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500', 
                color: '#333' 
              }}>
                Beschreibung *
              </label>
              <input
                type="text"
                value={manualItemForm.description}
                onChange={(e) => setManualItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={manualItemType === 'positive' ? 'z.B. Zusätzliche Beratung' : 'z.B. Gutschrift von Juli 2025'}
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
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500', 
                color: '#333' 
              }}>
                Betrag * (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualItemForm.amount}
                onChange={(e) => setManualItemForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
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
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowManualItemModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#5a6268';
                  e.target.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#6c757d';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleSaveManualItem}
                style={{
                  background: manualItemType === 'positive' ? '#28a745' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = manualItemType === 'positive' ? '#218838' : '#c82333';
                  e.target.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = manualItemType === 'positive' ? '#28a745' : '#dc3545';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {manualItemType === 'positive' ? 'Position hinzufügen' : 'Gutschrift hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Invoice Edit Page Component
const RechnungBearbeitenPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Invoice form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [numberValidation, setNumberValidation] = useState({ isValid: true, message: '' });
  
  // Manual item state
  const [manualItems, setManualItems] = useState([]);
  const [showManualItemModal, setShowManualItemModal] = useState(false);
  const [manualItemType, setManualItemType] = useState('positive');
  const [manualItemForm, setManualItemForm] = useState({ description: '', amount: '' });

  // Sorting state
  const [sortBy, setSortBy] = useState('datum'); // 'datum' or 'filiale'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    loadInvoice();
    loadAvailableRepairOrders();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      
      // Load invoice with customer data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(
            id,
            company,
            branch,
            contact_person,
            street,
            location,
            country,
            billing_street,
            billing_location,
            billing_country
          )
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;

      // Load invoice items with repair order data
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          repair_order:repair_orders(
            id,
            kommission,
            hersteller,
            geraetetyp,
            seriennummer,
            werkstattausgang,
            freigabe,
            nettopreis,
            porto,
            manual_porto,
            austria_arbeitszeit,
            kulanz,
            customers:customers(
              id,
              company,
              branch,
              street,
              location,
              country
            )
          )
        `)
        .eq('invoice_id', id)
        .order('position');

      if (itemsError) throw itemsError;

      // Separate repair order items from manual items
      const repairOrderItems = itemsData.filter(item => item.repair_order_id);
      const manualItemsData = itemsData.filter(item => !item.repair_order_id);

      setInvoice(invoiceData);
      setInvoiceItems(repairOrderItems);
      setManualItems(manualItemsData.map(item => ({
        id: item.id,
        type: item.line_total >= 0 ? 'positive' : 'negative',
        description: item.description,
        amount: Math.abs(item.line_total).toFixed(2)
      })));

      // Set form state
      setInvoiceNumber(invoiceData.invoice_number);
      setInvoiceDate(invoiceData.invoice_date);
      setPeriodStart(invoiceData.period_start);
      setPeriodEnd(invoiceData.period_end);
      
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Fehler beim Laden der Rechnung: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Calculate totals
      const allOrders = [...invoiceItems, ...selectedOrders];
      const repairTotal = allOrders.reduce((sum, order) => sum + (order.nettopreis || order.repair_amount || 0), 0);
      const portoTotal = allOrders.reduce((sum, order) => sum + (order.porto || 0), 0);
      const manualTotal = manualItems.reduce((sum, item) => {
        const amount = parseFloat(item.amount);
        return sum + (item.type === 'positive' ? amount : -amount);
      }, 0);
      
      const subtotal = repairTotal + portoTotal + manualTotal;
      const taxRate = invoice.customer.country === 'Österreich' ? 0 : 0.19;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;
      
      // Update invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          period_start: periodStart,
          period_end: periodEnd,
          subtotal: subtotal,
          tax_amount: taxAmount,
          tax_rate: taxRate,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete existing invoice items (we'll recreate them)
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) throw deleteError;

      // Create new invoice items for repair orders
      const repairOrderItems = allOrders.map((order, index) => ({
        invoice_id: id,
        repair_order_id: order.repair_order_id || order.id, // Handle both existing and new orders
        position: index + 1,
        date_performed: order.werkstattausgang || order.date_performed,
        kommission: order.kommission,
        description: getRepairDescription(order),
        filiale: order.customers?.branch || order.filiale || '',
        repair_amount: parseFloat(order.nettopreis || order.repair_amount || 0),
        porto: parseFloat(order.porto || 0),
        line_total: parseFloat((order.nettopreis || order.repair_amount || 0) + (order.porto || 0)),
        created_at: new Date().toISOString()
      }));

      // Create manual items
      const manualItemsData = manualItems.map((item, index) => ({
        invoice_id: id,
        repair_order_id: null,
        position: allOrders.length + index + 1,
        date_performed: null,
        kommission: null,
        description: item.description,
        filiale: null,
        repair_amount: 0.0,
        porto: 0.0,
        line_total: parseFloat(item.type === 'positive' ? item.amount : `-${item.amount}`),
        created_at: new Date().toISOString()
      }));

      // Insert all items
      const allItems = [...repairOrderItems, ...manualItemsData];
      if (allItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(allItems);

        if (itemsError) throw itemsError;
      }

      // Update repair orders status for newly added orders
      if (selectedOrders.length > 0) {
        const { error: statusError } = await supabase
          .from('repair_orders')
          .update({ invoice_status: 'draft' })
          .in('id', selectedOrders.map(order => order.id));

        if (statusError) throw statusError;
      }
      
      alert('Rechnung erfolgreich gespeichert!');
      navigate('/erstellte-rechnungen');
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get repair description
  const getRepairDescription = (order) => {
    if (order.freigabe && order.freigabe !== 'einzelne Positionen') {
      const statusMap = {
        'garantie': 'Garantie',
        'reklamation': 'Reklamation', 
        'kulanz': 'Kulanz',
        'unrepariert zurück': 'Unrepariert zurück'
      };
      return statusMap[order.freigabe] || order.freigabe;
    }
    
    if (order.kv_repair === 'ja') {
      return 'Reparatur laut KV durchführen';
    }
    
    return 'Reparatur: Einzelne Positionen';
  };

  // PDF Export function
  const handlePDFExport = () => {
    if (!invoice) return;
    
    // Prepare data in the format expected by the PDF export
    const allOrders = [...invoiceItems, ...selectedOrders];
    
    // Convert invoice items back to repair order format for PDF
    const selectedOrdersForPDF = allOrders.map(item => {
      if (item.repair_order) {
        // This is from invoiceItems with repair_order data
        return {
          ...item.repair_order,
          customers: item.repair_order.customers, // Keep original customer data for each order
          nettopreis: item.repair_amount || 0,
          repair_amount: item.repair_amount || 0, // Also provide as repair_amount for PDF compatibility
          porto: item.porto || 0,
          werkstattausgang: item.repair_order.werkstattausgang || item.date_performed,
          kommission: item.kommission || item.repair_order.kommission,
          freigabe: item.repair_order.freigabe,
          kv_repair: item.repair_order.kv_repair,
          bottom: item.repair_order.bottom
        };
      } else {
        // This is from selectedOrders (newly added)
        return {
          ...item,
          customers: invoice.customer,
          repair_amount: item.nettopreis || 0 // Ensure repair_amount is available
        };
      }
    });

    const invoiceData = {
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      periodStart: periodStart,
      periodEnd: periodEnd,
      customer: invoice.customer,
      manualItems: manualItems
    };

    // Import and use the PDF export function
    import('./invoicePdfExport.js').then(({ generateInvoicePDF }) => {
      generateInvoicePDF(invoiceData, selectedOrdersForPDF);
    }).catch(error => {
      console.error('Error loading PDF export:', error);
      alert('Fehler beim PDF-Export: ' + error.message);
    });
  };

  // Reset invoice to draft status
  const handleResetToDraft = async () => {
    if (window.confirm('Möchten Sie diese Rechnung wirklich als Entwurf zurücksetzen? Dadurch wird sie wieder bearbeitbar, aber der "Gesendet"-Status geht verloren.')) {
      try {
        setSaving(true);
        
        // Update invoice status to draft
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'draft',
            sent_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Update associated repair orders status to draft
        const { data: invoiceItems, error: itemsError } = await supabase
          .from('invoice_items')
          .select('repair_order_id')
          .eq('invoice_id', id)
          .not('repair_order_id', 'is', null);

        if (itemsError) throw itemsError;

        if (invoiceItems && invoiceItems.length > 0) {
          const repairOrderIds = invoiceItems.map(item => item.repair_order_id);
          const { error: resetError } = await supabase
            .from('repair_orders')
            .update({ invoice_status: 'draft' })
            .in('id', repairOrderIds);

          if (resetError) throw resetError;
        }

        // Reload the invoice to reflect changes
        await loadInvoice();
        alert('Rechnung wurde erfolgreich als Entwurf zurückgesetzt!');
        
      } catch (error) {
        console.error('Error resetting invoice to draft:', error);
        alert('Fehler beim Zurücksetzen: ' + error.message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Load available repair orders for adding to invoice
  const loadAvailableRepairOrders = async () => {
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
        .is('invoice_status', null) // Only unused repair orders
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableOrders(data || []);
    } catch (error) {
      console.error('Error loading available repair orders:', error);
    }
  };

  // Add repair order to invoice
  const handleAddRepairOrder = (repairOrder) => {
    if (!selectedOrders.find(order => order.id === repairOrder.id)) {
      setSelectedOrders(prev => [...prev, repairOrder]);
      setAvailableOrders(prev => prev.filter(order => order.id !== repairOrder.id));
    }
  };

  // Remove repair order from invoice
  const handleRemoveRepairOrder = (repairOrderId) => {
    const orderToRemove = selectedOrders.find(order => order.id === repairOrderId);
    if (orderToRemove) {
      setSelectedOrders(prev => prev.filter(order => order.id !== repairOrderId));
      setAvailableOrders(prev => [...prev, orderToRemove]);
    }
  };

  // Manual item functions
  const handleAddManualItem = () => {
    if (manualItemForm.description.trim() && manualItemForm.amount.trim()) {
      const newItem = {
        id: Date.now(), // Temporary ID
        type: manualItemType,
        description: manualItemForm.description.trim(),
        amount: parseFloat(manualItemForm.amount).toFixed(2)
      };
      
      setManualItems(prev => [...prev, newItem]);
      setManualItemForm({ description: '', amount: '' });
      setShowManualItemModal(false);
    }
  };

  const handleRemoveManualItem = (itemId) => {
    setManualItems(prev => prev.filter(item => item.id !== itemId));
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="loading-spinner"></div>
        <p style={{ color: '#666', fontSize: '16px' }}>Lade Rechnung...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Rechnung nicht gefunden</h2>
        <button onClick={() => navigate('/erstellte-rechnungen')}>
          Zurück zu Rechnungen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #1d426a'
      }}>
        <h1 style={{ 
          margin: 0, 
          color: '#1d426a', 
          fontSize: '2rem',
          fontWeight: '400'
        }}>
          Rechnung bearbeiten
        </h1>
        
        <button
          onClick={() => navigate('/erstellte-rechnungen')}
          style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#5a6268';
            e.target.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#6c757d';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Zurück zu Rechnungen
        </button>
      </div>

      {/* Invoice Information */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#1d426a', marginBottom: '1.5rem' }}>Rechnungsinformationen</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2.5rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Rechnungsnummer *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Rechnungsdatum *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Leistungszeitraum von *
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Leistungszeitraum bis *
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          color: '#1d426a',
          fontSize: '1.2rem',
          fontWeight: '500'
        }}>
          Rechnungsadresse
        </h3>
        
        <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {invoice.customer.company}
          </div>
          <div style={{ marginBottom: '4px' }}>
            {invoice.customer.billing_street || invoice.customer.street}
          </div>
          <div>
            {invoice.customer.billing_location || invoice.customer.location}, {invoice.customer.billing_country || invoice.customer.country}
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#1d426a', margin: 0 }}>Rechnungspositionen ({invoiceItems.length + manualItems.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Sorting Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Sortieren nach:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="datum">Datum</option>
                <option value="filiale">Filiale</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <button
              onClick={() => {
                setManualItemType('positive');
                setShowManualItemModal(true);
              }}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              + Position
            </button>
            <button
              onClick={() => {
                setManualItemType('negative');
                setShowManualItemModal(true);
              }}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              - Gutschrift
            </button>
          </div>
        </div>

        {/* Detailed breakdown table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Datum</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Kommission</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Beschreibung</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Filiale</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Reparatur</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Porto</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Gesamt</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {/* Existing invoice items */}
            {invoiceItems
              .sort((a, b) => {
                if (sortBy === 'datum') {
                  // Sort by date, then by filiale for same dates
                  const dateA = new Date(a.date_performed || 0);
                  const dateB = new Date(b.date_performed || 0);
                  if (dateA.getTime() !== dateB.getTime()) {
                    return sortOrder === 'asc' 
                      ? dateA.getTime() - dateB.getTime() // Oldest first
                      : dateB.getTime() - dateA.getTime(); // Newest first
                  }
                  // Same date: sort by filiale
                  const filialeA = a.repair_order?.customers?.branch || '';
                  const filialeB = b.repair_order?.customers?.branch || '';
                  return filialeA.localeCompare(filialeB);
                } else if (sortBy === 'filiale') {
                  // Sort by filiale, then by date for same filiales
                  const filialeA = a.repair_order?.customers?.branch || '';
                  const filialeB = b.repair_order?.customers?.branch || '';
                  if (filialeA !== filialeB) {
                    return filialeA.localeCompare(filialeB);
                  }
                  // Same filiale: sort by date
                  const dateA = new Date(a.date_performed || 0);
                  const dateB = new Date(b.date_performed || 0);
                  return sortOrder === 'asc' 
                    ? dateA.getTime() - dateB.getTime() // Oldest first
                    : dateB.getTime() - dateA.getTime(); // Newest first
                }
                return 0;
              })
              .map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                  {item.date_performed ? new Date(item.date_performed).toLocaleDateString('de-DE') : '-'}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
                  {item.kommission}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                  {(() => {
                    // Use the same logic as getRepairDescription for consistency
                    const order = item.repair_order;
                    if (!order) return item.description;
                    
                    // Check for KV repair or kostenpflichtige Reparatur - always "einzelne Positionen"
                    if (order.freigabe === 'Reparatur laut KV durchführen' || order.freigabe === 'Kostenpflichtige Reparatur') {
                      return 'einzelne Positionen';
                    }
                    
                    // Check for specific status - just the word, no date or extra text
                    if (order.freigabe === 'Garantie') {
                      return 'Garantie';
                    }
                    if (order.freigabe === 'Reklamation') {
                      return 'Reklamation';
                    }
                    if (order.freigabe === 'Unrepariert zurückschicken') {
                      return 'Unrepariert zurück';
                    }
                    if (order.freigabe === 'Verschrotten') {
                      return 'Verschrotten';
                    }
                    
                    // Check for Kulanz - just "Kulanz"
                    if (order.kulanz) {
                      return 'Kulanz';
                    }
                    
                    // Default fallback
                    return item.description;
                  })()}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                  {item.filiale}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
                  {item.repair_amount?.toFixed(2)}€
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                  {item.porto?.toFixed(2)}€
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center', fontWeight: '600', color: '#1d426a' }}>
                  {item.line_total?.toFixed(2)}€
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleRemoveRepairOrder(item.repair_order_id)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            
            {/* Manual items */}
            {manualItems.map((item, index) => (
              <tr key={`manual-${item.id}`} style={{ 
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: item.type === 'positive' ? '#f8f9fa' : '#fff5f5'
              }}>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', fontSize: '14px', fontStyle: 'italic', textAlign: 'center' }}>
                  {item.description}
                </td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>-</td>
                <td style={{ 
                  padding: '12px', 
                  fontSize: '14px', 
                  textAlign: 'center', 
                  fontWeight: '600',
                  color: item.type === 'positive' ? '#28a745' : '#dc3545'
                }}>
                  {item.type === 'positive' ? '+' : '-'}{item.amount}€
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleRemoveManualItem(item.id)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add repair order section */}
        {availableOrders.length > 0 && (
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '1rem',
            marginTop: '1rem',
            backgroundColor: '#f8f9fa'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1d426a' }}>Verfügbare Reparaturaufträge hinzufügen</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {availableOrders.slice(0, 10).map(order => (
                <div key={order.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderBottom: '1px solid #e0e0e0',
                  fontSize: '14px'
                }}>
                  <div>
                    <strong>{order.kommission}</strong> - {order.customers?.company} - {order.nettopreis?.toFixed(2)}€
                  </div>
                  <button
                    onClick={() => handleAddRepairOrder(order)}
                    style={{
                      background: '#1d426a',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Hinzufügen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Item Modal */}
      {showManualItemModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1d426a' }}>
              {manualItemType === 'positive' ? 'Position hinzufügen' : 'Gutschrift hinzufügen'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Beschreibung *
              </label>
              <input
                type="text"
                value={manualItemForm.description}
                onChange={(e) => setManualItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="z.B. Zusätzliche Beratung"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Betrag (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualItemForm.amount}
                onChange={(e) => setManualItemForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowManualItemModal(false);
                  setManualItemForm({ description: '', amount: '' });
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddManualItem}
                disabled={!manualItemForm.description.trim() || !manualItemForm.amount.trim()}
                style={{
                  background: manualItemType === 'positive' ? '#28a745' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: manualItemForm.description.trim() && manualItemForm.amount.trim() ? 'pointer' : 'not-allowed',
                  opacity: manualItemForm.description.trim() && manualItemForm.amount.trim() ? 1 : 0.6
                }}
              >
                {manualItemType === 'positive' ? 'Position hinzufügen' : 'Gutschrift hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'flex-end',
        marginTop: '2rem'
      }}>
        <button
          onClick={() => navigate('/erstellte-rechnungen')}
          disabled={saving}
          style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.target.style.background = '#5a6268';
              e.target.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.target.style.background = '#6c757d';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          Zurück zu Rechnungen
        </button>

        {/* Reset to Draft button - only show for sent invoices */}
        {invoice?.status === 'sent' && (
          <button
            onClick={handleResetToDraft}
            disabled={saving}
            style={{
              background: '#ffc107',
              color: '#212529',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.background = '#e0a800';
                e.target.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.background = '#ffc107';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            Als Entwurf zurücksetzen
          </button>
        )}

        <button
          onClick={handlePDFExport}
          disabled={saving}
          style={{
            background: '#1d426a',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.target.style.background = '#16365a';
              e.target.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.target.style.background = '#1d426a';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          PDF Export
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#1d426a',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.target.style.background = '#16365a';
              e.target.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.target.style.background = '#1d426a';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          {saving ? 'Speichern...' : 'Änderungen speichern'}
        </button>
      </div>
    </div>
  );
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
  const [kvMethod, setKvMethod] = useState('keine Angabe');
  const [kvFreigabeDate, setKvFreigabeDate] = useState('');
  const [fehler, setFehler] = useState({});
  const [arbeiten, setArbeiten] = useState({});
  const [arbeitenManual, setArbeitenManual] = useState({});
  const [kulanz, setKulanz] = useState(false);
  const [reklamationDate, setReklamationDate] = useState('');
  const [garantieDate, setGarantieDate] = useState('');
  const [kulanzPorto, setKulanzPorto] = useState('ja');
  const [manualPorto, setManualPorto] = useState('');
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
  const [austriaArbeitszeit, setAustriaArbeitszeit] = useState('26'); // '26' or '22'
  
  // State for "Alle 5 standard Arbeitspositionen anwählen" checkbox
  const [selectAllStandard, setSelectAllStandard] = useState(false);
  
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
    country: 'DE',
    contact_person: '',
    billing_street: '',
    billing_location: '',
    billing_country: 'DE'
  });

  // Edit Repair Order State
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  


  // Logic for disabling all fields if not 'Keine angabe' or 'Reparatur laut KV durchführen' or 'Kostenpflichtige Reparatur'
  const isDisabled = (freigabe !== 'Keine angabe' && freigabe !== 'Reparatur laut KV durchführen' && freigabe !== 'Kostenpflichtige Reparatur') || kulanz;
  const hideFields = isDisabled;

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
    setKvMethod('keine Angabe');
    setKvFreigabeDate('');
    setFehler({});
    setKulanz(false);
    setReklamationDate('');
    setGarantieDate('');
    setKulanzPorto('ja');
    setManualPorto('');
    setIdoHdo('IDO');
    setAustriaArbeitszeit('26');
    setSelectAllStandard(false);
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
      setKvMethod(order.kv_method || 'keine Angabe');
      setKvFreigabeDate(order.kv_date_freigabe || '');
      setKulanz(order.kulanz || false);
      setReklamationDate(order.reklamation_date || '');
      setGarantieDate(order.garantie_date || '');
      setKulanzPorto(order.kulanz_porto || 'ja');
      setManualPorto(order.manual_porto || '');
      setIdoHdo(order.ido_hdo || 'IDO');
      setAustriaArbeitszeit(order.austria_arbeitszeit || '26');
      
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
        
        // Check if all 5 standard services are selected and update selectAllStandard accordingly
        const standardServices = ['fehlerdiagnose', 'reinigung', 'kleinmaterial', 'arbeitszeit', 'endkontrolle'];
        const allStandardSelected = standardServices.every(service => newArbeiten[service] === true);
        setSelectAllStandard(allStandardSelected);
      } else {
        // No arbeiten data, so selectAllStandard should be false
        setSelectAllStandard(false);
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
  const handleFreigabe = (val) => {
    setFreigabe(val);
    
    // If switching from Garantie/Reklamation to Keine angabe, recalculate prices
    if ((freigabe === 'Garantie' || freigabe === 'Reklamation') && val === 'Keine angabe') {
      // The net calculation will automatically recalculate when the component re-renders
      // because the freigabe state change triggers a re-render
    }
  };
  const handleFehler = (key) => setFehler((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleArbeiten = (key) => {
    setArbeiten((prev) => {
      const newValue = !prev[key];
      const newArbeiten = { ...prev, [key]: newValue };
      
      // Check if this is one of the 5 standard services and it's being unchecked
      const standardServices = ['fehlerdiagnose', 'reinigung', 'kleinmaterial', 'arbeitszeit', 'endkontrolle'];
      if (standardServices.includes(key) && !newValue) {
        // If any standard service is unchecked, uncheck the "alle 5 standard" checkbox
        setSelectAllStandard(false);
      }
      
      return newArbeiten;
    });
  };
  const handleArbeitenManual = (key, value) => {
    value = value.replace(/[^0-9,]/g, '');
    value = value.replace(/(,.*),/g, '$1');
    setArbeitenManual((prev) => ({ ...prev, [key]: value }));
  };
  const handleKulanz = (checked) => {
    setKulanz(checked);
    if (!checked) setKulanzPorto('ja');
  };
  
  // Reset Austria option if country changes from AT to something else
  useEffect(() => {
    if (kulanzPorto === 'austria' && country !== 'AT') {
      setKulanzPorto('ja');
    }
  }, [country, kulanzPorto]);
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
          contact_person: '',
          billing_street: newAkustiker.billing_street,
          billing_location: newAkustiker.billing_location,
          billing_country: newAkustiker.billing_country === 'DE' ? 'Deutschland' : 'Österreich'
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
        country: 'DE',
        contact_person: '',
        billing_street: '',
        billing_location: '',
        billing_country: 'DE'
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
        kv_method: kvMethod || 'keine Angabe',
        kv_date_freigabe: kvFreigabeDate || null,
        kulanz: kulanz || false,
        reklamation_date: reklamationDate || null,
        garantie_date: garantieDate || null,
        kulanz_porto: kulanzPorto || 'ja',
        manual_porto: manualPorto || '',
        ido_hdo: idoHdo || 'IDO',
        austria_arbeitszeit: austriaArbeitszeit || '26',
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
      
      // Navigate back to repair orders overview after save (both new and edit)
      navigate('/erstellte-reperaturauftrage');
      
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
  
  // Handler for "Alle 5 standard Arbeitspositionen anwählen"
  const handleSelectAllStandard = (checked) => {
    setSelectAllStandard(checked);
    
    const standardServices = ['fehlerdiagnose', 'reinigung', 'kleinmaterial', 'arbeitszeit', 'endkontrolle'];
    const newArbeiten = { ...arbeiten };
    
    standardServices.forEach(service => {
      newArbeiten[service] = checked; // Set to checked (true) or unchecked (false)
    });
    
    setArbeiten(newArbeiten);
  };

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
    } else if (idoHdo === 'SCHWIERIG') {
      arbeitszeit = 32.0;
    }
  }
  
  // Apply Austrian arbeitszeit selection
  if (country === 'AT') {
    arbeitszeit = parseFloat(austriaArbeitszeit) || 26.0;
  }

  // Apply Porto toggle for all procedure types
  if (kulanzPorto === 'nein') {
    porto = 0;
  } else if (kulanzPorto === 'austria' && country === 'AT') {
    porto = 14.90; // Special Austrian rate (only for Austria)
  } else if (kulanzPorto === 'manual' && manualPorto) {
    porto = parseFloat(manualPorto) || 0; // Manual porto amount
  }

  if (freigabe === 'Unrepariert zurückschicken') {
    net = 14.50;
    // Keep porto calculation from country settings - don't override to 0
  } else if (freigabe === 'Verschrotten') {
    net = 0;
    porto = 0;
  } else if (freigabe === 'Garantie' || freigabe === 'Reklamation') {
    // For Garantie and Reklamation, keep checkboxes checked but set net to 0
    net = 0;
    // Keep porto calculation from country settings
  } else if (!kulanz) {
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
  } else if (kulanz) {
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



      

      
      const repWerkstattNotiz = leftX+108
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
        const gesendetanwerkstattX = leftX+139;
        const gesendetanwerkstattY = customerInfo;

                // Workshop Date Section (Top Right)
                if (werkstattDate) {
                  doc.setFontSize(8);
                  doc.setFont(undefined, 'bold');
                  doc.text('Sendedatum:', gesendetanwerkstattX, gesendetanwerkstattY);
                  doc.setFont(undefined, 'normal');
                  
                  // Format date as DD.MM.YYYY
                  const [yyyy, mm, dd] = werkstattDate.split('-');
                  doc.setFontSize(10);
                  doc.text(`${dd}.${mm}.${yyyy}`, gesendetanwerkstattX +17, gesendetanwerkstattY);
                }

                // Werkstattausgang Section (Top Right)
                const werkstattausgangY = 265;
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
      
      // For "Reparatur laut KV durchführen", show method and date if selected and not "keine Angabe"
      if (opt === 'Reparatur laut KV durchführen' && checked && kvMethod && kvMethod !== 'keine Angabe' && kvFreigabeDate) {
        const formattedDate = new Date(kvFreigabeDate).toLocaleDateString('de-DE');
        doc.text(`${opt} -  ${kvMethod} am ${formattedDate}`, leftX + 8, yLeft);
      } else if (opt === 'Garantie' && checked && garantieDate) {
        const formattedDate = new Date(garantieDate).toLocaleDateString('de-DE');
        doc.text(`${opt} auf Reparatur von ${formattedDate}`, leftX + 8, yLeft);
      } else if (opt === 'Reklamation' && checked && reklamationDate) {
        const formattedDate = new Date(reklamationDate).toLocaleDateString('de-DE');
        doc.text(`${opt} auf Reparatur von ${formattedDate}`, leftX + 8, yLeft);
      } else {
      doc.text(opt, leftX + 8, yLeft);
      }
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

    var verfahrenY = 250;
    doc.setFont(undefined, 'bold');
    doc.text('Kulanz:', leftX, verfahrenY);
    doc.setFont(undefined, 'normal');
    verfahrenY += linePad + 1;
    // Kulanz checkbox
    drawCheckbox(doc, leftX + 1, verfahrenY - 3.5, kulanz);
    doc.text('Kulanz', leftX + 8, verfahrenY);
    verfahrenY += linePad;
    
    if (kulanz) {
      verfahrenY += 1;
      drawCheckbox(doc, leftX + 10, verfahrenY - 3.5, kulanzPorto === 'ja');
      doc.text('Porto ja', leftX + 16, verfahrenY);
      drawCheckbox(doc, leftX + 38, verfahrenY - 3.5, kulanzPorto === 'nein');
      doc.text('Porto nein', leftX + 44, verfahrenY);
      
      // Only show Austria option if country is AT
      if (country === 'AT') {
        drawCheckbox(doc, leftX + 70, verfahrenY - 3.5, kulanzPorto === 'austria');
        doc.text('Porto 14,90€', leftX + 76, verfahrenY);
      }
      
      // Manual porto option
      const manualPortoX = country === 'AT' ? leftX + 105 : leftX + 70;
      const manualPortoTextX = country === 'AT' ? leftX + 111 : leftX + 76;
      drawCheckbox(doc, manualPortoX, verfahrenY - 3.5, kulanzPorto === 'manual');
      const manualPortoText = kulanzPorto === 'manual' && manualPorto ? 
        `Porto ${parseFloat(manualPorto).toFixed(2).replace('.', ',')}€` : 
        'Porto manuell';
      doc.text(manualPortoText, manualPortoTextX, verfahrenY);
      
      verfahrenY += linePad;
    }
    
    // Adjust Y position for subsequent sections based on whether Kulanz Porto options are shown
    const kulanzYAdjustment = kulanz ? linePad * 2 : 0; // Add extra space if Kulanz Porto options are shown
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
        if (!kulanz) {
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
      const notizenY = pricingY + 15; // Position below pricing
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Notizen:', leftX, notizenY+2);
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
        <Route path="/rechnung-erstellen" element={<RechnungErstellenPage />} />
        <Route path="/rechnung-bearbeiten/:id" element={<RechnungBearbeitenPage />} />
        <Route path="/erstellte-rechnungen" element={<ErstellteRechnungenPage />} />
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
                <div key={opt} style={{ marginBottom: 4, textAlign: 'left' }}>
                  <label style={{ display: 'block', marginBottom: '4px' }}>
                    <input type="radio" name="freigabe" checked={freigabe === opt} onChange={() => handleFreigabe(opt)} />
                    <span style={{ marginLeft: '8px' }}>{opt}</span>
                </label>
                  {opt === 'Reparatur laut KV durchführen' && freigabe === opt && (
                    <div style={{ 
                      marginLeft: '24px', 
                      marginTop: '8px',
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', minWidth: '30px' }}>per:</span>
                        <select 
                          value={kvMethod} 
                          onChange={(e) => {
                            setKvMethod(e.target.value);
                            if (e.target.value === 'keine Angabe') {
                              setKvFreigabeDate('');
                            }
                          }}
                          style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc',
                            fontSize: '14px',
                            minWidth: '100px'
                          }}
                        >
                          <option value="keine Angabe">keine Angabe</option>
                          <option value="Mail">Mail</option>
                          <option value="Tel">Tel</option>
                          <option value="Fax">Fax</option>
                          <option value="Brief">Brief</option>
                        </select>
                      </div>
                      {kvMethod !== 'keine Angabe' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', minWidth: '30px' }}>am:</span>
                          <input 
                            type="date" 
                            value={kvFreigabeDate}
                            onChange={(e) => setKvFreigabeDate(e.target.value)}
                            style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              border: '1px solid #ccc',
                              fontSize: '14px',
                              minWidth: '140px'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {opt === 'Garantie' && freigabe === opt && (
                    <div style={{ 
                      marginLeft: '24px', 
                      marginTop: '8px',
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '14px' }}>auf Reparatur von:</span>
                      <input 
                        type="date" 
                        value={garantieDate}
                        onChange={(e) => setGarantieDate(e.target.value)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          minWidth: '140px'
                        }}
                      />
                    </div>
                  )}
                  {opt === 'Reklamation' && freigabe === opt && (
                    <div style={{ 
                      marginLeft: '24px', 
                      marginTop: '8px',
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '14px' }}>auf Reparatur von:</span>
                      <input 
                        type="date" 
                        value={reklamationDate}
                        onChange={(e) => setReklamationDate(e.target.value)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          minWidth: '140px'
                        }}
                      />
                    </div>
                  )}
                </div>
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
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Kulanz:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', alignItems: 'flex-start' }}>
                <label>
                  <input type="checkbox" checked={kulanz} onChange={(e) => handleKulanz(e.target.checked)} /> Kulanz
                </label>
                <div style={{ marginLeft: 24, marginTop: 4, opacity: kulanz ? 1 : 0.5, pointerEvents: kulanz ? 'auto' : 'none' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                <label>
                      <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'ja'} disabled={!kulanz} onChange={() => handleKulanzPorto('ja')} /> Porto ja
                </label>
                <label>
                      <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'nein'} disabled={!kulanz} onChange={() => handleKulanzPorto('nein')} /> Porto nein
                </label>
                    {country === 'AT' && (
                  <label>
                        <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'austria'} disabled={!kulanz} onChange={() => handleKulanzPorto('austria')} /> Porto 14,90€
                      </label>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'manual'} disabled={!kulanz} onChange={() => handleKulanzPorto('manual')} /> Porto manuell:
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualPorto}
                        onChange={(e) => setManualPorto(e.target.value)}
                        disabled={kulanzPorto !== 'manual' || !kulanz}
                        placeholder="0,00"
                        style={{
                          width: '60px',
                          padding: '2px 4px',
                          border: '1px solid #e1e5e9',
                          borderRadius: '4px',
                          fontSize: '12px',
                          opacity: kulanzPorto === 'manual' && kulanz ? 1 : 0.5
                        }}
                      />€
                  </label>
                </div>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="idoHdo" 
                      checked={idoHdo === 'SCHWIERIG'} 
                      onChange={() => handleIdoHdo('SCHWIERIG')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}>Schwierige Fälle (32,00 €)</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Austrian Arbeitszeit Selection - Only for Austria */}
            {country === 'AT' && (
              <div style={boxStyle}>
                <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Arbeitszeit Typ (Österreich):</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="austriaArbeitszeit" 
                      checked={austriaArbeitszeit === '22'} 
                      onChange={() => setAustriaArbeitszeit('22')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}> 22,00 €</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="austriaArbeitszeit" 
                      checked={austriaArbeitszeit === '26'} 
                      onChange={() => setAustriaArbeitszeit('26')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}> 26,00 €</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Alle 5 standard Arbeitspositionen anwählen */}
            <div style={boxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectAllStandard}
                    onChange={(e) => handleSelectAllStandard(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Alle 5 standard Arbeitspositionen anwählen</span>
                </label>
                <div 
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#1d426a',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 'bold',
                    cursor: 'help',
                    position: 'relative'
                  }}
                  title="Fehlerdiagnose (3,50€) • Reinigung (5,00€) • Kleinmaterial (2,00€) • Arbeitszeit (je nach Typ) • Endkontrolle (3,00€)"
                >
                  i
                </div>
              </div>
            </div>
            
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
                    <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 16, textAlign: 'left', minHeight: 36 }}>
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
                            disabled={!checked || isDisabled || kulanz}
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
              <div style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
                {country === 'AT' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="radio" 
                      name="portoToggle" 
                      checked={kulanzPorto === 'austria'} 
                      onChange={() => handleKulanzPorto('austria')}
                      style={{ margin: 0 }}
                    /> 
                    <span style={{ fontSize: 14 }}>Porto 14,90€</span>
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input 
                    type="radio" 
                    name="portoToggle" 
                    checked={kulanzPorto === 'manual'} 
                    onChange={() => handleKulanzPorto('manual')}
                    style={{ margin: 0 }}
                  /> 
                  <span style={{ fontSize: 14 }}>Porto manuell:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualPorto}
                    onChange={(e) => setManualPorto(e.target.value)}
                    disabled={kulanzPorto !== 'manual'}
                    placeholder="0,00"
                    style={{
                      width: '70px',
                      padding: '4px 6px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      fontSize: '14px',
                      opacity: kulanzPorto === 'manual' ? 1 : 0.5
                    }}
                  />
                  <span style={{ fontSize: 14 }}>€</span>
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

