/** Matching between imported contacts and customers (Akustiker). */

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@.+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return norm(s)
    .split(' ')
    .filter((t) => t.length >= 3 && !['kv', 'adresse', 're', 'rechnung', 'und', 'aus', 'frau', 'herr', 'gmbh', 'mail'].includes(t));
}

function scorePair(contact, customer) {
  let score = 0;
  const reasons = [];

  const cEmail = norm(contact.email);
  const custEmail = norm(customer.email);
  if (cEmail && custEmail && cEmail === custEmail) {
    score += 100;
    reasons.push('E-Mail identisch');
  }

  const cName = norm(contact.display_name || contact.company || contact.filename_hint);
  const company = norm(customer.company);
  const branch = norm(customer.branch);
  const location = norm(customer.location);
  const contactPerson = norm(customer.contact_person);
  const street = norm(customer.street);

  if (company && cName.includes(company) && company.length >= 4) {
    score += 45;
    reasons.push('Firmenname im Kontakt');
  } else if (company && company.includes(cName) && cName.length >= 4) {
    score += 35;
    reasons.push('Kontaktname in Firma');
  }

  const cTokens = tokens(cName + ' ' + (contact.filename_hint || ''));
  const custBlob = `${company} ${branch} ${location} ${contactPerson} ${street}`;
  let tokenHits = 0;
  for (const t of cTokens) {
    if (custBlob.includes(t)) tokenHits += 1;
  }
  if (tokenHits >= 2) {
    score += 20 + Math.min(tokenHits * 5, 25);
    reasons.push(`${tokenHits} Namens-Treffer`);
  } else if (tokenHits === 1) {
    score += 10;
    reasons.push('1 Namens-Treffer');
  }

  if (location && cName.includes(location) && location.length >= 4) {
    score += 15;
    reasons.push('Ort passt');
  }
  if (branch && cName.includes(branch) && branch.length >= 3) {
    score += 12;
    reasons.push('Filiale passt');
  }

  // domain hint e.g. info@brillen-mueller.com vs company Brillen Müller
  if (cEmail.includes('@')) {
    const domain = cEmail.split('@')[1].split('.')[0];
    if (domain.length >= 4 && (company.includes(domain.replace(/-/g, ' ')) || tokens(company).some((t) => domain.includes(t)))) {
      score += 18;
      reasons.push('E-Mail-Domain ähnlich Firma');
    }
  }

  return { score, reasons };
}

export function findMatches(contacts, customers, { minScore = 25 } = {}) {
  const matches = [];
  for (const contact of contacts) {
    if (!contact.email || contact.merged_customer_id || contact.dismissed) continue;
    let best = null;
    for (const customer of customers) {
      if (customer.archived) continue;
      const { score, reasons } = scorePair(contact, customer);
      if (score < minScore) continue;
      if (!best || score > best.score) {
        best = { contact, customer, score, reasons };
      }
    }
    if (best) matches.push(best);
  }
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

export function matchQuality(score) {
  if (score >= 70) return { label: 'sehr genau', color: '#15803d' };
  if (score >= 40) return { label: 'gut', color: '#ca8a04' };
  return { label: 'möglich', color: '#ea580c' };
}
