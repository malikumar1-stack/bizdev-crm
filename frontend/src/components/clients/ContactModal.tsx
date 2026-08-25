import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { IContact } from '../../types';
import { api } from '../../services/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  contactToEdit?: IContact | null;
  onSaved: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  clientId,
  contactToEdit,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [preferredMethod, setPreferredMethod] = useState('EMAIL');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contactToEdit) {
      setName(contactToEdit.name || '');
      setPosition(contactToEdit.position || '');
      setEmail(contactToEdit.email || '');
      setPhone(contactToEdit.phone || '');
      setWhatsapp(contactToEdit.whatsapp || '');
      setPreferredMethod(contactToEdit.preferredMethod || 'EMAIL');
      setNotes(contactToEdit.notes || '');
      setIsPrimary(contactToEdit.isPrimary || false);
    } else {
      setName('');
      setPosition('');
      setEmail('');
      setPhone('');
      setWhatsapp('');
      setPreferredMethod('EMAIL');
      setNotes('');
      setIsPrimary(false);
    }
    setError('');
  }, [contactToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact Name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        position: position.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        preferredMethod,
        notes: notes.trim() || undefined,
        isPrimary
      };

      if (contactToEdit) {
        await api.updateContact(contactToEdit.id, payload);
      } else {
        await api.addContact(clientId, payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contactToEdit ? 'Edit Contact Person' : 'Add Contact Person'}
      subtitle="Manage key executive stakeholders and communication preferences"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Sara Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Position / Job Title</label>
            <input
              type="text"
              placeholder="e.g. Investment Manager"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email</label>
            <input
              type="email"
              placeholder="sara@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone</label>
            <input
              type="tel"
              placeholder="+92 300 0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">WhatsApp</label>
            <input
              type="tel"
              placeholder="+923000000000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="primaryContactCheck"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="primaryContactCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Set as Primary Contact for this Client
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Contact</Button>
        </div>
      </form>
    </Modal>
  );
};
