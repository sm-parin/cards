'use client';
import { useState } from 'react';
import { Button } from '@cards/ui';

const RULE_SLIDES = [
  {
    title: 'How to Play',
    content: 'Players take turns playing cards. The goal is to win tricks and score points. Follow the suit if you can, otherwise play any card.',
  },
  {
    title: 'Scoring',
    content: 'Points are awarded based on the cards you win. Face cards and special cards are worth more. Accumulate the highest score to win.',
  },
  {
    title: 'Winning',
    content: 'The player or team with the most points at the end wins. Complete all rounds to determine the final winner.',
  },
];

interface RulesModalProps {
  gameName: string;
  onClose: () => void;
}

export default function RulesModal({ gameName, onClose }: RulesModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = RULE_SLIDES[currentSlide];

  const handlePrev = () => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : RULE_SLIDES.length - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev < RULE_SLIDES.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-2xl w-full p-8 border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{gameName} Rules</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Slide content */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">{slide.title}</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{slide.content}</p>
        </div>

        {/* Slide indicator */}
        <div className="flex gap-2 mb-8 justify-center">
          {RULE_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentSlide ? 'bg-white' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={handlePrev}
            className="flex-1"
          >
            ← Previous
          </Button>
          <Button
            variant="secondary"
            onClick={handleNext}
            className="flex-1"
          >
            Next →
          </Button>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full mt-4"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
