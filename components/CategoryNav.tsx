import React from 'react';
import { CATEGORIES } from '../services/newsService';

interface CategoryNavProps {
  activeCategory: string;
  onSelect: (id: string) => void;
  language: string;
}

const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  'WORLD': { 'Spanish': 'Mundo', 'French': 'Monde', 'German': 'Welt', 'Hindi': 'दुनिया', 'Chinese': '世界', 'Arabic': 'العالم', 'Japanese': '世界', 'Italian': 'Mondo' },
  'NATION': { 'Spanish': 'Política', 'French': 'Politique', 'German': 'Politik', 'Hindi': 'राजनीति', 'Chinese': '政治', 'Arabic': 'سياسة', 'Japanese': '政治', 'Italian': 'Politica' },
  'BUSINESS': { 'Spanish': 'Economía', 'French': 'Économie', 'German': 'Wirtschaft', 'Hindi': 'व्यापार', 'Chinese': '商业', 'Arabic': 'اقتصاد', 'Japanese': 'ビジネス', 'Italian': 'Economia' },
  'TECHNOLOGY': { 'Spanish': 'Tecnología', 'French': 'Technologie', 'German': 'Technologie', 'Hindi': 'प्रौद्योगिकी', 'Chinese': '科技', 'Arabic': 'تكنولوجيا', 'Japanese': '技術', 'Italian': 'Tecnologia' },
  'EDUCATION': { 'Spanish': 'Educación', 'French': 'Éducation', 'German': 'Bildung', 'Hindi': 'शिक्षा', 'Chinese': '教育', 'Arabic': 'تعليم', 'Japanese': '教育', 'Italian': 'Istruzione' },
  'HEALTH': { 'Spanish': 'Salud', 'French': 'Santé', 'German': 'Gesundheit', 'Hindi': 'स्वास्थ्य', 'Chinese': '健康', 'Arabic': 'صحة', 'Japanese': '健康', 'Italian': 'Salute' },
  'SCIENCE': { 'Spanish': 'Ciencia', 'French': 'Science', 'German': 'Wissenschaft', 'Hindi': 'विज्ञान', 'Chinese': '科学', 'Arabic': 'علوم', 'Japanese': '科学', 'Italian': 'Scienza' },
  'ENTERTAINMENT': { 'Spanish': 'Cultura', 'French': 'Culture', 'German': 'Kultur', 'Hindi': 'मनोरंजन', 'Chinese': '娱乐', 'Arabic': 'ترفيه', 'Japanese': 'エンタメ', 'Italian': 'Cultura' },
  'SPORTS': { 'Spanish': 'Deportes', 'French': 'Sports', 'German': 'Sport', 'Hindi': 'खेल', 'Chinese': '体育', 'Arabic': 'رياضة', 'Japanese': 'スポーツ', 'Italian': 'Sport' }
};

export const CategoryNav: React.FC<CategoryNavProps> = ({ activeCategory, onSelect, language }) => {
  return (
    <div className="w-full overflow-x-auto pb-2 mb-6 border-b-2 border-ink/10 sticky top-0 z-10 bg-paper/95 backdrop-blur-sm pt-2">
      <div className="flex space-x-2 px-4 md:px-8 min-w-max">
        {CATEGORIES.map((cat) => {
           // Get translation or fallback to English label
           const label = CATEGORY_TRANSLATIONS[cat.id]?.[language] || cat.label;
           return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-200
                  ${activeCategory === cat.id 
                    ? 'bg-ink text-paper shadow-md transform scale-105' 
                    : 'bg-paper-dark text-ink hover:bg-accent hover:text-white'}
                `}
              >
                {label}
              </button>
           );
        })}
      </div>
    </div>
  );
};