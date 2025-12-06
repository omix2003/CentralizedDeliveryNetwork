'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/Button';

export const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'Track Order', href: '/track' },
        { name: 'Partners', href: '/partner' },
        { name: 'Agents', href: '/agent' },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-slate-900 backdrop-blur-lg border-b border-white/10 transition-all duration-300 shadow-lg" style={{ backgroundColor: '#0f172a', position: 'fixed', top: 0, left: 0, right: 0, width: '100%' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                                D
                            </div>
                            <span className="font-heading font-bold text-xl tracking-tight text-white !text-white">
                                Delivery<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Hub</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive(link.href)
                                        ? '!text-white bg-white/10 shadow-sm'
                                        : '!text-slate-300 hover:!text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="!text-white hover:!text-white hover:bg-white/10">Log In</Button>
                        </Link>
                        <Link href="/register">
                            <Button variant="premium" size="sm">Get Started</Button>
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
                        >
                            <span className="sr-only">Open main menu</span>
                            {!isMobileMenuOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-white/10 animate-slide-up">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive(link.href)
                                    ? 'text-white bg-white/10'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-3">
                            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-center text-white hover:text-white hover:bg-white/10">Log In</Button>
                            </Link>
                            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                <Button variant="premium" className="w-full justify-center">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};
