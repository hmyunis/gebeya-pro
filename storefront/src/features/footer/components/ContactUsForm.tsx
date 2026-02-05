import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import { api } from '@/lib/api';

const HTTP_URL_PATTERN = /https?:\/\//i;

function isEmailOrPhone(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.includes('@')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    }
    return /^\+?[0-9 ()-]{7,25}$/.test(trimmed);
}

export function ContactUsForm() {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<{
        kind: 'success' | 'error' | 'warning';
        text: string;
    } | null>(null);
    const [isTouched, setIsTouched] = useState(false);

    const remaining = 100 - message.length;

    const errors = useMemo(() => {
        if (!isTouched) {
            return {
                name: '',
                contact: '',
                message: '',
                canSubmit: false,
                messageHasUrl: false,
            };
        }
        const nameOk = name.trim().length > 0;
        const contactOk = isEmailOrPhone(contact);
        const messageOk = message.trim().length > 0 && message.length <= 100;
        const messageHasUrl = HTTP_URL_PATTERN.test(message);
        const nameHasUrl = HTTP_URL_PATTERN.test(name);
        const contactHasUrl = HTTP_URL_PATTERN.test(contact);
        return {
            name: nameHasUrl ? 'Links are not allowed.' : nameOk ? '' : 'Name is required.',
            contact: contactHasUrl
                ? 'Links are not allowed.'
                : contactOk
                  ? ''
                  : 'Enter a valid email or phone number.',
            message: messageHasUrl
                ? 'Links are not allowed.'
                : messageOk
                  ? ''
                  : 'Message is required (max 100 chars).',
            canSubmit:
                nameOk && contactOk && messageOk && !nameHasUrl && !contactHasUrl && !messageHasUrl,
            messageHasUrl,
        };
    }, [contact, message, name, isTouched]);

    const handleSafeChange = (value: string, setter: (value: string) => void) => {
        setStatus(null);
        if (!isTouched) setIsTouched(true);
        if (HTTP_URL_PATTERN.test(value)) {
            setStatus({
                kind: 'warning',
                text: 'Links starting with http are not allowed.',
            });
            return;
        }
        setter(value);
    };

    const contactMutation = useMutation({
        mutationFn: async (payload: { name: string; contact: string; message: string }) => {
            await api.post('/contact', payload);
        },
    });

    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsTouched(true);
        if (!errors.canSubmit) {
            setStatus({ kind: 'warning', text: 'Please fix the highlighted fields.' });
            return;
        }

        setStatus(null);
        try {
            await contactMutation.mutateAsync({
                name: name.trim(),
                contact: contact.trim(),
                message: message.trim(),
            });
            setStatus({ kind: 'success', text: 'Message sent. Thanks!' });
            setName('');
            setContact('');
            setMessage('');
            setIsTouched(false);
        } catch (error: any) {
            console.error(error);
            setStatus({
                kind: 'error',
                text: error?.response?.data?.message || 'Failed to send. Try again later.',
            });
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Name</label>
                    <input
                        value={name}
                        onChange={(e) => handleSafeChange(e.target.value, setName)}
                        required
                        maxLength={120}
                        autoComplete="name"
                        className={[
                            'w-full rounded-xl border bg-black/20 px-3 py-2 text-sm text-white outline-none',
                            'placeholder:text-slate-500',
                            errors.name ? 'border-rose-400/60' : 'border-white/10',
                            'focus:border-blue-400/80 focus:ring-2 focus:ring-blue-400/15',
                        ].join(' ')}
                        placeholder="Your name"
                    />
                    {errors.name ? (
                        <p className="text-[11px] text-rose-300">{errors.name}</p>
                    ) : null}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Email or phone</label>
                    <input
                        value={contact}
                        onChange={(e) => handleSafeChange(e.target.value, setContact)}
                        required
                        maxLength={160}
                        autoComplete="email"
                        className={[
                            'w-full rounded-xl border bg-black/20 px-3 py-2 text-sm text-white outline-none',
                            'placeholder:text-slate-500',
                            errors.contact ? 'border-rose-400/60' : 'border-white/10',
                            'focus:border-blue-400/80 focus:ring-2 focus:ring-blue-400/15',
                        ].join(' ')}
                        placeholder="name@example.com or +251..."
                    />
                    {errors.contact ? (
                        <p className="text-[11px] text-rose-300">{errors.contact}</p>
                    ) : null}
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Message</label>
                    <span className="text-[10px] text-slate-500">
                        {Math.max(0, remaining)} left
                    </span>
                </div>
                <textarea
                    value={message}
                    onChange={(e) => handleSafeChange(e.target.value, setMessage)}
                    required
                    maxLength={100}
                    rows={5}
                    className={[
                        'w-full resize-none rounded-xl border bg-black/20 px-3 py-2 text-sm text-white outline-none',
                        'placeholder:text-slate-500',
                        errors.message ? 'border-rose-400/60' : 'border-white/10',
                        'focus:border-blue-400/80 focus:ring-2 focus:ring-blue-400/15',
                    ].join(' ')}
                    placeholder="Write a short message…"
                />
                {errors.message ? (
                    <p className="text-[11px] text-rose-300">{errors.message}</p>
                ) : (
                    <p className="text-[11px] text-slate-500">
                    </p>
                )}
            </div>

            {status ? (
                <p
                    className={[
                        'text-xs',
                        status.kind === 'success'
                            ? 'text-emerald-300'
                            : status.kind === 'warning'
                              ? 'text-amber-300'
                              : 'text-rose-300',
                    ].join(' ')}
                >
                    {status.text}
                </p>
            ) : null}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!errors.canSubmit || contactMutation.isPending}
                    className={[
                        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold',
                        'bg-white text-[#12141a] transition-opacity',
                        !errors.canSubmit || contactMutation.isPending
                            ? 'opacity-60'
                            : 'hover:opacity-95',
                    ].join(' ')}
                >
                    {contactMutation.isPending ? 'Sending…' : 'Send message'}
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </form>
    );
}
