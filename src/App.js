import React, { useState, useEffect } from 'react';
import './App.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COUNTRY_OPTIONS = [
  { key: 'DE', label: 'Deutschland', arbeitszeit: 22.0, porto: 5.95 },
  { key: 'AT', label: 'Österreich', arbeitszeit: 26.0, porto: 9.0 },
];

const FREIGABE_OPTIONS = [
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [country, setCountry] = useState('DE');
  const [freigabe, setFreigabe] = useState('Reparatur laut KV durchführen');
  const [fehler, setFehler] = useState({});
  const [arbeiten, setArbeiten] = useState({});
  const [arbeitenManual, setArbeitenManual] = useState({});
  const [bottom, setBottom] = useState('kostenpflichtig');
  const [reklamationDate, setReklamationDate] = useState('');
  const [kulanzPorto, setKulanzPorto] = useState('ja');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Logic for disabling all fields if not 'Reparatur laut KV durchführen' or if Verfahren disables fields
  const verfahrenDisables = bottom === 'garantie' || bottom === 'reklamation' || bottom === 'kulanz';
  const isDisabled = freigabe !== 'Reparatur laut KV durchführen' || verfahrenDisables;
  const hideFields = isDisabled || verfahrenDisables;

  // Reset handler
  const handleReset = () => {
    setArbeiten({});
    setArbeitenManual({});
  };

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

  // Customer handlers
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSelectedCompany(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setShowCompanyDropdown(false);
    setShowBranchDropdown(false);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setSelectedCustomer(null);
    setShowCompanyDropdown(false);
    setShowBranchDropdown(true);
  };

  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    setShowCompanyDropdown(true);
    setShowBranchDropdown(false);
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

  // Filter companies based on search
  const filteredCompanies = companies.filter(company => {
    if (!customerSearch.trim()) return true;
    return company.name.toLowerCase().includes(customerSearch.toLowerCase());
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
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        // Load all customers from the database
        const response = await fetch('/api/customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        } else {
          // Fallback to hardcoded data for now
          const fallbackCustomers = [
            {
              id: '1',
              branch: 'Altes Land Hörgeräte',
              company: 'Hörgeräte Altes Land',
              contact_person: 'Nina Bastein',
              street: 'Hinterstr. 14a',
              location: '21723 Hollern-Twielenfleth',
              country: 'Deutschland'
            },
            {
              id: '2',
              branch: 'Hörgeräte Langer Ingolstadt (Am Westpark)',
              company: 'Hörgeräte LANGER GmbH & Co. KG',
              contact_person: '',
              street: 'Am Westpark 1',
              location: '85057 Ingolstadt',
              country: 'Deutschland'
            },
            {
              id: '3',
              branch: 'Ihr Ohr',
              company: 'Ihr Ohr',
              contact_person: 'Simone Weyand-Fink e.U.',
              street: 'Postgasse 13',
              location: '1010 Wien',
              country: 'Österreich'
            },
            {
              id: '4',
              branch: 'KUNO',
              company: 'KUNO',
              contact_person: 'Augenoptik und Hörakustik GmbH',
              street: 'Karlstr. 20-22',
              location: '74564 Crailsheim',
              country: 'Deutschland'
            },
            {
              id: '5',
              branch: 'Hörgeräte Langer Adelsheim',
              company: 'Hörgeräte LANGER GmbH & Co. KG',
              contact_person: '',
              street: 'Marktstraße 6',
              location: '74740 Adelsheim',
              country: 'Deutschland'
            },
            {
              id: '6',
              branch: 'Hörgeräte Langer Asperg',
              company: 'Hörgeräte LANGER GmbH & Co. KG',
              contact_person: '',
              street: 'Markgröninger Straße 14',
              location: '71679 Asperg',
              country: 'Deutschland'
            },
            {
              id: '7',
              branch: 'Hörgeräte Dölle',
              company: 'Hörgeräte Dölle',
              contact_person: 'Augenoptik und Hörakustik',
              street: 'Große Str. 50',
              location: '49565 Bramsche',
              country: 'Deutschland'
            },
            {
              id: '8',
              branch: 'Dölle Hörgeräte Mettingen',
              company: 'Hörgeräte Dölle',
              contact_person: 'Augenoptik und Hörakustik',
              street: 'Clemensstrasse 5b',
              location: '49497 Mettingen',
              country: 'Deutschland'
            },
            {
              id: '9',
              branch: 'Helgert & Rieger',
              company: 'Helgert & Rieger',
              contact_person: 'Hörgeräteakustik',
              street: 'Innerer Laufer Platz 6-8',
              location: '90403 Nürnberg',
              country: 'Deutschland'
            },
            {
              id: '10',
              branch: 'Hörberatung Nürnberg',
              company: 'Hörberatung',
              contact_person: '',
              street: 'Hallplatz 2, in der Mauthalle',
              location: '90402 Nürnberg',
              country: 'Deutschland'
            }
          ];
          setCustomers(fallbackCustomers);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        // Use fallback data on error
        const fallbackCustomers = [
          {
            id: '1',
            branch: 'Altes Land Hörgeräte',
            company: 'Hörgeräte Altes Land',
            contact_person: 'Nina Bastein',
            street: 'Hinterstr. 14a',
            location: '21723 Hollern-Twielenfleth',
            country: 'Deutschland'
          },
          {
            id: '2',
            branch: 'Hörgeräte Langer Ingolstadt (Am Westpark)',
            company: 'Hörgeräte LANGER GmbH & Co. KG',
            contact_person: '',
            street: 'Am Westpark 1',
            location: '85057 Ingolstadt',
            country: 'Deutschland'
          },
          {
            id: '3',
            branch: 'Ihr Ohr',
            company: 'Ihr Ohr',
            contact_person: 'Simone Weyand-Fink e.U.',
            street: 'Postgasse 13',
            location: '1010 Wien',
            country: 'Österreich'
          },
          {
            id: '4',
            branch: 'KUNO',
            company: 'KUNO',
            contact_person: 'Augenoptik und Hörakustik GmbH',
            street: 'Karlstr. 20-22',
            location: '74564 Crailsheim',
            country: 'Deutschland'
          },
          {
            id: '5',
            branch: 'Hörgeräte Langer Adelsheim',
            company: 'Hörgeräte LANGER GmbH & Co. KG',
            contact_person: '',
            street: 'Marktstraße 6',
            location: '74740 Adelsheim',
            country: 'Deutschland'
          },
          {
            id: '6',
            branch: 'Hörgeräte Langer Asperg',
            company: 'Hörgeräte LANGER GmbH & Co. KG',
            contact_person: '',
            street: 'Markgröninger Straße 14',
            location: '71679 Asperg',
            country: 'Deutschland'
          },
          {
            id: '7',
            branch: 'Hörgeräte Dölle',
            company: 'Hörgeräte Dölle',
            contact_person: 'Augenoptik und Hörakustik',
            street: 'Große Str. 50',
            location: '49565 Bramsche',
            country: 'Deutschland'
          },
          {
            id: '8',
            branch: 'Dölle Hörgeräte Mettingen',
            company: 'Hörgeräte Dölle',
            contact_person: 'Augenoptik und Hörakustik',
            street: 'Clemensstrasse 5b',
            location: '49497 Mettingen',
            country: 'Deutschland'
          },
          {
            id: '9',
            branch: 'Helgert & Rieger',
            company: 'Helgert & Rieger',
            contact_person: 'Hörgeräteakustik',
            street: 'Innerer Laufer Platz 6-8',
            location: '90403 Nürnberg',
            country: 'Deutschland'
          },
          {
            id: '10',
            branch: 'Hörberatung Nürnberg',
            company: 'Hörberatung',
            contact_person: '',
            street: 'Hallplatz 2, in der Mauthalle',
            location: '90402 Nürnberg',
            country: 'Deutschland'
          }
        ];
        setCustomers(fallbackCustomers);
      }
    };

    loadCustomers();
  }, []);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'Fa.Gretzinger@t-online.de' && loginPassword === 'GretBrunn2025!') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Ungültige Anmeldedaten');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
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
                  width: 'calc(100% - 32px)',
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
                  width: 'calc(100% - 32px)',
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
    net += porto;
  } else if (bottom === 'garantie' || bottom === 'reklamation') {
    net = 0;
    porto = 0;
  } else if (bottom === 'kulanz') {
    net = 0;
    if (kulanzPorto === 'nein') porto = 0;
  }

  // PDF Export function
  const handlePdfExport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    // Header
    doc.setFont('helvetica', '');
    doc.setFontSize(10);
    doc.text('HG Gretzinger UG, Hörgeräteservice', 10, 12);
    doc.text('Gibitzenhofstr. 86', 10, 17);
    doc.text('90443 Nürnberg', 10, 22);
    doc.text('Homepage: www.Fa-Gretzinger.de', 10, 27);
    doc.text('E-Mail: Fa.Gretzinger@t-online.de', 10, 32);
    doc.text('Tel. +49 (0)911 / 540 49 44, Fax.: 540 49 46', 10, 37);
    doc.addImage('https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png', 'PNG', 155, 8, 35, 16);
    doc.setLineWidth(0.3);
    doc.line(10, 40, 200, 40);

    // Customer Information Section
    if (selectedCustomer) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Akustikername / Absender bzw. Firmenstempel:', 10, 45);
      doc.setFont(undefined, 'normal');
      doc.text(selectedCustomer.branch !== selectedCustomer.company ? `${selectedCustomer.company} - ${selectedCustomer.branch}` : selectedCustomer.company, 10, 50);
      doc.text(selectedCustomer.street, 10, 55);
      doc.text(`${selectedCustomer.location}, ${selectedCustomer.country}`, 10, 60);
    }

    // Title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Reparaturauftrag', 105, 70, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    // More padding below title
    let y = 86;

    // Column positions
    const leftX = 14;
    const separatorX = 100; // move separator further right
    const rightX = separatorX + 4; // right column starts just after separator
    const priceColX = 190; // fixed X for right-aligned prices
    const sectionPad = 8;
    const linePad = 6;
    const labelPad = 8;

    // Left column: Freigabe, Fehlerangaben, Verfahren
    let yLeft = y;
    doc.setFont(undefined, 'bold');
    doc.text('Bei Freigabe bitte ankreuzen:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
    FREIGABE_OPTIONS.forEach(opt => {
      const checked = freigabe === opt;
      drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
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
      drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
      doc.text(f, leftX + 8, yLeft);
      yLeft += linePad - 1;
      if (idx === FEHLERANGABEN.length - 1) {
        yLeft += sectionPad;
      }
    });
    doc.setFont(undefined, 'bold');
    doc.text('Verfahren:', leftX, yLeft);
    doc.setFont(undefined, 'normal');
    yLeft += linePad + 1;
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
        drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
        doc.text(label, leftX + 8, yLeft);
        if (reklamationDate) {
          doc.text(`${dd}.${mm}.${yyyy}`, leftX + 8 + doc.getTextWidth(label) + 2, yLeft, { font: 'helvetica', fontStyle: 'bold' });
        }
        doc.setFont(undefined, 'normal');
      } else {
        drawCheckbox(doc, leftX + 2, yLeft - 3.5, checked);
        doc.text(label, leftX + 8, yLeft);
      }
      yLeft += linePad;
    });
    if (bottom === 'kulanz') {
      yLeft += 1;
      drawCheckbox(doc, leftX + 10, yLeft - 3.5, kulanzPorto === 'ja');
      doc.text('Porto ja', leftX + 16, yLeft);
      drawCheckbox(doc, leftX + 38, yLeft - 3.5, kulanzPorto === 'nein');
      doc.text('Porto nein', leftX + 44, yLeft);
      yLeft += linePad;
    }

    // Right column: Ausgeführte Arbeiten (true 3-column grid)
    let yRight = y;
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
    yRight += sectionPad;

    // Draw vertical line between columns (only after left grid finishes)
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(separatorX, y, separatorX, Math.max(yLeft, yRight) + 5);

    // Draw horizontal separator line below the grid
    const sepY = Math.max(yLeft, yRight) + 10;
    doc.line(10, sepY, 200, sepY);

    // Nettopreis & Porto below the new separator, right-aligned
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`Nettopreis: ${net.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 10, sepY + 10, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`+ Porto & Verpackung: ${porto.toFixed(2).replace('.', ',')} €`, rightX + 8 + maxLabelWidth + 10, sepY + 16, { align: 'right' });

    doc.save('reparaturauftrag.pdf');
  };

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
      onClick={() => {
        setShowCompanyDropdown(false);
        setShowBranchDropdown(false);
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', padding: '2rem 1rem 1rem 1rem', borderBottom: '1px solid #eee' }}>
        <img src="https://oag-media.b-cdn.net/fa-gretzinger/gretzinger-logo.png" alt="Gretzinger Logo" style={{ height: 80, marginRight: 24 }} />
        <h1 style={{ fontWeight: 400, color: '#1d426a', fontSize: '2rem', margin: 0 }}>Reparaturauftrag</h1>
      </header>
      
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
          <div style={{ fontWeight: 600, marginBottom: '1rem', color: '#1d426a' }}>
            Kunde auswählen:
          </div>
          
          {/* Company Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
              Firma auswählen:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="Firma suchen..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={() => setShowCompanyDropdown(true)}
              />
              
              {/* Company Dropdown */}
              {showCompanyDropdown && (
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
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {filteredCompanies.length > 0 ? (
                    <>
                      <div style={{ 
                        padding: '8px 16px', 
                        background: '#f8f9fa', 
                        borderBottom: '1px solid #e1e5e9',
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        {filteredCompanies.length} Firma{filteredCompanies.length !== 1 ? 'en' : ''} gefunden
                      </div>
                      {filteredCompanies.map((company, index) => (
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
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                      Keine Firmen gefunden
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Branch Selection (if company selected) */}
          {selectedCompany && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                Filiale auswählen:
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e5e9',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                >
                  {selectedCompany} ({selectedCompanyBranches.length} Filiale{selectedCompanyBranches.length !== 1 ? 'n' : ''})
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
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
              </div>
            </div>
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Verfahren:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', alignItems: 'flex-start' }}>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kostenpflichtig'} onChange={() => handleBottom('kostenpflichtig')} /> Kostenpflichtige Reparatur
                </label>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'garantie'} onChange={() => handleBottom('garantie')} disabled={freigabe !== 'Reparatur laut KV durchführen'} /> Garantie
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="radio" name="bottom" checked={bottom === 'reklamation'} onChange={() => handleBottom('reklamation')} disabled={freigabe !== 'Reparatur laut KV durchführen'} style={{ marginTop: 2 }} />
                    <span>Reklamation auf Reparatur von</span>
                  </label>
                  {bottom === 'reklamation' && (
                    <input type="date" value={reklamationDate} onChange={handleReklamationDate} style={{ fontSize: 15, marginLeft: 28, marginTop: 2 }} disabled={freigabe !== 'Reparatur laut KV durchführen'} />
                  )}
                </div>
                <label>
                  <input type="radio" name="bottom" checked={bottom === 'kulanz'} onChange={() => handleBottom('kulanz')} disabled={freigabe !== 'Reparatur laut KV durchführen'} /> Kulanz
                </label>
                <div style={{ marginLeft: 24, marginTop: 4, opacity: bottom === 'kulanz' && freigabe === 'Reparatur laut KV durchführen' ? 1 : 0.5, pointerEvents: bottom === 'kulanz' && freigabe === 'Reparatur laut KV durchführen' ? 'auto' : 'none' }}>
                  <label style={{ marginRight: 16 }}>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'ja'} disabled={bottom !== 'kulanz' || freigabe !== 'Reparatur laut KV durchführen'} onChange={() => handleKulanzPorto('ja')} /> Porto ja
                  </label>
                  <label>
                    <input type="radio" name="kulanzPorto" checked={kulanzPorto === 'nein'} disabled={bottom !== 'kulanz' || freigabe !== 'Reparatur laut KV durchführen'} onChange={() => handleKulanzPorto('nein')} /> Porto nein
                  </label>
                </div>
              </div>
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
            <div style={boxStyle}>
              <div style={{ fontWeight: 600, marginBottom: 8, textAlign: 'left' }}>Ausgeführte Arbeiten:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'max-content max-content', gridTemplateRows: 'max-content max-content', justifyContent: 'end', alignItems: 'center', gap: '0 32px' }}>
                
              <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 1, gridRow: 1 }}>
                  + Porto & Verpackung:
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#222', textAlign: 'right', gridColumn: 2, gridRow: 1 }}>
                  {porto.toFixed(2).replace('.', ',')} €
                </div>
                
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 1, gridRow: 2 }}>
                  Nettopreis:
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1d426a', textAlign: 'right', gridColumn: 2, gridRow: 2 }}>
                  {net.toFixed(2).replace('.', ',')} €
                </div>

              </div>
            </div>
          </div>
        </form>
        {/* Bottom row: PDF Export button right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{ padding: '8px 18px', fontSize: 15, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Abmelden
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
  );
}

export default App;
