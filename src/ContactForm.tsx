import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function ContactForm({ partnership = false }: { partnership?: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setState('sending');
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, kind: partnership ? 'partnership' : 'contact', startedAt }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Your inquiry could not be sent. Please try again shortly.');
      }
      setState('sent'); form.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your inquiry could not be sent.'); setState('error'); }
  }
  return <form className="contact-form" onSubmit={submit} aria-label={partnership ? 'Request Partnership Information' : 'Contact Give Holidays'}>
    <div className="form-grid">
      {partnership && <><label>Hotel / Resort Name *<input name="propertyName" required maxLength={160} autoComplete="organization" /></label><label>Property Website *<input name="website" type="url" required maxLength={500} placeholder="https://" /></label></>}
      <label>{partnership ? 'Contact Name' : 'Full Name'} *<input name="name" required maxLength={120} placeholder="Your full name" autoComplete="name" /></label>
      <label>{partnership ? 'Job Title' : 'Organization / Company'} *<input name={partnership ? 'jobTitle' : 'organization'} required maxLength={160} placeholder={partnership ? 'Your job title' : 'Organization or company'} autoComplete={partnership ? 'organization-title' : 'organization'} /></label>
      <label>{partnership ? 'Business Email' : 'Email Address'} *<input name="email" type="email" required maxLength={254} placeholder="you@organization.com" autoComplete="email" /></label>
      <label>Phone Number {partnership ? '*' : '(optional)'}<input name="phone" type="tel" required={partnership} maxLength={50} placeholder="Your phone number" autoComplete="tel" /></label>
    </div>
      {!partnership && <label>I'm Contacting You About *<select name="inquiryType" required defaultValue=""><option value="" disabled>Please select an inquiry type</option><option>Nonprofit Partnership</option><option>Hotel / Supplier Partnership</option><option>Existing Travel Package</option><option>General Inquiry</option></select></label>}
      <label>Message {partnership ? '(optional)' : '*'}<textarea name="message" required={!partnership} minLength={partnership ? undefined : 10} maxLength={5000} placeholder="Tell us a little about how we can help." rows={5} /></label>
      <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input name="companyUrl" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="form-notice">We'll use your information to respond to your inquiry. Read our <a href="/privacy-policy">Privacy Policy</a>.</p>
    <button className="button primary submit-button" type="submit" disabled={state === 'sending' || state === 'sent'}>{state === 'sending' ? 'Sending…' : state === 'sent' ? 'Inquiry Sent' : 'Send Inquiry'}<ArrowRight size={17} aria-hidden="true" /></button>
    <div role="status" aria-live="polite">{state === 'sent' && <p className="form-feedback">Thank you. Your inquiry has been received.</p>}{state === 'error' && <p className="form-feedback form-error">{error}</p>}</div>
  </form>;
}
