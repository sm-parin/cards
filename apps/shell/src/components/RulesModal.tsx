'use client';
import { useState } from 'react';
import { Button } from '@cards/ui';

interface RuleSlide {
  title: string;
  content: string;
}

interface RulesModalProps {
  gameName: string;
  rules: RuleSlide[];
  onClose: () => void;
}

export default function RulesModal({ gameName, rules, onClose }: RulesModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  if (!rules.length) return null;
  const slide = rules[currentSlide];

  const handlePrev = () => setCurrentSlide(prev => (prev > 0 ? prev - 1 : rules.length - 1));
  const handleNext = () => setCurrentSlide(prev => (prev < rules.length - 1 ? prev + 1 : 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl max-w-lg w-full p-8 border border-gray-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{gameName} — Rules</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Progress pills */}
        <div className="flex gap-1.5 mb-6">
          {rules.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? 'bg-white w-8' : 'bg-gray-600 w-2'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="mb-8 min-h-[100px]">
          <h3 className="text-base font-semibold text-white mb-3">{slide.title}</h3>
          <p className="text-gray-300 leading-relaxed text-sm">{slide.content}</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handlePrev} className="flex-1">← Prev</Button>
          {currentSlide < rules.length - 1
            ? <Button variant="primary" onClick={handleNext} className="flex-1">Next →</Button>
            : <Button variant="primary" onClick={onClose} className="flex-1">Got it!</Button>
          }
        </div>
      </div>
    </div>
  );
}
