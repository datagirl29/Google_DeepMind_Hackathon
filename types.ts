import React from 'react';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
  snippet?: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface NewsBreakdown {
  what: string[];
  who: string[];
  why: string;
  past_references: string[];
  present_consequences: string[];
  future_impact: string[];
  audience: string; 
  wait_or_prepare: {
    advice: string;
    reasoning: string;
  };
  geolocation?: {
    lat: number;
    lng: number;
    label: string;
  };
  bias_analysis: {
    detected_bias: string;
    missing_perspectives: string[];
    is_controversial: boolean;
    label?: string; // New field for translated status (e.g. "Controversial" vs "Polemic")
  };
  emotional_load: {
    score: number; // 0-100
    warning?: string;
  };
}

export interface Category {
  id: string;
  label: string;
  rssUrl: string;
  icon?: React.ReactNode;
}

export enum AccessibilityMode {
  DEFAULT = 'DEFAULT',
  DYSLEXIA = 'DYSLEXIA',
  LARGE_TEXT = 'LARGE_TEXT',
}

export interface UserPersona {
  role: string;
  location: string;
}