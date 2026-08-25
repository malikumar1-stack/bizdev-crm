import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IClient, IUser, RelationshipStatus, Priority } from '../../types';
import { api } from '../../services/api';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: IClient | null;
  onSaved: () => void;
  usersList?: IUser[];
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSaved,
  usersList = []
}) => {
  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Primary Contact fields
  const [contactPerson, setContactPerson] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Client Relationship & Operational fields
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('LEAD');
  const [clientType, setClientType] = useState('Corporate');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [leadSource, setLeadSource] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setCompanyName(clientToEdit.company?.name || '');
      setIndustry(clientToEdit.company?.industry || '');
      setWebsite(clientToEdit.company?.website || '');
      setAddress(clientToEdit.company?.address || '');
      setCity(clientToEdit.company?.city || '');
      setCountry(clientToEdit.company?.country || '');
      setCompanyPhone(clientToEdit.company?.phone || '');

      setContactPerson(clientToEdit.primaryContact?.name || '');
      setJobTitle(clientToEdit.primaryContact?.position || '');
      setEmail(clientToEdit.primaryContact?.email || '');
      setPhone(clientToEdit.primaryContact?.phone || '');
      setWhatsappNumber(clientToEdit.primaryContact?.whatsapp || '');

      setRelationshipStatus(clientToEdit.relationshipStatus || 'LEAD');
      setClientType(clientToEdit.clientType || 'Corporate');
      setPriority(clientToEdit.priority || 'MEDIUM');
      setLeadSource(clientToEdit.leadSource || '');
      setAssignedUserId(clientToEdit.assignedUserId || '');
      setNotes(clientToEdit.notes || '');
    } else {
      setCompanyName('');
      setIndustry('');
      setWebsite('');
      setAddress('');
      setCity('');
      setCountry('');
      setCompanyPhone('');
      setContactPerson('');
      setJobTitle('');
      setEmail('');
      setPhone('');
      setWhatsappNumber('');
      setRelationshipStatus('LEAD');
      setClientType('Corporate');
      setPriority('MEDIUM');
      setLeadSource('');
      setAssignedUserId(usersList[0]?.id || '');
      setNotes('');
    }
    setError('');
  }, [clientToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        companyName: companyName.trim(),
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
        relationshipStatus,
        clientType,
        priority,
        leadSource: leadSource.trim() || undefined,
        assignedUserId: assignedUserId || undefined,
        notes: notes.trim() || undefined
      };

      if (clientToEdit) {
        await api.updateClient(clientToEdit.id, payload);
      } else {
        await api.createClient(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clientToEdit ? 'Edit Client Account' : 'Add New Client'}
      subtitle={clientToEdit ? `Update records for ${clientToEdit.company?.name}` : 'Register a new enterprise client and primary stakeholder contact'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Section 1: Company Information */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            1. Company Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ABC Investments"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Industry
              </label>
              <input
                type="text"
                placeholder="e.g. Investment Banking / Asset Management"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Website (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Address / Office Location
              </label>
              <input
                type="text"
                placeholder="e.g. Blue Area, Islamabad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">City</label>
              <input
                type="text"
                placeholder="Islamabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Country</label>
              <input
                type="text"
                placeholder="Pakistan"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Primary Contact Person */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            2. Primary Contact Person
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Muhammad Ali"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Job Title / Position
              </label>
              <input
                type="text"
                placeholder="e.g. CEO / Managing Partner"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
              <input
                type="email"
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                WhatsApp Number (for direct click-to-chat reminders)
              </label>
              <input
                type="tel"
                placeholder="+923001234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: CRM Assignment & Status */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            3. CRM Assignment & Strategy
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Relationship Status
              </label>
              <select
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="LEAD">Lead</option>
                <option value="CONTACTED">Contacted</option>
                <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
                <option value="MEETING_COMPLETED">Meeting Completed</option>
                <option value="FOLLOWUP_REQUIRED">Follow-up Required</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="ACTIVE_CLIENT">Active Client</option>
                <option value="DORMANT">Dormant</option>
                <option value="LOST">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Client Type</label>
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="Corporate">Corporate</option>
                <option value="Strategic Partner">Strategic Partner</option>
                <option value="Key Account">Key Account</option>
                <option value="Enterprise Deal">Enterprise Deal</option>
                <option value="Investor">Investor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Assigned BD Manager/Executive
              </label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              >
                <option value="">-- Select Team Member --</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Initial Notes & Background Context
              </label>
              <textarea
                rows={3}
                placeholder="Background notes, relationship history, strategic goals..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save Client
          </Button>
        </div>
      </form>
    </Modal>
  );
};
