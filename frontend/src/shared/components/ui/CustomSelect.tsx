import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: number | string;
    label: string;
}

interface CustomSelectProps {
    value?: number | string;
    onChange: (value: number | string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
}

export function CustomSelect({
    value = 0,
    onChange,
    options,
    placeholder = 'Selecione...',
    disabled = false,
    error,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                className={`w-full flex items-center justify-between bg-white/5 border rounded-xl px-3 py-2.5 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed border-white/10' : 'cursor-pointer focus:ring-1 focus:ring-purple-500 hover:bg-white/10'
                    } ${error ? 'border-red-500' : 'border-white/10'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span className={`block truncate ${!selectedOption && value === 0 ? 'text-slate-400' : 'text-white'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1a0b2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-[slideUp_0.1s_ease-out]">
                    <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-purple-500/20 hover:text-white transition-colors flex items-center gap-2"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhuma opção disponível</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
