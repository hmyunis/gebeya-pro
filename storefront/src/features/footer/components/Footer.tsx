import { ContactUsForm } from './ContactUsForm';
import {
    PUBLIC_CONTACT_EMAIL,
    PUBLIC_SOCIAL_GITHUB_URL,
    PUBLIC_SOCIAL_TELEGRAM_URL,
    PUBLIC_SOCIAL_TIKTOK_URL,
} from '@/config/env';
import { GitHubIcon, TelegramIcon, TikTokIcon } from './SocialIcons';
import QueryProvider from "@/app/QueryProvider";

function Logo() {
    return (
        <div className="flex items-center gap-3">
            {/* Icon: White/Glass effect to pop against dark bg */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
                <span className="font-display text-lg text-white">G</span>
            </div>
            <div className="flex flex-col leading-none">
                <span className="text-lg font-semibold tracking-tight text-white">Gebeya Pro</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    Marketplace
                </span>
            </div>
        </div>
    );
}

function SocialLink({
    href,
    label,
    children,
}: {
    href: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <a
            href={href}
            aria-label={label}
            target="_blank"
            rel="noreferrer"
            // Glassmorphism style for dark theme
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all hover:scale-105 hover:bg-white/20 hover:text-white"
        >
            {children}
        </a>
    );
}

export default function Footer() {
    return (
        <QueryProvider>
            <FooterContent />
        </QueryProvider>
    );
}

function FooterContent() {
    const year = new Date().getFullYear();

    return (
        <footer className="mt-16 bg-linear-to-br from-blue-900 via-indigo-900 to-slate-900 text-slate-300">
            <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
                <div className="grid gap-8 md:grid-cols-2 md:gap-12 lg:gap-20">
                    {/* Left Column: Brand & Info */}
                    <div className="flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                            <Logo />
                            <p className="max-w-md text-sm leading-relaxed text-slate-400">
                                Gebeya Pro is a modern, lightweight marketplace experience designed
                                for fast browsing, clear product details, and a frictionless
                                checkout. We keep the interface minimal and responsive so you can
                                find what you need quickly, review your order confidently, and
                                complete payment with straightforward bank instructions.
                                <br />
                                <br />
                                Have feedback, a question about an order, or a suggestion to improve
                                the store? Send a short note using the form — we read every message.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Contact
                                </p>
                                <a
                                    href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                                    className="text-sm font-medium text-white hover:text-blue-300 hover:underline"
                                >
                                    {PUBLIC_CONTACT_EMAIL}
                                </a>
                            </div>

                            <div className="flex items-center gap-2">
                                <SocialLink href={PUBLIC_SOCIAL_TELEGRAM_URL} label="Telegram">
                                    <TelegramIcon className="h-4 w-4" />
                                </SocialLink>
                                <SocialLink href={PUBLIC_SOCIAL_GITHUB_URL} label="GitHub">
                                    <GitHubIcon className="h-4 w-4" />
                                </SocialLink>
                                <SocialLink href={PUBLIC_SOCIAL_TIKTOK_URL} label="TikTok">
                                    <TikTokIcon className="h-4 w-4" />
                                </SocialLink>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Compact Form */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Quick Message</h3>
                            <span className="text-[10px] text-slate-500">Max 100 chars</span>
                        </div>
                        <ContactUsForm />
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
                    <p>© {year} Gebeya Pro. All rights reserved.</p>
                    <span>
                        <span className="">Developed by</span>{' '}
                        <a
                            href="https://github.com/hmyunis"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-slate-400 transition-colors hover:text-white"
                        >
                            <span className="underline underline-offset-4 hover:text-white transition-colors">
                                @hmyunis
                            </span>
                        </a>
                    </span>
                </div>
            </div>
        </footer>
    );
}
