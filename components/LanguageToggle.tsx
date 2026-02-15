import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all flex items-center gap-2 text-sm font-medium"
        >
            {language === 'es' ? (
                <>
                    <span className="text-lg">🇪🇸</span>
                    <span>ES</span>
                </>
            ) : (
                <>
                    <span className="text-lg">🇬🇧</span>
                    <span>EN</span>
                </>
            )}
        </button>
    );
}
